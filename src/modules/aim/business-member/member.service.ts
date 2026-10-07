import { prisma } from '@/configs';
import { AddMemberInterface, UpdateMemberInterface } from './interfaces/index';
import bcrypt from 'bcryptjs';

export class MemberService {

    async addMember(businessId: number, data: AddMemberInterface) {
        return await prisma.$transaction(async (tx) => {
            try {
                const business = await tx.business.findUnique({ where: { id: businessId } });

                if (!business) {
                    return { message: 'Negocio no encontrado', status: 404, data: null };
                }

                let user = await tx.user.findUnique({ where: { ci: data.ci } });

                if (!user) {
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(data.ci, salt);

                    user = await tx.user.create({
                        data: {
                            ci: data.ci,
                            name: data.name,
                            password: hashedPassword
                        }
                    });
                }

                if (!user) {
                    return { message: 'Error al crear el usuario', status: 400, data: null };
                }

                const existingMember = await tx.businessMember.findFirst({
                    where: { businessId, userId: user.id }
                });

                if (existingMember) {
                    return {
                        message: `El usuario ${user.name} ya es parte de tu equipo.`,
                        status: 400,
                        data: null
                    };
                }

                // Validación de Plan PREMIUM para comisiones
                let commissionValue = 0;
                if (data.commissionPercentage && Number(data.commissionPercentage) > 0) {
                    const subscription = await tx.subscription.findUnique({
                        where: { businessId },
                        include: { plan: true }
                    });
                    const isPremiumOrEnterprise = subscription && (
                        subscription.planType === 'PREMIUM' ||
                        subscription.planType === 'ENTERPRISE' ||
                        subscription.plan?.name?.toUpperCase().includes('PREMIUM') ||
                        subscription.plan?.name?.toUpperCase().includes('ENTERPRISE')
                    );
                    if (!isPremiumOrEnterprise) {
                        return {
                            status: 403,
                            message: 'La asignación de comisiones de venta es una función exclusiva del Plan PREMIUM.',
                            data: null
                        };
                    }
                    commissionValue = Number(data.commissionPercentage);
                }

                const newMember = await tx.businessMember.create({
                    data: {
                        businessId,
                        userId: user.id,
                        roleId: data.roleId,
                        isActive: true,
                        commissionPercentage: commissionValue
                    },
                    include: {
                        user: { select: { id: true, name: true, ci: true } },
                        role: true
                    }
                });

                return {
                    data: newMember,
                    message: 'Miembro creado exitosamente',
                    status: 201,
                };
            } catch (error) {
                console.error('Error al crear el miembro:', error);
                return { message: 'Por favor contacte al administrador', status: 500, data: null };
            }
        });
    }

    async findAll(businessId: number, query?: { page?: number, limit?: number }) {
        try {
            const page = Number(query?.page) || 1;
            const limit = Number(query?.limit) || 20;
            const skip = (page - 1) * limit;

            const members = await prisma.businessMember.findMany({
                where: { businessId },
                include: {
                    user: { select: { id: true, name: true, ci: true } },
                    role: { select: { code: true, name: true } }
                },
                orderBy: { joinedAt: 'desc' }
            });

            const onlyEmployees = members.filter(member => member.role.code !== 'OWNER');
            const paginatedEmployees = onlyEmployees.slice(skip, skip + limit);

            if (onlyEmployees.length === 0) {
                return {
                    message: 'No hay empleados registrados',
                    status: 404,
                    data: null,
                    pagination: { page, limit, total: 0, totalPages: 0 }
                };
            }

            return {
                message: 'Miembros obtenidos exitosamente',
                status: 200,
                data: paginatedEmployees,
                pagination: {
                    page,
                    limit,
                    total: onlyEmployees.length,
                    totalPages: Math.ceil(onlyEmployees.length / limit)
                }
            };
        } catch (error) {
            console.error('Error al obtener los miembros:', error);
            return { message: 'Por favor contacte al administrador', status: 500, data: null };
        }
    }

    async findOne(businessId: number, memberId: number) {
        try {
            const member = await prisma.businessMember.findFirst({
                where: { id: memberId, businessId },
                include: {
                    user: { select: { id: true, name: true, ci: true } },
                    role: { select: { code: true, name: true } }
                }
            });

            if (!member) {
                return { message: 'Empleado no encontrado.', status: 404, data: null };
            }

            return { message: 'Empleado obtenido exitosamente', status: 200, data: member };
        } catch (error) {
            console.error('Error al obtener el empleado:', error);
            return { message: 'Error al obtener el empleado', status: 500, data: null };
        }
    }

    async update(businessId: number, memberId: number, data: UpdateMemberInterface) {
        try {
            if (data.commissionPercentage !== undefined && Number(data.commissionPercentage) > 0) {
                const subscription = await prisma.subscription.findUnique({
                    where: { businessId },
                    include: { plan: true }
                });
                const isPremiumOrEnterprise = subscription && (
                    subscription.planType === 'PREMIUM' ||
                    subscription.planType === 'ENTERPRISE' ||
                    subscription.plan?.name?.toUpperCase().includes('PREMIUM') ||
                    subscription.plan?.name?.toUpperCase().includes('ENTERPRISE')
                );
                if (!isPremiumOrEnterprise) {
                    return {
                        status: 403,
                        message: 'La asignación de comisiones de venta es una función exclusiva del Plan PREMIUM.',
                        data: null
                    };
                }
            }

            const updatedMember = await prisma.businessMember.update({
                where: { id: memberId, businessId },
                data
            });

            const member = await prisma.businessMember.findUnique({
                where: { id: memberId },
                include: { role: true, user: true }
            });

            return {
                message: 'Miembro actualizado exitosamente',
                status: 200,
                data: member ?? updatedMember
            };
        } catch (error) {
            console.error('Error al actualizar el miembro:', error);
            return { message: 'Error al actualizar el miembro', status: 500, data: null };
        }
    }

    async remove(businessId: number, memberId: number) {
        const { data, message, status } = await this.findOne(businessId, memberId);

        if (!data) {
            return { message, status, data: null };
        }

        try {
            // Soft-delete: desactivar en lugar de eliminar físicamente
            // así se mantiene el historial de transacciones en CashRegister
            const deactivatedMember = await prisma.businessMember.update({
                where: { id: memberId },
                data: { isActive: false }
            });
            return { message: 'Miembro eliminado exitosamente', status: 200, data: deactivatedMember };
        } catch (error) {
            console.error('Error al eliminar el miembro:', error);
            return { message: 'Error al eliminar el miembro', status: 500, data: null };
        }
    }
}
