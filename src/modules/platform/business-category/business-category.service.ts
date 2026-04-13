import { prisma } from '@/configs';
import { CreateBusinessCategoryInterface, UpdateBusinessCategoryInterface } from './interfaces';

export class BusinessCategoryService {

    // 1. CREAR
    async create(data: CreateBusinessCategoryInterface) {
        try {
            
            const category = await prisma.businessCategory.create({
                data: {
                    name: data.name,
                    description: data.description
                }
            });

            if (!category) {
                return {
                    message: 'No se pudo crear la categoría de negocio',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Categoría de negocio creada exitosamente',
                status: 201,
                data: category
            };

        } catch (error) {

            console.error('Error al crear la categoría de negocio:', error);

            return {
                message: 'Error al crear la categoría de negocio',
                status: 500,
                data: null
            };

        }
    }

    // 2. LISTAR TODOS
    async findAll() {
        try {

            const categories = await prisma.businessCategory.findMany({
                orderBy: { id: 'asc' },
                include: {
                    _count: {
                        select: {
                            businesses: true
                        }
                    }
                }
            });

            if (categories.length === 0) {
                return {
                    message: 'No hay categorías de negocio disponibles',
                    status: 200,
                    data: []
                };
            }

            return {
                message: 'Categorías de negocio obtenidas exitosamente',
                status: 200,
                data: categories
            };

        } catch (error) {

            console.error('Error al obtener las categorías de negocio:', error);

            return {
                message: 'Error al obtener las categorías de negocio',
                status: 500,
                data: null
            };
        }
    }

    // 3. BUSCAR UNA
    async findOne(id: number) {
        try {
            const category = await prisma.businessCategory.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: {
                            businesses: true
                        }
                    }
                }
            });

            if (!category) {
                return {
                    message: 'Categoría de negocio no encontrada',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Categoría de negocio obtenida exitosamente',
                status: 200,
                data: category
            };

         } catch (error) {

            console.error('Error al obtener la categoría de negocio:', error);

            return {
                message: 'Error al obtener la categoría de negocio',
                status: 500,
                data: null
            };
        }
    }

    // 4. ACTUALIZAR
    async update(id: number, data: UpdateBusinessCategoryInterface) {

        try {

            const updatedCategory = await prisma.businessCategory.update({
                where: { id },
                data: data
            });

            if (!updatedCategory) {
                return {
                    message: 'No se pudo actualizar la categoría de negocio',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Categoría de negocio actualizada exitosamente',
                status: 200,
                data: updatedCategory
            };

        } catch (error) {

            console.error('Error al actualizar la categoría de negocio:', error);
            
            return {
                message: 'Error al actualizar la categoría de negocio',
                status: 500,
                data: null
            };
        }
    }

    // 5. ELIMINAR (Con protección de integridad)
    async remove(id: number) {
        try {

            const category = await prisma.businessCategory.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: {
                            businesses: true
                        }
                    }
                }
            });
            
            if (!category) {
                return {
                    message: 'Categoría de negocio no encontrada',
                    status: 404,
                    data: null
                };
            }

            // Verificar si hay negocios asociados
            if (category._count.businesses > 0) {
                return {
                    message: `No se puede eliminar la categoría porque tiene ${category._count.businesses} negocio(s) asociado(s)`,
                    status: 400,
                    data: null
                };
            }

            await prisma.businessCategory.delete({
                where: { id }
            });

            return {
                message: 'Categoría de negocio eliminada exitosamente',
                status: 200,
                data: null
            };

        } catch (error) {

            console.error('Error al eliminar la categoría de negocio:', error);

            return {
                message: 'Error al eliminar la categoría de negocio',
                status: 500,
                data: null
            };
        }
    }
}
