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

            const depot = await prisma.depot.findFirst({
                where: { id, businessId, isActive: true },
                include: {
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
                    message: 'Depósito no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            // Verificar si hay registros asociados
            const totalRecords = depot._count.stockLots + depot._count.stockMovements;
            
            if (totalRecords > 0) {
                return {
                    message: `No se puede eliminar el depósito porque tiene ${totalRecords} registro(s) de inventario asociado(s)`,
                    status: 400,
                    data: null
                };
            }

            await prisma.depot.update({
                where: { id },
                data: { isActive: false }
            });

            return {
                message: 'Depósito marcado como eliminado (soft delete)',
                status: 200,
                data: null
            };

        } catch (error) {

            console.error('Error al eliminar el depósito:', error);

            return {
                message: 'Error al eliminar el depósito',
                status: 500,
                data: null
            };
        }
    }
}
