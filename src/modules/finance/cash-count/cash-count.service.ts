import { prisma } from '@/configs';
import { CreateCashCountInterface, UpdateCashCountInterface } from './interfaces';

export class CashCountService {

    // 1. CREAR
    async create(businessId: number, data: CreateCashCountInterface) {
        try {
            
            // Verificar que la caja existe y pertenece al negocio
            const cashRegister = await prisma.cashRegister.findFirst({
                where: { 
                    id: data.cashRegisterId,
                    businessId: businessId
                }
            });

            if (!cashRegister) {
                return {
                    message: 'Caja no encontrada o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            // Verificar que la tasa de cambio existe y pertenece al negocio
            const exchangeRate = await prisma.exchangeRate.findFirst({
                where: { 
                    id: data.exchangeRateId
                }
            });

            if (!exchangeRate) {
                return {
                    message: 'Tasa de cambio no encontrada o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            const cashCount = await prisma.cashCount.create({
                data: {
                    cashRegisterId: data.cashRegisterId,
                    denomination: data.denomination,
                    quantity: data.quantity,
                    currency: data.currency,
                    exchangeRateId: data.exchangeRateId,
                    type: data.type
                },
                include: {
                    cashRegister: {
                        select: {
                            id: true,
                            status: true
                        }
                    },
                    exchangeRate: {
                        select: {
                            id: true,
                            // currency: true,
                            rate: true
                        }
                    }
                }
            });

            if (!cashCount) {
                return {
                    message: 'No se pudo crear el conteo de caja',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Conteo de caja creado exitosamente',
                status: 201,
                data: cashCount
            };

        } catch (error) {

            console.error('Error al crear el conteo de caja:', error);

            return {
                message: 'Error al crear el conteo de caja',
                status: 500,
                data: null
            };

        }
    }

    // 2. LISTAR TODOS (de una caja)
    async findByCashRegister(businessId: number, cashRegisterId: number) {
        try {

            // Verificar que la caja pertenece al negocio
            const cashRegister = await prisma.cashRegister.findFirst({
                where: { 
                    id: cashRegisterId,
                    businessId: businessId
                }
            });

            if (!cashRegister) {
                return {
                    message: 'Caja no encontrada o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            const cashCounts = await prisma.cashCount.findMany({
                where: {
                    cashRegisterId: cashRegisterId
                },
                include: {
                    exchangeRate: {
                        select: {
                            id: true,
                            // currency: true,
                            rate: true
                        }
                    }
                },
                orderBy: [
                    { type: 'asc' },
                    { denomination: 'desc' }
                ]
            });

            if (cashCounts.length === 0) {
                return {
                    message: 'No hay conteos de caja registrados',
                    status: 404,
                    data: []
                };
            }

            return {
                message: 'Conteos de caja obtenidos exitosamente',
                status: 200,
                data: cashCounts
            };

        } catch (error) {

            console.error('Error al obtener los conteos de caja:', error);

            return {
                message: 'Error al obtener los conteos de caja',
                status: 500,
                data: null
            };
        }
    }

    // 3. BUSCAR UNO
    async findOne(businessId: number, id: number) {
        try {
            const cashCount = await prisma.cashCount.findFirst({
                where: { 
                    id,
                    cashRegister: {
                        businessId: businessId
                    }
                },
                include: {
                    cashRegister: {
                        select: {
                            id: true,
                            status: true
                        }
                    },
                    exchangeRate: {
                        select: {
                            id: true,
                            //currency: true,
                            rate: true
                        }
                    }
                }
            });

            if (!cashCount) {
                return {
                    message: 'Conteo de caja no encontrado',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Conteo de caja obtenido exitosamente',
                status: 200,
                data: cashCount
            };

         } catch (error) {

            console.error('Error al obtener el conteo de caja:', error);

            return {
                message: 'Error al obtener el conteo de caja',
                status: 500,
                data: null
            };
        }
    }

    // 4. ACTUALIZAR
    async update(businessId: number, id: number, data: UpdateCashCountInterface) {

        try {

            // Verificar que el conteo pertenece a una caja del negocio
            const existingCount = await prisma.cashCount.findFirst({
                where: { 
                    id,
                    cashRegister: {
                        businessId: businessId
                    }
                }
            });

            if (!existingCount) {
                return {
                    message: 'Conteo de caja no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            // Si se actualiza exchangeRateId, verificar que existe
            if (data.exchangeRateId) {
                const exchangeRate = await prisma.exchangeRate.findFirst({
                    where: { 
                        id: data.exchangeRateId
                    }
                });

                if (!exchangeRate) {
                    return {
                        message: 'Tasa de cambio no encontrada o no pertenece a este negocio',
                        status: 404,
                        data: null
                    };
                }
            }

            const updatedCashCount = await prisma.cashCount.update({
                where: { id },
                data: data,
                include: {
                    cashRegister: {
                        select: {
                            id: true,
                            status: true
                        }
                    },
                    exchangeRate: {
                        select: {
                            id: true,
                            //currency: true,
                            rate: true
                        }
                    }
                }
            });

            if (!updatedCashCount) {
                return {
                    message: 'No se pudo actualizar el conteo de caja',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Conteo de caja actualizado exitosamente',
                status: 200,
                data: updatedCashCount
            };

        } catch (error) {

            console.error('Error al actualizar el conteo de caja:', error);
            
            return {
                message: 'Error al actualizar el conteo de caja',
                status: 500,
                data: null
            };
        }
    }

    // 5. ELIMINAR
    async remove(businessId: number, id: number) {
        try {

            const cashCount = await prisma.cashCount.findFirst({
                where: { 
                    id,
                    cashRegister: {
                        businessId: businessId
                    }
                }
            });
            
            if (!cashCount) {
                return {
                    message: 'Conteo de caja no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            await prisma.cashCount.delete({
                where: { id }
            });

            return {
                message: 'Conteo de caja eliminado exitosamente',
                status: 200,
                data: null
            };

        } catch (error) {

            console.error('Error al eliminar el conteo de caja:', error);

            return {
                message: 'Error al eliminar el conteo de caja',
                status: 500,
                data: null
            };
        }
    }
}
