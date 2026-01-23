import { prisma } from '@/configs';
import { CreateCashRegisterInterface, UpdateCashRegisterInterface } from './interfaces';

export class CashRegisterService {

    // 1. ABRIR CAJA
    async open(businessId: number, data: CreateCashRegisterInterface) {
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

            // Verificar que el miembro existe y pertenece al negocio
            const member = await prisma.businessMember.findFirst({
                where: { 
                    id: data.memberId,
                    businessId: businessId,
                    isActive: true
                }
            });

            if (!member) {
                return {
                    message: 'Miembro no encontrado, no pertenece a este negocio o está inactivo',
                    status: 404,
                    data: null
                };
            }

            // Verificar si ya hay una caja abierta para este negocio
            const openRegister = await prisma.cashRegister.findFirst({
                where: {
                    businessId: businessId,
                    status: 'OPEN'
                }
            });

            if (openRegister) {
                return {
                    message: 'Ya existe una caja abierta para este negocio. Debe cerrarla antes de abrir una nueva.',
                    status: 400,
                    data: null
                };
            }

            const cashRegister = await prisma.cashRegister.create({
                data: {
                    businessId: businessId,
                    memberId: data.memberId,
                    status: 'OPEN',
                    initialAmount: data.initialAmount || 0
                },
                include: {
                    member: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            });

            if (!cashRegister) {
                return {
                    message: 'No se pudo abrir la caja',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Caja abierta exitosamente',
                status: 201,
                data: cashRegister
            };

        } catch (error) {

            console.error('Error al abrir la caja:', error);

            return {
                message: 'Error al abrir la caja',
                status: 500,
                data: null
            };

        }
    }

    // 2. LISTAR TODAS LAS CAJAS (de un negocio)
    async findAll(businessId: number) {
        try {

            const cashRegisters = await prisma.cashRegister.findMany({
                where: {
                    businessId: businessId
                },
                include: {
                    member: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    },
                    _count: {
                        select: {
                            counts: true
                        }
                    }
                },
                orderBy: {
                    openTime: 'desc'
                }
            });

            if (cashRegisters.length === 0) {
                return {
                    message: 'No hay cajas registradas',
                    status: 404,
                    data: []
                };
            }

            return {
                message: 'Cajas obtenidas exitosamente',
                status: 200,
                data: cashRegisters
            };

        } catch (error) {

            console.error('Error al obtener las cajas:', error);

            return {
                message: 'Error al obtener las cajas',
                status: 500,
                data: null
            };
        }
    }

    // 3. OBTENER CAJA ABIERTA
    async findOpen(businessId: number) {
        try {
            const cashRegister = await prisma.cashRegister.findFirst({
                where: {
                    businessId: businessId,
                    status: 'OPEN'
                },
                include: {
                    member: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    },
                    counts: {
                        where: {
                            type: 'INITIAL'
                        },
                        include: {
                            exchangeRate: {
                                select: {
                                    id: true,
                                    // currency: true,
                                    rate: true
                                }
                            }
                        }
                    }
                }
            });

            if (!cashRegister) {
                return {
                    message: 'No hay caja abierta',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Caja abierta obtenida exitosamente',
                status: 200,
                data: cashRegister
            };

         } catch (error) {

            console.error('Error al obtener la caja abierta:', error);

            return {
                message: 'Error al obtener la caja abierta',
                status: 500,
                data: null
            };
        }
    }

    // 4. BUSCAR UNA CAJA
    async findOne(businessId: number, id: number) {
        try {
            const cashRegister = await prisma.cashRegister.findFirst({
                where: { 
                    id,
                    businessId: businessId
                },
                include: {
                    member: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    },
                    counts: {
                        include: {
                            exchangeRate: {
                                select: {
                                    id: true,
                                    // currency: true,
                                    rate: true
                                }
                            }
                        },
                        orderBy: {
                            type: 'asc'
                        }
                    }
                }
            });

            if (!cashRegister) {
                return {
                    message: 'Caja no encontrada',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Caja obtenida exitosamente',
                status: 200,
                data: cashRegister
            };

         } catch (error) {

            console.error('Error al obtener la caja:', error);

            return {
                message: 'Error al obtener la caja',
                status: 500,
                data: null
            };
        }
    }

    // 5. CERRAR CAJA
    async close(businessId: number, id: number, data: UpdateCashRegisterInterface) {

        try {

            const cashRegister = await prisma.cashRegister.findFirst({
                where: { 
                    id,
                    businessId: businessId,
                    status: 'OPEN'
                }
            });

            if (!cashRegister) {
                return {
                    message: 'Caja no encontrada o ya está cerrada',
                    status: 404,
                    data: null
                };
            }

            const updatedCashRegister = await prisma.cashRegister.update({
                where: { id },
                data: {
                    status: 'CLOSED',
                    finalAmount: data.finalAmount,
                    closeTime: data.closeTime || new Date()
                },
                include: {
                    member: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    },
                    counts: {
                        include: {
                            exchangeRate: {
                                select: {
                                    id: true,
                                    // currency: true,
                                    rate: true
                                }
                            }
                        }
                    }
                }
            });

            if (!updatedCashRegister) {
                return {
                    message: 'No se pudo cerrar la caja',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Caja cerrada exitosamente',
                status: 200,
                data: updatedCashRegister
            };

        } catch (error) {

            console.error('Error al cerrar la caja:', error);
            
            return {
                message: 'Error al cerrar la caja',
                status: 500,
                data: null
            };
        }
    }
}
