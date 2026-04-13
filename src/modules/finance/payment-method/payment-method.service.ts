import { prisma } from '@/configs';
import { CreatePaymentMethodInterface, UpdatePaymentMethodInterface } from './interfaces';

export class PaymentMethodService {

    // 1. CREAR
    async create(data: CreatePaymentMethodInterface) {
        try {
            
            // Verificar que el nombre no exista
            const existing = await prisma.paymentMethod.findUnique({
                where: { name: data.name }
            });

            if (existing) {
                return {
                    message: 'Ya existe un método de pago con ese nombre',
                    status: 400,
                    data: null
                };
            }

            const paymentMethod = await prisma.paymentMethod.create({
                data: {
                    name: data.name,
                    currency: data.currency,
                    type: data.type,
                    isActive: data.isActive !== undefined ? data.isActive : true
                }
            });

            if (!paymentMethod) {
                return {
                    message: 'No se pudo crear el método de pago',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Método de pago creado exitosamente',
                status: 201,
                data: paymentMethod
            };

        } catch (error) {

            console.error('Error al crear el método de pago:', error);

            return {
                message: 'Error al crear el método de pago',
                status: 500,
                data: null
            };

        }
    }

    // 2. LISTAR TODOS
    async findAll() {
        try {

            const paymentMethods = await prisma.paymentMethod.findMany({
                orderBy: {
                    name: 'asc'
                }
            });

            if (paymentMethods.length === 0) {
                return {
                    message: 'No hay métodos de pago registrados',
                    status: 200,
                    data: []
                };
            }

            return {
                message: 'Métodos de pago obtenidos exitosamente',
                status: 200,
                data: paymentMethods
            };

        } catch (error) {

            console.error('Error al obtener los métodos de pago:', error);

            return {
                message: 'Error al obtener los métodos de pago',
                status: 500,
                data: null
            };
        }
    }

    // 3. LISTAR SOLO ACTIVOS
    async findActive() {
        try {

            const paymentMethods = await prisma.paymentMethod.findMany({
                where: {
                    isActive: true
                },
                orderBy: {
                    name: 'asc'
                }
            });

            return {
                message: 'Métodos de pago activos obtenidos exitosamente',
                status: 200,
                data: paymentMethods
            };

         } catch (error) {

            console.error('Error al obtener los métodos de pago activos:', error);

            return {
                message: 'Error al obtener los métodos de pago activos',
                status: 500,
                data: null
            };
        }
    }

    // 4. BUSCAR UNO
    async findOne(id: number) {
        try {
            const paymentMethod = await prisma.paymentMethod.findUnique({
                where: { id }
            });

            if (!paymentMethod) {
                return {
                    message: 'Método de pago no encontrado',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Método de pago obtenido exitosamente',
                status: 200,
                data: paymentMethod
            };

         } catch (error) {

            console.error('Error al obtener el método de pago:', error);

            return {
                message: 'Error al obtener el método de pago',
                status: 500,
                data: null
            };
        }
    }

    // 5. ACTUALIZAR
    async update(id: number, data: UpdatePaymentMethodInterface) {

        try {

            const existing = await prisma.paymentMethod.findUnique({
                where: { id }
            });

            if (!existing) {
                return {
                    message: 'Método de pago no encontrado',
                    status: 404,
                    data: null
                };
            }

            const updatedPaymentMethod = await prisma.paymentMethod.update({
                where: { id },
                data: data
            });

            if (!updatedPaymentMethod) {
                return {
                    message: 'No se pudo actualizar el método de pago',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Método de pago actualizado exitosamente',
                status: 200,
                data: updatedPaymentMethod
            };

        } catch (error) {

            console.error('Error al actualizar el método de pago:', error);
            
            return {
                message: 'Error al actualizar el método de pago',
                status: 500,
                data: null
            };
        }
    }

    // 6. ELIMINAR
    async remove(id: number) {
        try {

            const paymentMethod = await prisma.paymentMethod.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: {
                            salePayments: true,
                            purchasePayments: true,
                            creditNotePayments: true
                        }
                    }
                }
            });
            
            if (!paymentMethod) {
                return {
                    message: 'Método de pago no encontrado',
                    status: 404,
                    data: null
                };
            }

            // Verificar si hay pagos asociados
            const totalPayments = 
                paymentMethod._count.salePayments +
                paymentMethod._count.purchasePayments +
                paymentMethod._count.creditNotePayments;

            if (totalPayments > 0) {
                return {
                    message: `No se puede eliminar el método de pago porque tiene ${totalPayments} pago(s) asociado(s). Se recomienda desactivarlo en su lugar.`,
                    status: 400,
                    data: null
                };
            }

            await prisma.paymentMethod.delete({
                where: { id }
            });

            return {
                message: 'Método de pago eliminado exitosamente',
                status: 200,
                data: null
            };

        } catch (error) {

            console.error('Error al eliminar el método de pago:', error);

            return {
                message: 'Error al eliminar el método de pago',
                status: 500,
                data: null
            };
        }
    }
}
