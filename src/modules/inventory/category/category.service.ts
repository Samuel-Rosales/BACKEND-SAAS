import { prisma } from '@/configs';
import { CreateCategoryInterface, UpdateCategoryInterface } from './interfaces';

export class CategoryService {

    // 1. CREAR
    async create(businessId: number, data: CreateCategoryInterface) {
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

            const category = await prisma.category.create({
                data: {
                    businessId: businessId,
                    name: data.name
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
                            products: true
                        }
                    }
                }
            });

            if (!category) {
                return {
                    message: 'No se pudo crear la categoría',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Categoría creada exitosamente',
                status: 201,
                data: category
            };

        } catch (error) {

            console.error('Error al crear la categoría:', error);

            return {
                message: 'Error al crear la categoría',
                status: 500,
                data: null
            };

        }
    }

    // 2. LISTAR TODAS (de un negocio)
    async findAll(businessId: number) {
        try {

            const categories = await prisma.category.findMany({
                where: { businessId },
                orderBy: { id: 'asc' },
                include: {
                    _count: {
                        select: {
                            products: true
                        }
                    }
                }
            });

            if (categories.length === 0) {
                return {
                    message: 'No hay categorías disponibles',
                    status: 404,
                    data: []
                };
            }

            return {
                message: 'Categorías obtenidas exitosamente',
                status: 200,
                data: categories
            };

        } catch (error) {

            console.error('Error al obtener las categorías:', error);

            return {
                message: 'Error al obtener las categorías',
                status: 500,
                data: null
            };
        }
    }

    // 3. BUSCAR UNA
    async findOne(businessId: number, id: number) {
        try {
            const category = await prisma.category.findFirst({
                where: { 
                    id,
                    businessId // Seguridad: solo si pertenece al negocio
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
                            products: true
                        }
                    }
                }
            });

            if (!category) {
                return {
                    message: 'Categoría no encontrada',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Categoría obtenida exitosamente',
                status: 200,
                data: category
            };

         } catch (error) {

            console.error('Error al obtener la categoría:', error);

            return {
                message: 'Error al obtener la categoría',
                status: 500,
                data: null
            };
        }
    }

    // 4. ACTUALIZAR
    async update(businessId: number, id: number, data: UpdateCategoryInterface) {

        try {

            // Verificar que la categoría pertenece al negocio
            const existingCategory = await prisma.category.findFirst({
                where: { id, businessId }
            });

            if (!existingCategory) {
                return {
                    message: 'Categoría no encontrada o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            const updatedCategory = await prisma.category.update({
                where: { id },
                data: data,
                include: {
                    _count: {
                        select: {
                            products: true
                        }
                    }
                }
            });

            if (!updatedCategory) {
                return {
                    message: 'No se pudo actualizar la categoría',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Categoría actualizada exitosamente',
                status: 200,
                data: updatedCategory
            };

        } catch (error) {

            console.error('Error al actualizar la categoría:', error);
            
            return {
                message: 'Error al actualizar la categoría',
                status: 500,
                data: null
            };
        }
    }

    // 5. ELIMINAR (Con protección de integridad)
    async remove(businessId: number, id: number) {
        try {

            const category = await prisma.category.findFirst({
                where: { id, businessId },
                include: {
                    _count: {
                        select: {
                            products: true
                        }
                    }
                }
            });
            
            if (!category) {
                return {
                    message: 'Categoría no encontrada o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            // Verificar si hay productos asociados
            if (category._count.products > 0) {
                return {
                    message: `No se puede eliminar la categoría porque tiene ${category._count.products} producto(s) asociado(s)`,
                    status: 400,
                    data: null
                };
            }

            await prisma.category.delete({
                where: { id }
            });

            return {
                message: 'Categoría eliminada exitosamente',
                status: 200,
                data: null
            };

        } catch (error) {

            console.error('Error al eliminar la categoría:', error);

            return {
                message: 'Error al eliminar la categoría',
                status: 500,
                data: null
            };
        }
    }
}
