import { prisma } from '@/configs';
import { CreateStockMovementInterface, StockOutputResult, UpdateStockMovementInterface } from './interfaces';
import { BusinessError } from '@/utils/catch-errors.util';
import { Prisma } from '@prisma/client';

export class StockMovementService {

    // 1. CREAR
    async create(businessId: number, membershipId: number, data: CreateStockMovementInterface) {
        try {
            // 1. Validaciones Paralelas (Igual que antes...)
            const [product, depot, member, targetDepot] = await Promise.all([
                prisma.product.findFirst({ where: { id: data.productId, businessId } }),
                prisma.depot.findFirst({ where: { id: data.depotId, businessId, isActive: true } }),
                prisma.businessMember.findFirst({ where: { id: membershipId, businessId, isActive: true } }),
                (data.type === 'TRANSFER' && data.targetDepotId)
                    ? prisma.depot.findFirst({ where: { id: data.targetDepotId, businessId, isActive: true } })
                    : Promise.resolve(null)
            ]);

            // ... (Tus Guard Clauses / Validaciones de Errores aquí) ...
            if (!product || !depot || !member) throw new BusinessError('Datos inválidos', 404);

            // 2. Transacción
            const result = await prisma.$transaction(async (tx) => {
                const qtyAbs = Math.abs(data.quantity);

                // =========================================================
                // CASO A: ENTRADAS (IN, RETURN)
                // =========================================================
                if (data.type === 'IN' || data.type === 'RETURN' || (data.type === 'ADJUSTMENT' && data.quantity > 0)) {
                    
                    // Al entrar stock, SIEMPRE creamos o sumamos a un lote
                    return await this.addStockLog(tx, businessId, {
                        ...data,
                        quantity: qtyAbs // Aseguramos positivo
                    }, membershipId);
                } 

                // =========================================================
                // CASO B: TRANSFERENCIAS
                // =========================================================
                else if (data.type === 'TRANSFER') {
                    if (!targetDepot) throw new BusinessError("Falta depósito destino", 400);

                    // 1. SACAR (Origen)
                    // AHORA recibimos un objeto compuesto { movement, sourceMetadata }
                    const { movement: outMove, sourceMetadata } = await this.deductStockStrategy(tx, businessId, {
                        ...data,
                        quantity: -qtyAbs
                    }, membershipId);

                    // Validación de seguridad por si falla la metadata
                    const finalExpiration = sourceMetadata?.expirationDate || new Date('2099-12-31');
                    const finalCost = sourceMetadata?.cost || 0;

                    // 2. ENTRAR (Destino)
                    const inMove = await this.addStockLog(tx, businessId, {
                        ...data,
                        depotId: targetDepot.id, // Destino
                        quantity: qtyAbs,
                        
                        // AQUI ESTABA EL ERROR: Ahora usamos la metadata extraída correctamente
                        expirationDate: finalExpiration, 
                        unitCost: finalCost,
                        
                        reason: `Transferencia desde ${depot.name}`
                    }, membershipId);

                    return inMove; // O puedes retornar { out: outMove, in: inMove }
                }

                // =========================================================
                // CASO C: SALIDAS (OUT, ADJUSTMENT NEGATIVO)
                // =========================================================
                else {
                    return await this.deductStockStrategy(tx, businessId, {
                        ...data,
                        quantity: -qtyAbs
                    }, membershipId);
                }
            });

            return { status: 201, message: 'Procesado', data: result };

        } catch (error) {
            console.error(error);
            if (error instanceof BusinessError) return { status: error.status, message: error.message, data: null };
            return { status: 500, message: 'Error interno', data: null };
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
        const qtyNeeded = Math.abs(data.quantity);

        const lot = await tx.stockLot.findFirst({
            where: { id: data.lotId, depotId: data.depotId }
        });

        if (!lot) throw new BusinessError(`El lote #${data.lotId} no existe`, 404);
        if (Number(lot.quantity) < qtyNeeded) throw new BusinessError(`Stock insuficiente en Lote #${data.lotId}`, 409);

        // Actualizar Lote
        await tx.stockLot.update({
            where: { id: lot.id },
            data: { quantity: { decrement: qtyNeeded } }
        });

        // Crear Movimiento
        const movement = await tx.stockMovement.create({
            data: {
                businessId, productId: data.productId, depotId: data.depotId, memberId,
                type: data.type, quantity: data.quantity, reason: data.reason,
                date: data.date || new Date()
            }
        });

        // RETORNO COMPUESTO
        return {
            movement,
            sourceMetadata: {
                expirationDate: lot.expirationDate,
                cost: Number(lot.lotCost)
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
        let remaining = Math.abs(data.quantity);
        
        const lots = await tx.stockLot.findMany({
            where: { productId: data.productId, depotId: data.depotId, quantity: { gt: 0 } },
            orderBy: { expirationDate: 'asc' }
        });

        const totalAvailable = lots.reduce((acc, l) => acc + Number(l.quantity), 0);
        if (totalAvailable < remaining) throw new BusinessError(`Stock insuficiente. Disp: ${totalAvailable}`, 409);

        // Guardamos la metadata del PRIMER lote que vamos a tocar (el que vence más pronto).
        // En transferencias múltiples, es la estrategia más segura para el destino (Worst Case Scenario).
        const primaryLotMetadata = lots.length > 0 ? {
            expirationDate: lots[0].expirationDate,
            cost: Number(lots[0].lotCost)
        } : null;

        for (const lot of lots) {
            if (remaining <= 0) break;
            const available = Number(lot.quantity);
            const toDeduct = Math.min(available, remaining);

            await tx.stockLot.update({
                where: { id: lot.id },
                data: { quantity: { decrement: toDeduct } }
            });

            remaining -= toDeduct;
        }

        const movement = await tx.stockMovement.create({
            data: {
                businessId, productId: data.productId, depotId: data.depotId, memberId,
                type: data.type, quantity: data.quantity, 
                reason: `${data.reason || ''} (Auto-FEFO)`,
                date: data.date || new Date()
            }
        });

        // RETORNO COMPUESTO
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
        memberId: number
    ) {
        // Validar datos obligatorios para lote
        if (!data.unitCost && data.type !== 'TRANSFER') throw new BusinessError("El costo unitario es obligatorio para entradas", 400);
        
        // Crear Lote
        await tx.stockLot.create({
            data: {
                productId: data.productId,
                depotId: data.depotId,
                quantity: data.quantity,
                expirationDate: data.expirationDate || new Date('2099-12-31'),
                lotCost: data.unitCost || 0
            }
        });

        // Crear Movimiento
        return await tx.stockMovement.create({
            data: {
                businessId, productId: data.productId, depotId: data.depotId, memberId,
                type: data.type, quantity: data.quantity, reason: data.reason,
                date: data.date || new Date()
            }
        });
    }

    // 2. LISTAR TODOS (de un negocio)
    async findAll(businessId: number) {
        try {

            const stockMovements = await prisma.stockMovement.findMany({
                where: {
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
                },
                orderBy: {
                    date: 'desc'
                }
            });

            if (stockMovements.length === 0) {
                return {
                    message: 'No hay movimientos de stock disponibles',
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
    async update(businessId: number, id: number, data: UpdateStockMovementInterface) {

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
    }

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
