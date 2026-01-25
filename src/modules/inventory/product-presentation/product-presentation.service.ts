import { prisma } from '@/configs';
import { CreateProductPresentationInterface, UpdateProductPresentationInterface } from './interfaces';

export class ProductPresentationService {

    // 1. CREAR PRESENTACIÓN
    async create(businessId: number, data: CreateProductPresentationInterface) {
        try {
            // A. Verificar que el producto existe y es de MI negocio
            const product = await prisma.product.findFirst({
                where: { id: data.productId, businessId },
                include: { unit: true }
            });

            if (!product) {
                return { message: 'El producto no existe o no pertenece a tu negocio', status: 404, data: null };
            }

            if (product.unit.type === 'UNIT') {
                const isInteger = Number.isInteger(data.factor); 
                // O también: data.factor % 1 === 0
                
                if (!isInteger) {
                    return {
                        status: 400,
                        message: `Para productos medidos por unidades (como ${product.unit.symbol}), el factor de presentación no puede tener decimales. No puedes tener media pieza.`,
                        data: null
                    };
                }
            }

            const duplicate = await prisma.productPresentation.findFirst({
                where: {
                    productId: data.productId,
                    name: { equals: data.name, mode: 'insensitive' }
                }
            });

            if (duplicate) {
                return { message: `Ya existe una presentación llamada "${data.name}" para este producto`, status: 400, data: null };
            }

            // C. Crear
            const presentation = await prisma.productPresentation.create({
                data: {
                    productId: data.productId,
                    name: data.name,
                    factor: data.factor,
                    barCode: data.barCode || null,
                    price: data.price || 0
                }
            });

            return {
                message: 'Presentación agregada exitosamente',
                status: 201,
                data: presentation
            };

        } catch (error) {
            console.error('Error al crear presentación:', error);
            return { message: 'Error interno del servidor', status: 500, data: null };
        }
    }

    // 2. LISTAR POR PRODUCTO
    // (Usualmente no necesitas listar "todas las presentaciones del mundo", sino las de un producto específico)
    async findAllByProduct(businessId: number, productId: number, includeArchived = false) {
        try {
            const product = await prisma.product.findFirst({
                where: { id: productId, businessId }
            });

            if (!product) {
                return { message: 'Producto no encontrado', status: 404, data: null };
            }

            const whereClause: any = {
                productId,
                isActive: true // Por defecto solo activas
            };

            // Si piden incluir archivados, quitamos el filtro
            if (includeArchived) delete whereClause.isActive;

            const presentations = await prisma.productPresentation.findMany({
                where: whereClause,
                orderBy: { factor: 'asc' }
            });

            return {
                message: 'Presentaciones obtenidas',
                status: 200,
                data: presentations
            };

        } catch (error) {
            console.error('Error al listar presentaciones:', error);
            return { message: 'Error interno', status: 500, data: null };
        }
    }

    // 3. ACTUALIZAR
    async update(businessId: number, id: number, data: UpdateProductPresentationInterface) {
        try {
            // A. Buscar la presentación y verificar que su producto padre sea de mi negocio
            const presentation = await prisma.productPresentation.findFirst({
                where: {
                    id,
                    product: { businessId } // <--- EL TRUCO DE SEGURIDAD
                }
            });

            if (!presentation) {
                return { message: 'Presentación no encontrada o sin permisos', status: 404, data: null };
            }

            const product = await prisma.product.findFirst({
                where: { id: presentation.productId, businessId },
                include: { unit: true }
            });

            if (!product) {
                return { message: 'El producto no existe o no pertenece a tu negocio', status: 404, data: null };
            }

            if (product.unit.type === 'UNIT') {
                const isInteger = Number.isInteger(data.factor); 
                // O también: data.factor % 1 === 0
                
                if (!isInteger) {
                    return {
                        status: 400,
                        message: `Para productos medidos por unidades (como ${product.unit.symbol}), el factor de presentación no puede tener decimales. No puedes tener media pieza.`,
                        data: null
                    };
                }
            }

            // B. Actualizar
            const updated = await prisma.productPresentation.update({
                where: { id },
                data: {
                    name: data.name,
                    factor: data.factor,
                    barCode: data.barCode,
                    price: data.price
                }
            });

            return {
                message: 'Presentación actualizada',
                status: 200,
                data: updated
            };

        } catch (error) {
            console.error('Error al actualizar presentación:', error);
            return { message: 'Error interno', status: 500, data: null };
        }
    }

    // 4. ELIMINAR
    async remove(businessId: number, id: number) {
        try {
            // 1. Verificar propiedad y buscar uso
            const presentation = await prisma.productPresentation.findFirst({
                where: {
                    id,
                    product: { businessId }
                },
                include: {
                    _count: {
                        select: {
                            saleItems: true,     // ¿Se ha vendido usando esta presentación?
                            purchaseItems: true  // ¿Se ha comprado usando esta presentación?
                        }
                    }
                }
            });

            if (!presentation) {
                return { message: 'Presentación no encontrada', status: 404, data: null };
            }

            // 2. Verificar Historial
            const hasHistory =
                presentation._count.saleItems > 0 ||
                presentation._count.purchaseItems > 0;

            if (hasHistory) {
                // === ESCENARIO A: SOFT DELETE (Archivar) ===
                // Se usó en facturas, no podemos borrarla o rompemos el historial.

                if (!presentation.isActive) {
                    return { message: 'La presentación ya está archivada', status: 400, data: null };
                }

                const archived = await prisma.productPresentation.update({
                    where: { id },
                    data: { isActive: false }
                });

                return {
                    message: 'Presentación archivada (Tiene historial de ventas/compras)',
                    status: 200,
                    data: archived
                };

            } else {
                // === ESCENARIO B: HARD DELETE (Físico) ===

                await prisma.productPresentation.delete({ where: { id } });

                return {
                    message: 'Presentación eliminada permanentemente',
                    status: 200,
                    data: null
                };
            }

        } catch (error) {
            console.error('Error al eliminar presentación:', error);
            return { message: 'Error interno', status: 500, data: null };
        }
    }
}