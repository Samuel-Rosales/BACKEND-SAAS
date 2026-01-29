import { prisma } from '@/configs';
import { CreateExchangeRateInterface, UpdateExchangeRateInterface } from './interfaces';
import axios from 'axios';


export class ExchangeRateService {
    private readonly BCV_API_URL = 'https://api-bcv-pi.vercel.app/api/tasa/usd';

    async create(businessId: number, data: CreateExchangeRateInterface) {
        try {

            const shouldBeActive = data.isActive !== undefined ? data.isActive : true;

            const exchangeRate = await prisma.$transaction(async (tx) => {
                if (shouldBeActive) {
                    await tx.exchangeRate.updateMany({
                        where: {
                            businessId,
                            isActive: true,
                        },
                        data: { isActive: false },
                    });
                }

                return tx.exchangeRate.create({
                    data: {
                        businessId,
                        rate: data.rate,
                        source: data.source ?? 'MANUAL',
                        isActive: shouldBeActive,
                        ...(data.createdAt ? { createdAt: new Date(data.createdAt) } : {}),
                    },
                    select: {
                        id: true,
                        businessId: true,
                        rate: true,
                        source: true,
                        isActive: true,
                        createdAt: true,
                    },
                });
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

    async findAll(businessId: number) {
        try {

            const exchangeRates = await prisma.exchangeRate.findMany({
                where: {
                    businessId,
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
    async findLatest(businessId: number) {
        try {
            const exchangeRate =
                (await prisma.exchangeRate.findFirst({
                    where: {
                        businessId,
                        isActive: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                })) ??
                (await prisma.exchangeRate.findFirst({
                    where: {
                        businessId,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                }));

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
    async findOne(id: number, businessId: number) {
        try {
            const exchangeRate = await prisma.exchangeRate.findFirst({
                where: { 
                    id,
                    businessId
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
    async update(id: number, businessId: number, data: UpdateExchangeRateInterface) {

        try {

            // Verificar que la tasa pertenece al negocio
            const existingRate = await prisma.exchangeRate.findFirst({
                where: { 
                    id,
                    businessId
                }
            });

            if (!existingRate) {
                return {
                    message: 'Tasa de cambio no encontrada o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            const updatedExchangeRate = await prisma.$transaction(async (tx) => {
                if (data.isActive === true) {
                    await tx.exchangeRate.updateMany({
                        where: {
                            businessId,
                            isActive: true,
                            NOT: { id },
                        },
                        data: { isActive: false },
                    });
                }

                return tx.exchangeRate.update({
                    where: { id },
                    data: {
                        ...data,
                        ...(data.createdAt ? { createdAt: new Date(data.createdAt) } : {}),
                    },
                });
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
    async remove(id: number, businessId: number) {
        try {
            // 1. Buscar la tasa con sus relaciones
            const exchangeRate = await prisma.exchangeRate.findFirst({
                where: { id, businessId },
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

    async syncBCVRate() {
        try {
            console.log('🔄 Iniciando sincronización de tasa BCV...');

            // 1. Fetch a la API Externa
            const response = await axios.get(this.BCV_API_URL);
            
            // Adaptar esto según la estructura de la API que uses
            const rateValue = response.data.valor.valor_num; 

            const date = response.data.fecha_iso;
            
            if (!rateValue || isNaN(rateValue)) {
                throw new Error('La API externa no devolvió un valor numérico válido.');
            }

            // 2. Verificar la última tasa registrada para no duplicar innecesariamente
            const lastRate = await prisma.exchangeRate.findFirst({
                orderBy: { createdAt: 'desc' }
            });

            // Si la tasa es la misma y es del mismo día, quizás no quieras guardarla de nuevo
            // O quizás sí para tener un log horario. Asumamos que guardamos historial.

            if (date && lastRate && lastRate.createdAt.toISOString().startsWith(date) && lastRate.rate === rateValue) {
                console.log('ℹ️ La tasa BCV no ha cambiado hoy. No se crea un nuevo registro.');
                return lastRate;
            }

            // 3. Guardar en Base de Datos
            const newRate = await prisma.exchangeRate.create({
                data: {
                    rate: rateValue,
                    source: 'API_BCV',
                    createdAt: new Date(date),
                    isActive: true,
                    businessId: null,
                }
            });

            console.log(`✅ Tasa BCV actualizada: ${rateValue}`);
            return newRate;

        } catch (error) {
            console.error('❌ Error sincronizando BCV:', error);
            // Aquí podrías enviar una alerta a Slack/Email si falla
            throw error;
        }
    }
}
