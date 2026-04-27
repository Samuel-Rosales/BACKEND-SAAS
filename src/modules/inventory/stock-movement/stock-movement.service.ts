import { prisma } from '@/configs';
import { CreateStockMovementInterface, FindMovementsQuery, StockOutputResult, UpdateStockMovementInterface } from './interfaces';
import { BusinessError } from '@/utils/catch-errors.util';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

export class StockMovementService {

    // 1. CREAR
    async create(businessId: number, membershipId: number, data: CreateStockMovementInterface) {
        try {
            // 1. Validaciones Paralelas (Sin cambios aquí, esto está perfecto)
            const [product, depot, member, targetDepot] = await Promise.all([
                prisma.product.findFirst({ where: { id: data.productId, businessId } }),

                prisma.depot.findFirst({ where: { id: data.depotId, businessId, isActive: true } }),
                
                prisma.businessMember.findFirst({ where: { id: membershipId, businessId, isActive: true } }),

                (data.type === 'TRANSFER' && data.targetDepotId)
                    ? prisma.depot.findFirst({ where: { id: data.targetDepotId, businessId, isActive: true } })
                    : Promise.resolve(null)
            ]);

            // Guard Clauses
            if (!product) throw new BusinessError('Producto no encontrado o ajeno al negocio', 404);
            if (!depot) throw new BusinessError('Depósito de origen no encontrado', 404);
            if (!member) throw new BusinessError('Usuario no autorizado', 403);
            if (data.type === 'TRANSFER' && !targetDepot) throw new BusinessError('Depósito destino inválido', 400);

            // 2. Transacción
            const result = await prisma.$transaction(async (tx) => {
                
                // --- CONVERSIÓN A DECIMAL SEGURA ---
                // Convertimos el input (que puede venir como string o number) a Decimal puro
                const qtyInput = new Decimal(data.quantity);
                const qtyAbs = qtyInput.abs(); // Usamos .abs() de Decimal, NO Math.abs()

                // =========================================================
                // CASO A: ENTRADAS (IN, RETURN)
                // =========================================================
                if (data.type === 'ADJUSTMENT' && qtyInput.isPositive()) {

                    const expirationDate = product.isPerishable
                        ? data.expirationDate
                        : new Date('2099-12-31');
                    
                    return await this.addStockLog(tx, businessId, {
                        ...data,
                        expirationDate,
                        quantity: qtyAbs // Pasamos el Decimal positivo
                    }, membershipId, product.isPerishable);

                }
                // =========================================================
                // CASO B: TRANSFERENCIAS
                // =========================================================
                else if (data.type === 'TRANSFER') {
                    // 1. SACAR (Origen) -> Enviamos negativo
                    const { movement: outMove, sourceMetadata } = await this.deductStockStrategy(tx, businessId, {
                        ...data,
                        quantity: qtyAbs.negated() // .negated() es la forma correcta de hacer negativo un Decimal
                    }, membershipId);

                    // Recuperar metadata de forma segura
                    const finalExpiration = sourceMetadata?.expirationDate || new Date('2099-12-31');
                    
                    // Aseguramos que el costo sea Decimal (puede venir null o number)
                    const finalCost = sourceMetadata?.cost 
                        ? new Decimal(sourceMetadata.cost) 
                        : new Decimal(0);

                    // 2. ENTRAR (Destino) -> Enviamos positivo
                    const inMove = await this.addStockLog(tx, businessId, {
                        ...data,
                        depotId: targetDepot!.id,
                        quantity: qtyAbs, // Positivo
                        expirationDate: finalExpiration, 
                        unitCost: finalCost,
                        reason: `Transferencia desde ${depot.name}`
                    }, membershipId, product.isPerishable);

                    return inMove; 
                }

                // =========================================================
                // CASO C: SALIDAS (OUT, ADJUSTMENT NEGATIVO)
                // =========================================================
                else {
                    return await this.deductStockStrategy(tx, businessId, {
                        ...data,
                        quantity: qtyAbs.negated() // Negativo
                    }, membershipId);
                }
            });

            return { status: 201, message: 'Procesado correctamente', data: result };

        } catch (error) {
            console.error('StockService.create Error:', error);
            if (error instanceof BusinessError) return { status: error.status, message: error.message, data: null };
            return { status: 500, message: 'Error interno de inventario', data: null };
        }
    }

    // ------------------------------------------------------------------
    // ESTRATEGIA DE SALIDA (Actualizada con tipo de retorno)
    // ------------------------------------------------------------------
    private async deductStockStrategy(
        tx: Prisma.TransactionClient,
        businessId: number,
        data: CreateStockMovementInterface,
        memberId: number
    ): Promise<StockOutputResult> { // <--- Tipado explícito
        if (data.lotId) {
            return await this.consumeSpecificLot(tx, businessId, data, memberId);
        } else {
            return await this.consumeStockFEFO(tx, businessId, data, memberId);
        }
    }

    // ------------------------------------------------------------------
    // MÉTODO 1: CONSUMO ESPECÍFICO
    // ------------------------------------------------------------------
    private async consumeSpecificLot(
        tx: Prisma.TransactionClient,
        businessId: number,
        data: CreateStockMovementInterface,
        memberId: number
    ): Promise<StockOutputResult> {
        // 1. OBTENER VALOR ABSOLUTO PARA CÁLCULOS
        // data.quantity viene como -50. Necesitamos 50 para comparar y restar.
        const qtyToDeduct = new Decimal(data.quantity).abs(); 

        const lot = await tx.stockLot.findFirst({
            where: { id: data.lotId, depotId: data.depotId }
        });

        if (!lot) throw new BusinessError(`El lote #${data.lotId} no existe`, 404);

        // 2. VALIDAR STOCK (Usando el positivo)
        if (new Decimal(lot.quantity).lt(qtyToDeduct)) {
            throw new BusinessError(`Stock insuficiente en Lote #${data.lotId}`, 409);
        }

        // 3. ACTUALIZAR LOTE (Usando el positivo)
        // decrement: 50 -> Resta 50. (Antes tenías decrement: -50 -> Sumaba 50)
        await tx.stockLot.update({
            where: { id: lot.id },
            data: { quantity: { decrement: qtyToDeduct } } 
        });

        // 4. CREAR MOVIMIENTO (Usando el original negativo)
        // Aquí sí queremos guardar -50 en el historial
        const movement = await tx.stockMovement.create({
            data: {
                businessId, productId: data.productId, depotId: data.depotId, memberId,
                type: data.type, 
                quantity: data.quantity, // -50
                reason: data.reason,
                date: data.date || new Date(),
                stockLotId: lot.id
            }
        });

        return {
            movement,
            sourceMetadata: {
                expirationDate: lot.expirationDate,
                cost: new Decimal(lot.lotCost)
            }
        };
    }

    // ------------------------------------------------------------------
    // MÉTODO 2: CONSUMO FEFO
    // ------------------------------------------------------------------
    private async consumeStockFEFO(
        tx: Prisma.TransactionClient,
        businessId: number,
        data: CreateStockMovementInterface,
        memberId: number
    ): Promise<StockOutputResult> {
        // 1. Convertir input a Decimal y asegurar positivo
        let remaining = new Decimal(data.quantity).abs();
        
        // 2. Buscar lotes (Sin filtrar por businessId en stockLot, según acordamos)
        const lots = await tx.stockLot.findMany({
            where: { 
                productId: data.productId, 
                depotId: data.depotId, 
                quantity: { gt: 0 } 
            },
            orderBy: { expirationDate: 'asc' }
        });

        // 3. Calcular Total Disponible (Suma segura con Decimal)
        const totalAvailable = lots.reduce(
            (acc, lot) => acc.plus(lot.quantity), 
            new Decimal(0)
        );

        // 4. Validación de Stock
        if (totalAvailable.lessThan(remaining)) {
            throw new BusinessError(`Stock insuficiente. Disp: ${totalAvailable.toFixed(2)}`, 409);
        }

        // 5. Preparar Metadata (Tomamos la del primer lote a vencer como referencia)
        const primaryLotMetadata = lots.length > 0 ? {
            expirationDate: lots[0].expirationDate,
            cost: lots[0].lotCost // Ya es Decimal desde Prisma, no convertir
        } : null;

        // 6. Bucle de Consumo FEFO
        for (const lot of lots) {
            // Condición de parada: Si ya no falta nada (0 o negativo por seguridad)
            if (remaining.isZero() || remaining.isNegative()) break;

            const available = lot.quantity; // Es Decimal
            
            // Lógica de reemplazo para Math.min(available, remaining)
            let toDeduct: Decimal;
            if (available.lessThan(remaining)) {
                toDeduct = available; // Tomamos todo el lote
            } else {
                toDeduct = remaining; // Tomamos solo lo que falta
            }

            // Actualizar DB
            await tx.stockLot.update({
                where: { id: lot.id },
                data: { quantity: { decrement: toDeduct } }
            });

            // Restar a lo pendiente
            remaining = remaining.minus(toDeduct);
        }

        // 7. Crear Movimiento (Historial)
        const movement = await tx.stockMovement.create({
            data: {
                businessId, 
                productId: data.productId, 
                depotId: data.depotId, 
                memberId,
                type: data.type, 
                // data.quantity puede venir number, aseguramos guardarlo tal cual o como Decimal
                quantity: new Decimal(data.quantity), 
                reason: `${data.reason || ''} Descuento Automático`,
                date: data.date || new Date(),
                stockLotId: null // En FEFO masivo no vinculamos un lote único (por ahora)
            }
        });

        return {
            movement,
            sourceMetadata: primaryLotMetadata
        };
    }

    // ------------------------------------------------------------------
    // MÉTODO 3: AGREGAR STOCK (Nuevo Lote)
    // ------------------------------------------------------------------
    private async addStockLog(
        tx: Prisma.TransactionClient,
        businessId: number,
        data: CreateStockMovementInterface,
        memberId: number,
        requiresExpirationDate: boolean
    ) {
        // Validar datos obligatorios para lote
        if (!data.unitCost && data.type !== 'TRANSFER') throw new BusinessError("El costo unitario es obligatorio para entradas", 400);

        const expirationDate = data.expirationDate || new Date('2099-12-31');

        if (requiresExpirationDate && !data.expirationDate) {
            throw new BusinessError("La fecha de vencimiento es obligatoria para productos perecederos", 400);
        }

        // Crear Lote
        const newLot = await tx.stockLot.create({
            data: {
                productId: data.productId,
                depotId: data.depotId,
                quantity: data.quantity,
                expirationDate,
                lotCost: data.unitCost || 0
            }
        });

        // Crear Movimiento
        return await tx.stockMovement.create({
            data: {
                businessId, 
                productId: data.productId, 
                depotId: data.depotId, 
                memberId,
                type: data.type, 
                quantity: data.quantity, 
                reason: data.reason,
                date: data.date || new Date(),
                stockLotId: newLot.id
            }
        });
    }

    // 2. LISTAR TODOS (de un negocio)
    async findAll(businessId: number, query: FindMovementsQuery) {
        try {
            const { 
                page = 1, 
                limit = 10, 
                search, 
                type, 
                depotId, 
                productId,
                startDate,
                endDate
            } = query;

            const skip = (Number(page) - 1) * Number(limit);

            // A. Construcción Dinámica del WHERE
            // -------------------------------------------------------
            const whereClause: Prisma.StockMovementWhereInput = {
                businessId, // Siempre filtrar por el negocio del usuario
                
                // Filtros Opcionales
                ...(type && { type: type as any }),
                ...(depotId && { depotId: Number(depotId) }),
                ...(productId && { productId: Number(productId) }),
                
                // Filtro de Fechas
                ...((startDate || endDate) && {
                    date: {
                        ...(startDate && { gte: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    }
                }),

                // Búsqueda Inteligente (Search Universal)
                ...(search && {
                    OR: [
                        { product: { name: { contains: search, mode: 'insensitive' } } },
                        { product: { sku: { contains: search, mode: 'insensitive' } } },
                        { reason: { contains: search, mode: 'insensitive' } },
                        // Buscamos también por número de lote si existe relación
                        { stockLot: { id: !isNaN(Number(search)) ? Number(search) : undefined } } 
                    ]
                })
            };

            // B. Ejecución Paralela (Datos + Total para paginación)
            // -------------------------------------------------------
            const [movements, total] = await Promise.all([
                prisma.stockMovement.findMany({
                    where: whereClause,
                    skip,
                    take: Number(limit),
                    orderBy: { date: 'desc' },
                    include: {
                        product: {
                            select: { id: true, name: true, sku: true, imageUrl: true }
                        },
                        depot: {
                            select: { id: true, name: true, location: true }
                        },
                        member: {
                            select: {
                                id: true,
                                user: { select: { name: true } }
                            }
                        },
                        // CRUCIAL: Incluimos el lote para ver vencimientos y costos
                        stockLot: {
                            select: {
                                id: true,
                                // number: true, // Descomenta si agregaste columna 'number' a StockLot
                                expirationDate: true,
                                lotCost: true 
                            }
                        }
                    }
                }),
                prisma.stockMovement.count({ where: whereClause })
            ]);

            // C. Mapeo de Datos (Opcional pero recomendado)
            // -------------------------------------------------------
            // A veces queremos aplanar la estructura o calcular totales antes de enviar
            const formattedData = movements.map(m => ({
                ...m,
                // Si el movimiento no tiene costo directo, usamos el del lote
                // O calculamos el totalValue para ayudar al frontend
                unitCost: m.stockLot?.lotCost || 0,
                totalValue: Number(m.quantity) * Number(m.stockLot?.lotCost || 0)
            }));

            // D. Respuesta con Metadatos
            // -------------------------------------------------------
            return {
                status: 200,
                message: 'Listado obtenido correctamente',
                data: formattedData,
                meta: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit))
                }
            };

        } catch (error) {
            console.error('Error en findAll StockMovements:', error);
            return {
                status: 500,
                message: 'Error interno al obtener movimientos',
                data: null
            };
        }
    }

    // 3. BUSCAR UNO
    async findOne(businessId: number, id: number) {
        try {
            const stockMovement = await prisma.stockMovement.findFirst({
                where: { 
                    id,
                    businessId: businessId
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true
                        }
                    },
                    depot: {
                        select: {
                            id: true,
                            name: true,
                            location: true
                        }
                    },
                    member: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            });

            if (!stockMovement) {
                return {
                    message: 'Movimiento de stock no encontrado',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Movimiento de stock obtenido exitosamente',
                status: 200,
                data: stockMovement
            };

         } catch (error) {

            console.error('Error al obtener el movimiento de stock:', error);

            return {
                message: 'Error al obtener el movimiento de stock',
                status: 500,
                data: null
            };
        }
    }

    // 4. LISTAR POR PRODUCTO
    async findByProduct(businessId: number, productId: number) {
        try {
            // Verificar que el producto pertenece al negocio
            const product = await prisma.product.findFirst({
                where: { 
                    id: productId,
                    businessId: businessId
                }
            });

            if (!product) {
                return {
                    message: 'Producto no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            const stockMovements = await prisma.stockMovement.findMany({
                where: {
                    businessId: businessId,
                    productId: productId
                },
                include: {
                    depot: {
                        select: {
                            id: true,
                            name: true,
                            location: true
                        }
                    },
                    member: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    date: 'desc'
                }
            });

            return {
                message: 'Movimientos de stock obtenidos exitosamente',
                status: 200,
                data: stockMovements
            };

         } catch (error) {

            console.error('Error al obtener los movimientos de stock:', error);

            return {
                message: 'Error al obtener los movimientos de stock',
                status: 500,
                data: null
            };
        }
    }

    // 5. LISTAR POR DEPÓSITO
    async findByDepot(businessId: number, depotId: number) {
        try {
            // Verificar que el depósito pertenece al negocio
            const depot = await prisma.depot.findFirst({
                where: { 
                    id: depotId,
                    businessId: businessId,
                    isActive: true
                }
            });

            if (!depot) {
                return {
                    message: 'Depósito no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            const stockMovements = await prisma.stockMovement.findMany({
                where: {
                    businessId: businessId,
                    depotId: depotId
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true
                        }
                    },
                    member: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    date: 'desc'
                }
            });

            return {
                message: 'Movimientos de stock obtenidos exitosamente',
                status: 200,
                data: stockMovements
            };

         } catch (error) {

            console.error('Error al obtener los movimientos de stock:', error);

            return {
                message: 'Error al obtener los movimientos de stock',
                status: 500,
                data: null
            };
        }
    }

    // 6. LISTAR POR TIPO
    async findByType(businessId: number, type: string) {
        try {
            const stockMovements = await prisma.stockMovement.findMany({
                where: {
                    businessId: businessId,
                    type: type as any
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true
                        }
                    },
                    depot: {
                        select: {
                            id: true,
                            name: true,
                            location: true
                        }
                    },
                    member: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    date: 'desc'
                }
            });

            if (stockMovements.length === 0) {
                return {
                    message: 'No hay movimientos de stock de este tipo',
                    status: 404,
                    data: []
                };
            }

            return {
                message: 'Movimientos de stock obtenidos exitosamente',
                status: 200,
                data: stockMovements
            };

         } catch (error) {

            console.error('Error al obtener los movimientos de stock:', error);

            return {
                message: 'Error al obtener los movimientos de stock',
                status: 500,
                data: null
            };
        }
    }

    // 7. ACTUALIZAR
    /*async update(businessId: number, id: number, data: UpdateStockMovementInterface) {

        try {

            // Verificar que el movimiento pertenece al negocio
            const existingMovement = await prisma.stockMovement.findFirst({
                where: { 
                    id,
                    businessId: businessId
                }
            });

            if (!existingMovement) {
                return {
                    message: 'Movimiento de stock no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            // Validar cantidad según el tipo
            if (data.quantity !== undefined) {
                if (existingMovement.type === 'IN' && data.quantity <= 0) {
                    return {
                        message: 'La cantidad debe ser positiva para movimientos de entrada',
                        status: 400,
                        data: null
                    };
                }

                if (existingMovement.type === 'OUT' && data.quantity >= 0) {
                    return {
                        message: 'La cantidad debe ser negativa para movimientos de salida',
                        status: 400,
                        data: null
                    };
                }
            }

            const updatedStockMovement = await prisma.stockMovement.update({
                where: { id },
                data: data,
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true
                        }
                    },
                    depot: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    member: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            });

            if (!updatedStockMovement) {
                return {
                    message: 'No se pudo actualizar el movimiento de stock',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Movimiento de stock actualizado exitosamente',
                status: 200,
                data: updatedStockMovement
            };

        } catch (error) {

            console.error('Error al actualizar el movimiento de stock:', error);
            
            return {
                message: 'Error al actualizar el movimiento de stock',
                status: 500,
                data: null
            };
        }
    }*/

    // 8. ELIMINAR
    async remove(businessId: number, id: number) {
        try {

            const stockMovement = await prisma.stockMovement.findFirst({
                where: { 
                    id,
                    businessId: businessId
                }
            });
            
            if (!stockMovement) {
                return {
                    message: 'Movimiento de stock no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            await prisma.stockMovement.delete({
                where: { id }
            });

            return {
                message: 'Movimiento de stock eliminado exitosamente',
                status: 200,
                data: null
            };

        } catch (error) {

            console.error('Error al eliminar el movimiento de stock:', error);

            return {
                message: 'Error al eliminar el movimiento de stock',
                status: 500,
                data: null
            };
        }
    }
}
