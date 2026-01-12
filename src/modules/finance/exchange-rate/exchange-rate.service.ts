import { prisma } from '@/configs';
import { CreateExchangeRateInterface, UpdateExchangeRateInterface } from './interfaces';

export class ExchangeRateService {

    // 1. CREAR
    async create(businessId: number, userId: number, data: CreateExchangeRateInterface) {
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

            const exchangeRate = await prisma.exchangeRate.create({
                data: {
                    businessId: businessId,
                    currency: data.currency,
                    rate: data.rate,
                    createdById: userId
                },
                include: {
                    business: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            if (!exchangeRate) {
                return {
                    message: 'No se pudo crear la tasa de cambio',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Tasa de cambio creada exitosamente',
                status: 201,
                data: exchangeRate
            };

        } catch (error) {

            console.error('Error al crear la tasa de cambio:', error);

            return {
                message: 'Error al crear la tasa de cambio',
                status: 500,
                data: null
            };

        }
    }

    // 2. LISTAR TODOS (de un negocio)
    async findAll(businessId: number) {
        try {

            const exchangeRates = await prisma.exchangeRate.findMany({
                where: {
                    businessId: businessId
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            if (exchangeRates.length === 0) {
                return {
                    message: 'No hay tasas de cambio registradas',
                    status: 404,
                    data: []
                };
            }

            return {
                message: 'Tasas de cambio obtenidas exitosamente',
                status: 200,
                data: exchangeRates
            };

        } catch (error) {

            console.error('Error al obtener las tasas de cambio:', error);

            return {
                message: 'Error al obtener las tasas de cambio',
                status: 500,
                data: null
            };
        }
    }

    // 3. OBTENER LA ÚLTIMA TASA POR MONEDA
    async findLatestByCurrency(businessId: number, currency: string) {
        try {
            const exchangeRate = await prisma.exchangeRate.findFirst({
                where: {
                    businessId: businessId,
                    currency: currency
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            if (!exchangeRate) {
                return {
                    message: `No se encontró tasa de cambio para la moneda ${currency}`,
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Tasa de cambio obtenida exitosamente',
                status: 200,
                data: exchangeRate
            };

         } catch (error) {

            console.error('Error al obtener la tasa de cambio:', error);

            return {
                message: 'Error al obtener la tasa de cambio',
                status: 500,
                data: null
            };
        }
    }

    // 4. BUSCAR UNO
    async findOne(businessId: number, id: number) {
        try {
            const exchangeRate = await prisma.exchangeRate.findFirst({
                where: { 
                    id,
                    businessId: businessId
                },
                include: {
                    business: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            if (!exchangeRate) {
                return {
                    message: 'Tasa de cambio no encontrada',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Tasa de cambio obtenida exitosamente',
                status: 200,
                data: exchangeRate
            };

         } catch (error) {

            console.error('Error al obtener la tasa de cambio:', error);

            return {
                message: 'Error al obtener la tasa de cambio',
                status: 500,
                data: null
            };
        }
    }

    // 5. ACTUALIZAR
    async update(businessId: number, id: number, data: UpdateExchangeRateInterface) {

        try {

            // Verificar que la tasa pertenece al negocio
            const existingRate = await prisma.exchangeRate.findFirst({
                where: { 
                    id,
                    businessId: businessId
                }
            });

            if (!existingRate) {
                return {
                    message: 'Tasa de cambio no encontrada o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            const updatedExchangeRate = await prisma.exchangeRate.update({
                where: { id },
                data: data
            });

            if (!updatedExchangeRate) {
                return {
                    message: 'No se pudo actualizar la tasa de cambio',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Tasa de cambio actualizada exitosamente',
                status: 200,
                data: updatedExchangeRate
            };

        } catch (error) {

            console.error('Error al actualizar la tasa de cambio:', error);
            
            return {
                message: 'Error al actualizar la tasa de cambio',
                status: 500,
                data: null
            };
        }
    }

    // 6. ELIMINAR
    async remove(businessId: number, id: number) {
        try {

            const exchangeRate = await prisma.exchangeRate.findFirst({
                where: { 
                    id,
                    businessId: businessId
                },
                include: {
                    _count: {
                        select: {
                            sales: true,
                            salePayments: true,
                            purchases: true,
                            purchasePayments: true,
                            cashCounts: true
                        }
                    }
                }
            });
            
            if (!exchangeRate) {
                return {
                    message: 'Tasa de cambio no encontrada o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            // Verificar si hay registros asociados
            const totalAssociations = 
                exchangeRate._count.sales +
                exchangeRate._count.salePayments +
                exchangeRate._count.purchases +
                exchangeRate._count.purchasePayments +
                exchangeRate._count.cashCounts;

            if (totalAssociations > 0) {
                return {
                    message: `No se puede eliminar la tasa de cambio porque tiene ${totalAssociations} registro(s) asociado(s) (ventas, compras, pagos, etc.)`,
                    status: 400,
                    data: null
                };
            }

            await prisma.exchangeRate.delete({
                where: { id }
            });

            return {
                message: 'Tasa de cambio eliminada exitosamente',
                status: 200,
                data: null
            };

        } catch (error) {

            console.error('Error al eliminar la tasa de cambio:', error);

            return {
                message: 'Error al eliminar la tasa de cambio',
                status: 500,
                data: null
            };
        }
    }
}
