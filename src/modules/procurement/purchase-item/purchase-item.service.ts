import { prisma } from '@/configs';
import { CreatePurchaseItemInterface, UpdatePurchaseItemInterface } from './interfaces';

const NON_PERISHABLE_DATE = new Date('2099-12-31');

export class PurchaseItemService {

    // 1. CREAR
    async create(businessId: number, data: CreatePurchaseItemInterface) {
        try {
            
            // Validaciones paralelas
            const [purchase, product, depot, productPresentation] = await Promise.all([
                prisma.purchase.findUnique({
                    where: { id: data.purchaseId },
                    select: { id: true, businessId: true }
                }),
                prisma.product.findUnique({
                    where: { id: data.productId },
                    select: { id: true, name: true, isPerishable: true, businessId: true }
                }),
                prisma.depot.findUnique({
                    where: { id: data.depotId },
                    select: { id: true, businessId: true, isActive: true }
                }),
                data.productPresentationId
                    ? prisma.productPresentation.findUnique({
                        where: { id: data.productPresentationId },
                        select: { id: true, isActive: true }
                    })
                    : Promise.resolve(null)
            ]);

            // Validar que la compra existe
            if (!purchase) {
                return {
                    message: 'La compra no existe',
                    status: 404,
                    data: null
                };
            }

            // Validar que la compra pertenece al negocio
            if (purchase.businessId !== businessId) {
                return {
                    message: 'La compra no pertenece a este negocio',
                    status: 403,
                    data: null
                };
            }

            // Validar producto
            if (!product) {
                return {
                    message: 'El producto no existe',
                    status: 404,
                    data: null
                };
            }

            if (product.businessId !== businessId) {
                return {
                    message: 'El producto no pertenece a este negocio',
                    status: 403,
                    data: null
                };
            }

            // Validar almacén
            if (!depot) {
                return {
                    message: 'El almacén no existe',
                    status: 404,
                    data: null
                };
            }

            if (depot.businessId !== businessId) {
                return {
                    message: 'El almacén no pertenece a este negocio',
                    status: 403,
                    data: null
                };
            }

            if (!depot.isActive) {
                return {
                    message: 'El almacén está inactivo',
                    status: 400,
                    data: null
                };
            }

            // Validar presentación de producto (si se proporciona)
            if (data.productPresentationId) {
                if (!productPresentation) {
                    return {
                        message: 'La presentación de producto no existe',
                        status: 404,
                        data: null
                    };
                }

                if (!productPresentation.isActive) {
                    return {
                        message: 'La presentación de producto está inactiva',
                        status: 400,
                        data: null
                    };
                }
            }

            // Validar cantidad
            if (data.quantity <= 0) {
                return {
                    message: 'La cantidad debe ser mayor a cero',
                    status: 400,
                    data: null
                };
            }

            // Validar costo unitario
            if (data.unitCost <= 0) {
                return {
                    message: 'El costo unitario debe ser mayor a cero',
                    status: 400,
                    data: null
                };
            }

            // Validar fecha de expiración para productos perecederos
            if (product.isPerishable && !data.expirationDate) {
                return {
                    message: `El producto "${product.name}" es perecedero y requiere fecha de vencimiento`,
                    status: 400,
                    data: null
                };
            }

            // Preparar fecha de expiración
            const expirationDate = data.expirationDate
                ? new Date(data.expirationDate)
                : NON_PERISHABLE_DATE;

            // Crear el item
            const purchaseItem = await prisma.purchaseItem.create({
                data: {
                    purchaseId: data.purchaseId,
                    productId: data.productId,
                    depotId: data.depotId,
                    productPresentationId: data.productPresentationId || null,
                    quantity: data.quantity,
                    unitCost: data.unitCost,
                    expirationDate: expirationDate
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            imageUrl: true
                        }
                    },
                    depot: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    productPresentation: {
                        select: {
                            id: true,
                            name: true,
                            factor: true
                        }
                    },
                    purchase: {
                        select: {
                            id: true,
                            totalCost: true,
                            reference: true
                        }
                    }
                }
            });

            return {
                message: 'Item de compra creado exitosamente',
                status: 201,
                data: purchaseItem
            };

        } catch (error) {
            console.error('Error al crear el item de compra:', error);
            
            return {
                message: 'Error al crear el item de compra',
                status: 500,
                data: null
            };
        }
    }

    // 2. LISTAR TODOS (Por negocio y opcionalmente por compra)
    async findAll(businessId: number, purchaseId?: number) {
        try {
            
            const whereClause: any = {
                purchase: {
                    businessId: businessId
                }
            };

            // Si se proporciona purchaseId, filtrar por compra
            if (purchaseId) {
                whereClause.purchaseId = purchaseId;
            }

            const purchaseItems = await prisma.purchaseItem.findMany({
                where: whereClause,
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            imageUrl: true
                        }
                    },
                    depot: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    productPresentation: {
                        select: {
                            id: true,
                            name: true,
                            factor: true
                        }
                    },
                    purchase: {
                        select: {
                            id: true,
                            totalCost: true,
                            reference: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: {
                    id: 'desc'
                }
            });

            if (purchaseItems.length === 0) {
                return {
                    message: 'No hay items de compra registrados',
                    status: 404,
                    data: []
                };
            }

            return {
                message: 'Items de compra obtenidos exitosamente',
                status: 200,
                data: purchaseItems
            };

        } catch (error) {
            console.error('Error al obtener los items de compra:', error);
            
            return {
                message: 'Error al obtener los items de compra',
                status: 500,
                data: null
            };
        }
    }

    // 3. OBTENER UNO
    async findOne(businessId: number, id: number) {
        try {
            
            const purchaseItem = await prisma.purchaseItem.findFirst({
                where: {
                    id: id,
                    purchase: {
                        businessId: businessId
                    }
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            imageUrl: true,
                            isPerishable: true
                        }
                    },
                    depot: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    productPresentation: {
                        select: {
                            id: true,
                            name: true,
                            factor: true
                        }
                    },
                    purchase: {
                        select: {
                            id: true,
                            totalCost: true,
                            reference: true,
                            createdAt: true,
                            supplier: {
                                select: {
                                    id: true,
                                    nameCompany: true
                                }
                            }
                        }
                    }
                }
            });

            if (!purchaseItem) {
                return {
                    message: 'Item de compra no encontrado',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Item de compra obtenido exitosamente',
                status: 200,
                data: purchaseItem
            };

        } catch (error) {
            console.error('Error al obtener el item de compra:', error);
            
            return {
                message: 'Error al obtener el item de compra',
                status: 500,
                data: null
            };
        }
    }

    // 4. ACTUALIZAR
    async update(businessId: number, id: number, data: UpdatePurchaseItemInterface) {
        try {
            
            // Verificar que el item existe y pertenece al negocio
            const existing = await prisma.purchaseItem.findFirst({
                where: {
                    id: id,
                    purchase: {
                        businessId: businessId
                    }
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            isPerishable: true
                        }
                    }
                }
            });

            if (!existing) {
                return {
                    message: 'Item de compra no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            // Validaciones opcionales si se proporcionan
            if (data.productId) {
                const product = await prisma.product.findUnique({
                    where: { id: data.productId },
                    select: { id: true, businessId: true }
                });

                if (!product) {
                    return {
                        message: 'El producto no existe',
                        status: 404,
                        data: null
                    };
                }

                if (product.businessId !== businessId) {
                    return {
                        message: 'El producto no pertenece a este negocio',
                        status: 403,
                        data: null
                    };
                }
            }

            if (data.depotId) {
                const depot = await prisma.depot.findUnique({
                    where: { id: data.depotId },
                    select: { id: true, businessId: true, isActive: true }
                });

                if (!depot) {
                    return {
                        message: 'El almacén no existe',
                        status: 404,
                        data: null
                    };
                }

                if (depot.businessId !== businessId) {
                    return {
                        message: 'El almacén no pertenece a este negocio',
                        status: 403,
                        data: null
                    };
                }

                if (!depot.isActive) {
                    return {
                        message: 'El almacén está inactivo',
                        status: 400,
                        data: null
                    };
                }
            }

            if (data.productPresentationId) {
                const productPresentation = await prisma.productPresentation.findUnique({
                    where: { id: data.productPresentationId },
                    select: { id: true, isActive: true }
                });

                if (!productPresentation) {
                    return {
                        message: 'La presentación de producto no existe',
                        status: 404,
                        data: null
                    };
                }

                if (!productPresentation.isActive) {
                    return {
                        message: 'La presentación de producto está inactiva',
                        status: 400,
                        data: null
                    };
                }
            }

            if (data.quantity !== undefined && data.quantity <= 0) {
                return {
                    message: 'La cantidad debe ser mayor a cero',
                    status: 400,
                    data: null
                };
            }

            if (data.unitCost !== undefined && data.unitCost <= 0) {
                return {
                    message: 'El costo unitario debe ser mayor a cero',
                    status: 400,
                    data: null
                };
            }

            // Validar fecha de expiración si se proporciona
            const productToCheck = data.productId 
                ? await prisma.product.findUnique({
                    where: { id: data.productId },
                    select: { id: true, name: true, isPerishable: true }
                })
                : existing.product;

            if (productToCheck?.isPerishable && !data.expirationDate) {
                // Si el producto es perecedero y no se proporciona fecha, mantener la existente
                // Solo validamos si se intenta cambiar a un producto perecedero sin fecha
            }

            // Preparar datos de actualización
            const updateData: any = { ...data };
            
            if (data.expirationDate) {
                updateData.expirationDate = new Date(data.expirationDate);
            } else if (productToCheck && !productToCheck.isPerishable && !data.expirationDate) {
                // Si no es perecedero y no se proporciona fecha, usar la fecha por defecto
                updateData.expirationDate = NON_PERISHABLE_DATE;
            }

            // Actualizar
            const updatedItem = await prisma.purchaseItem.update({
                where: { id: id },
                data: updateData,
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            imageUrl: true
                        }
                    },
                    depot: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    productPresentation: {
                        select: {
                            id: true,
                            name: true,
                            factor: true
                        }
                    },
                    purchase: {
                        select: {
                            id: true,
                            totalCost: true,
                            reference: true
                        }
                    }
                }
            });

            return {
                message: 'Item de compra actualizado exitosamente',
                status: 200,
                data: updatedItem
            };

        } catch (error) {
            console.error('Error al actualizar el item de compra:', error);
            
            return {
                message: 'Error al actualizar el item de compra',
                status: 500,
                data: null
            };
        }
    }

    // 5. ELIMINAR
    async remove(businessId: number, id: number) {
        try {
            
            // Verificar que el item existe y pertenece al negocio
            const purchaseItem = await prisma.purchaseItem.findFirst({
                where: {
                    id: id,
                    purchase: {
                        businessId: businessId
                    }
                },
                select: {
                    id: true
                }
            });

            if (!purchaseItem) {
                return {
                    message: 'Item de compra no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            // Eliminar
            await prisma.purchaseItem.delete({
                where: { id: id }
            });

            return {
                message: 'Item de compra eliminado exitosamente',
                status: 200,
                data: null
            };

        } catch (error) {
            console.error('Error al eliminar el item de compra:', error);
            
            return {
                message: 'Error al eliminar el item de compra',
                status: 500,
                data: null
            };
        }
    }
}
