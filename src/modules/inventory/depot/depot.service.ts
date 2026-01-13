import { prisma } from '@/configs';
import { CreateDepotInterface, UpdateDepotInterface } from './interfaces';

export class DepotService {

    // 1. CREAR
    async create(businessId: number, data: CreateDepotInterface) {
        try {
            
            // Verificar que el negocio existe
            const business = await prisma.business.findUnique({
                where: { id: businessId }
            });

            if (!business) {
                return {
                    message: 'Negocio no encontrado',
                    status: 404,
                    data: null
                };
            }

            const depot = await prisma.depot.create({
                data: {
                    businessId: businessId,
                    name: data.name,
                    location: data.location
                },
                include: {
                    business: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                }
            });

            if (!depot) {
                return {
                    message: 'No se pudo crear el depósito',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Depósito creado exitosamente',
                status: 201,
                data: depot
            };

        } catch (error) {

            console.error('Error al crear el depósito:', error);

            return {
                message: 'Error al crear el depósito',
                status: 500,
                data: null
            };

        }
    }

    // 2. LISTAR TODOS (de un negocio)
    async findAll(businessId: number) {
        try {

            const depots = await prisma.depot.findMany({
                where: { businessId, isActive: true },
                orderBy: { id: 'asc' },
                include: {
                    _count: {
                        select: {
                            stockLots: true,
                            stockMovements: true
                        }
                    }
                }
            });

            if (depots.length === 0) {
                return {
                    message: 'No hay depósitos disponibles',
                    status: 404,
                    data: []
                };
            }

            return {
                message: 'Depósitos obtenidos exitosamente',
                status: 200,
                data: depots
            };

        } catch (error) {

            console.error('Error al obtener los depósitos:', error);

            return {
                message: 'Error al obtener los depósitos',
                status: 500,
                data: null
            };
        }
    }

    // 3. BUSCAR UNO
    async findOne(businessId: number, id: number) {
        try {
            const depot = await prisma.depot.findFirst({
                where: { 
                    id,
                    businessId, // Seguridad: solo si pertenece al negocio
                    isActive: true
                },
                include: {
                    business: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    _count: {
                        select: {
                            stockLots: true,
                            stockMovements: true
                        }
                    }
                }
            });

            if (!depot) {
                return {
                    message: 'Depósito no encontrado',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Depósito obtenido exitosamente',
                status: 200,
                data: depot
            };

         } catch (error) {

            console.error('Error al obtener el depósito:', error);

            return {
                message: 'Error al obtener el depósito',
                status: 500,
                data: null
            };
        }
    }

    // 4. ACTUALIZAR
    async update(businessId: number, id: number, data: UpdateDepotInterface) {

        try {

            // Verificar que el depósito pertenece al negocio
            const existingDepot = await prisma.depot.findFirst({
                where: { id, businessId, isActive: true }
            });

            if (!existingDepot) {
                return {
                    message: 'Depósito no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            const updatedDepot = await prisma.depot.update({
                where: { id },
                data: data,
                include: {
                    _count: {
                        select: {
                            stockLots: true,
                            stockMovements: true
                        }
                    }
                }
            });

            if (!updatedDepot) {
                return {
                    message: 'No se pudo actualizar el depósito',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Depósito actualizado exitosamente',
                status: 200,
                data: updatedDepot
            };

        } catch (error) {

            console.error('Error al actualizar el depósito:', error);
            
            return {
                message: 'Error al actualizar el depósito',
                status: 500,
                data: null
            };
        }
    }

    // 5. ELIMINAR (Con protección de integridad)
    async remove(businessId: number, id: number) {
        try {
            // 1. Buscar el depósito, contar historial y VERIFICAR STOCK ACTUAL
            const depot = await prisma.depot.findFirst({
                where: { id, businessId },
                include: {
                    _count: {
                        select: {
                            stockLots: true,      // Lotes totales (históricos)
                            stockMovements: true, // Kardex
                            purchaseItems: true   // Compras recibidas aquí
                        }
                    },
                    // IMPORTANTE: Buscar lotes que tengan cantidad positiva
                    stockLots: {
                        where: { quantity: { gt: 0 } },
                        select: { id: true }
                    }
                }
            });
            
            if (!depot) {
                return {
                    message: 'Almacén no encontrado',
                    status: 404,
                    data: null
                };
            }

            // 2. REGLA CRÍTICA: No tocar si hay mercadería física adentro
            if (depot.stockLots.length > 0) {
                return {
                    message: `No puedes eliminar ni archivar el almacén porque contiene existencias físicas (Items > 0). Realiza un traslado o ajuste de salida primero.`,
                    status: 409, // Conflict
                    data: null
                };
            }

            // 3. Evaluar Historial
            const hasHistory = 
                depot._count.stockMovements > 0 || 
                depot._count.purchaseItems > 0 ||
                depot._count.stockLots > 0; // Tuvo lotes en el pasado (aunque ahora estén en 0)

            if (hasHistory) {
                // === ESCENARIO A: SOFT DELETE (Archivar) ===
                // El almacén está vacío, pero se usó en el pasado. Guardamos la referencia.
                
                if (!depot.isActive) {
                    return {
                        message: 'El almacén ya se encuentra archivado',
                        status: 400,
                        data: null
                    };
                }

                await prisma.depot.update({
                    where: { id },
                    data: { isActive: false }
                });

                return {
                    message: 'Almacén archivado correctamente (Está vacío pero tiene historial)',
                    status: 200,
                    data: null
                };

            } else {
                // === ESCENARIO B: HARD DELETE (Borrado Físico) ===
                // Nunca se usó. Es seguro borrarlo.

                // Primero borramos los lotes (que ya sabemos que están en 0 por la validación del paso 2)
                // para evitar error de Foreign Key
                await prisma.stockLot.deleteMany({
                    where: { depotId: id }
                });

                await prisma.depot.delete({
                    where: { id }
                });

                return {
                    message: 'Almacén eliminado permanentemente (Estaba vacío y sin uso)',
                    status: 200,
                    data: null
                };
            }

        } catch (error) {
            console.error('Error al eliminar el depósito:', error);
            return {
                message: 'Error interno al procesar la eliminación',
                status: 500,
                data: null
            };
        }
    }
}
