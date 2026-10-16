import { prisma } from '@/configs';
import { CreateExchangeRateInterface, UpdateExchangeRateInterface } from './interfaces';
import axios from 'axios';
import { ExchangeRateStrategy } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { resolveBusinessExchangeRate } from '@/utils/resolve-exchange-rate';


export class ExchangeRateService {
    private readonly BCV_API_URL = 'https://api-bcv-pi.vercel.app/api/tasa/usd';
    private readonly DOLAR_API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';

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

            let activeRate = null;
            
            try {
                activeRate = await resolveBusinessExchangeRate(businessId);
            } catch (e) {
                console.warn(`Advertencia: Negocio ${businessId} sin tasa activa.`);
                // No lanzamos error 500 para no bloquear el acceso al dashboard,
                // pero enviamos null o una tasa por defecto.
            }

            const exchangeRate = activeRate ? activeRate : null;

            if (!exchangeRate) {
                return {
                    message: 'No hay tasa de cambio activa',
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

    private async fetchBCVRateFromProviders(): Promise<{ rateValue: number; apiDateRaw: string; provider: string }> {
        // Proveedor 1: api-bcv-pi.vercel.app (Primario)
        try {
            const res = await axios.get(this.BCV_API_URL, { timeout: 6000 });
            const val = Number(res.data?.valor?.valor_num);
            const dateRaw = res.data?.fecha_iso || res.data?.fecha;
            if (val && !isNaN(val) && dateRaw) {
                return { rateValue: val, apiDateRaw: String(dateRaw), provider: 'api-bcv-pi' };
            }
        } catch (err: any) {
            console.warn(`[BCV SYNC] Proveedor primario (api-bcv-pi) no disponible (${err.message}). Probando proveedor de respaldo...`);
        }

        // Proveedor 2: ve.dolarapi.com (Respaldo)
        try {
            const res = await axios.get(this.DOLAR_API_URL, { timeout: 6000 });
            const val = Number(res.data?.promedio);
            const dateRaw = res.data?.fechaActualizacion;
            if (val && !isNaN(val) && dateRaw) {
                return { rateValue: val, apiDateRaw: String(dateRaw), provider: 'dolarapi' };
            }
        } catch (err: any) {
            console.error(`[BCV SYNC] Proveedor secundario (dolarapi) también falló: ${err.message}`);
        }

        throw new Error('No se pudo obtener la tasa oficial de ninguno de los proveedores de BCV disponibles.');
    }

    async syncBCVRate() {
        try {
            const { rateValue, apiDateRaw, provider } = await this.fetchBCVRateFromProviders();

            // 1. Obtener la última tasa oficial global registrada (excluyendo tasas manuales de negocios)
            const lastRate = await prisma.exchangeRate.findFirst({
                where: {
                    businessId: null,
                    source: 'API_BCV',
                },
                orderBy: { createdAt: 'desc' }
            });

            // 2. Comprobar si ya existe con la misma fecha valor y el mismo precio
            if (lastRate) {
                const apiDate = new Date(apiDateRaw).toISOString().split('T')[0];
                const dbDate = new Date(lastRate.createdAt).toISOString().split('T')[0];

                if (apiDate === dbDate && new Decimal(lastRate.rate).equals(rateValue)) {
                    if (!lastRate.isActive) {
                        await prisma.exchangeRate.update({
                            where: { id: lastRate.id },
                            data: { isActive: true },
                        });
                        return { ...lastRate, isActive: true };
                    }
                    return lastRate;
                }
            }

            // 3. Desactivar tasas oficiales previas y registrar la nueva tasa activa
            const parsedDate = new Date(apiDateRaw);
            const targetCreatedAt = !isNaN(parsedDate.getTime()) ? parsedDate : new Date();

            const newRate = await prisma.$transaction(async (tx) => {
                await tx.exchangeRate.updateMany({
                    where: {
                        businessId: null,
                        source: 'API_BCV',
                        isActive: true,
                    },
                    data: { isActive: false },
                });

                return tx.exchangeRate.create({
                    data: {
                        rate: rateValue,
                        source: 'API_BCV',
                        createdAt: targetCreatedAt,
                        isActive: true,
                        businessId: null,
                    },
                });
            });

            console.log(`[BCV SYNC] Tasa actualizada vía [${provider}]: ${newRate.rate} Bs. (Fecha: ${newRate.createdAt.toISOString().split('T')[0]})`);
            return newRate;

        } catch (error) {
            console.error('❌ Error sincronizando BCV:', error);
            throw error;
        }
    }
}
