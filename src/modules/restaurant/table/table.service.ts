import { prisma } from '@/configs';
import { CreateTableInterface, UpdateTableInterface } from './interfaces';

export class TableService {

    async create(businessId: number, data: CreateTableInterface) {
        try {
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

            const existingTable = await prisma.restaurantTable.findFirst({
                where: { businessId, name: data.name, isActive: true }
            });

            if (existingTable) {
                return {
                    message: 'Ya existe una mesa con ese nombre',
                    status: 400,
                    data: null
                };
            }

            const table = await prisma.restaurantTable.create({
                data: {
                    businessId,
                    name: data.name,
                    capacity: data.capacity || null,
                    status: (data.status as any) || 'AVAILABLE'
                }
            });

            return {
                message: 'Mesa creada exitosamente',
                status: 201,
                data: table
            };

        } catch (error) {
            console.error('Error al crear la mesa:', error);
            return {
                message: 'Error al crear la mesa',
                status: 500,
                data: null
            };
        }
    }

    async findAll(businessId: number) {
        try {
            const tables = await prisma.restaurantTable.findMany({
                where: { businessId, isActive: true },
                orderBy: { id: 'asc' }
            });

            if (tables.length === 0) {
                return {
                    message: 'No hay mesas registradas',
                    status: 404,
                    data: []
                };
            }

            return {
                message: 'Mesas obtenidas exitosamente',
                status: 200,
                data: tables
            };

        } catch (error) {
            console.error('Error al obtener las mesas:', error);
            return {
                message: 'Error al obtener las mesas',
                status: 500,
                data: null
            };
        }
    }

    async findOne(businessId: number, id: number) {
        try {
            const table = await prisma.restaurantTable.findFirst({
                where: {
                    id,
                    businessId,
                    isActive: true
                }
            });

            if (!table) {
                return {
                    message: 'Mesa no encontrada',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Mesa obtenida exitosamente',
                status: 200,
                data: table
            };

        } catch (error) {
            console.error('Error al obtener la mesa:', error);
            return {
                message: 'Error al obtener la mesa',
                status: 500,
                data: null
            };
        }
    }

    async update(businessId: number, id: number, data: UpdateTableInterface) {
        try {
            const existingTable = await prisma.restaurantTable.findFirst({
                where: { id, businessId, isActive: true }
            });

            if (!existingTable) {
                return {
                    message: 'Mesa no encontrada o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            if (data.name && data.name !== existingTable.name) {
                const duplicate = await prisma.restaurantTable.findFirst({
                    where: { businessId, name: data.name, isActive: true, id: { not: id } }
                });

                if (duplicate) {
                    return {
                        message: 'Ya existe una mesa con ese nombre',
                        status: 400,
                        data: null
                    };
                }
            }

            const updatedTable = await prisma.restaurantTable.update({
                where: { id },
                data: {
                    ...(data.name && { name: data.name }),
                    ...(data.capacity !== undefined && { capacity: data.capacity }),
                    ...(data.status && { status: data.status as any })
                }
            });

            return {
                message: 'Mesa actualizada exitosamente',
                status: 200,
                data: updatedTable
            };

        } catch (error) {
            console.error('Error al actualizar la mesa:', error);
            return {
                message: 'Error al actualizar la mesa',
                status: 500,
                data: null
            };
        }
    }

    async remove(businessId: number, id: number) {
        try {
            const table = await prisma.restaurantTable.findFirst({
                where: { id, businessId }
            });

            if (!table) {
                return {
                    message: 'Mesa no encontrada',
                    status: 404,
                    data: null
                };
            }

            if (!table.isActive) {
                return {
                    message: 'La mesa ya se encuentra archivada',
                    status: 400,
                    data: null
                };
            }

            await prisma.restaurantTable.update({
                where: { id },
                data: { isActive: false }
            });

            return {
                message: 'Mesa archivada correctamente',
                status: 200,
                data: null
            };

        } catch (error) {
            console.error('Error al eliminar la mesa:', error);
            return {
                message: 'Error interno al procesar la eliminación',
                status: 500,
                data: null
            };
        }
    }
}
