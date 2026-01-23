import { prisma } from '@/configs';
import { CreateExchangeRateInterface, UpdateExchangeRateInterface } from './interfaces';

export class ExchangeRateService {

    async create(userId: number, data: CreateExchangeRateInterface) {
        try {
            
            const exchangeRate = await prisma.exchangeRate.create({
                data: {
                    rate: data.rate,
                },
                select: {
                    id: true,
                    rate: true,
                    createdAt: true,
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

    async findAll() {
        try {

            const exchangeRates = await prisma.exchangeRate.findMany({
                where: {
                    isActive: true
                },
                orderBy: {
                    createdAt: 'desc',
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
    async findLatest() {
        try {
            const exchangeRate = await prisma.exchangeRate.findFirst({
                where: {
                    isActive: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            if (!exchangeRate) {
                return {
                    message: `No se encontró tasa de cambio`,
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
    async findOne(id: number) {
        try {
            const exchangeRate = await prisma.exchangeRate.findFirst({
                where: { 
                    id,
                    isActive: true
                },
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
    async update(id: number, data: UpdateExchangeRateInterface) {

        try {

            // Verificar que la tasa pertenece al negocio
            const existingRate = await prisma.exchangeRate.findFirst({
                where: { 
                    id,
                    isActive: true
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
    async remove(id: number) {
        try {
            // 1. Buscar la tasa con sus relaciones
            const exchangeRate = await prisma.exchangeRate.findFirst({
                where: { id },
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
                    message: 'Tasa de cambio no encontrada',
                    status: 404,
                    data: null
                };
            }

            // 2. Verificar si hay registros asociados (Historial)
            const totalAssociations = 
                exchangeRate._count.sales +
                exchangeRate._count.salePayments +
                exchangeRate._count.purchases +
                exchangeRate._count.purchasePayments +
                exchangeRate._count.cashCounts;

            // 3. DECISIÓN: ¿Archivar o Borrar?
            if (totalAssociations > 0) {
                // === ESCENARIO A: SOFT DELETE (Archivar) ===
                // La tasa se usó en operaciones, no podemos borrarla.

                // Si ya estaba inactiva, avisamos
                if (!exchangeRate.isActive) {
                    return {
                        message: 'La tasa de cambio ya se encuentra archivada',
                        status: 400,
                        data: null
                    };
                }

                // La desactivamos
                await prisma.exchangeRate.update({
                    where: { id },
                    data: { isActive: false }
                });

                return {
                    message: `Tasa archivada correctamente. No se puede eliminar porque tiene ${totalAssociations} operaciones asociadas.`,
                    status: 200,
                    data: null
                };

            } else {
                // === ESCENARIO B: HARD DELETE (Borrado Físico) ===
                // Es una tasa creada por error o nunca usada. Limpiamos la BD.

                await prisma.exchangeRate.delete({
                    where: { id }
                });

                return {
                    message: 'Tasa de cambio eliminada permanentemente (Sin historial)',
                    status: 200,
                    data: null
                };
            }

        } catch (error) {
            console.error('Error al eliminar la tasa de cambio:', error);
            return {
                message: 'Error interno al procesar la eliminación',
                status: 500,
                data: null
            };
        }
    }
}
