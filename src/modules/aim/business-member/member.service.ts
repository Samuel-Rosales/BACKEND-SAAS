import { prisma } from '@/configs';
import { AddMemberInterface, UpdateMemberInterface } from './interfaces/index';
import bcrypt from 'bcryptjs';

export class MemberService {

    // "BUSCAR O CREAR" Y VINCULAR
    async addMember(businessId: number, data: AddMemberInterface) {

        return await prisma.$transaction(async (tx) => {

            try {

                const business = await tx.business.findUnique({
                    where: { id: businessId }
                });
        
                if (!business) {
                    return {
                        message: `Negocio no encontrado`,
                        status: 404,
                        data: null
                    };
                }
            
                // 1. Verificar si el usuario YA existe globalmente (por Email o Cédula)
                let user = await tx.user.findUnique({
                    where: {
                        ci: data.ci,
                    },
                });

                // 2. Si NO existe, lo creamos
                if (!user) {
                    // Generamos su contraseña inicial basada en su Cédula
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(data.ci, salt); // Password = Cédula

                    user = await tx.user.create({
                        data: {
                            ci: data.ci,
                            name: data.name,
                            password: hashedPassword // Se guarda encriptada
                        }
                    });

                    if (!user) {
                        return {
                            message: `Error al crear el usuario`,
                            status: 400,
                            data: null
                        };
                    }

                }

                // 3. Ahora que tenemos al usuario (nuevo o viejo), verificamos si ya trabaja aquí
                const existingMember = await tx.businessMember.findFirst({
                    where: {
                    businessId: businessId,
                    userId: user.id
                    }
                });

                if (existingMember) {
                    return {
                        message: `El usuario ${user.name} ya es parte de tu equipo.`,
                        status: 400,
                        data: null
                    };
                }

                // 4. Crear la vinculación (BusinessMember)
                const newMember = await tx.businessMember.create({
                    data: {
                        businessId: businessId,
                        userId: user.id,
                        roleId: data.roleId,
                        isActive: true
                    },
                    include: {
                        user: { 
                            select: { 
                                id: true, 
                                name: true, 
                                ci: true 
                            } 
                        },
                        role: true
                    }
                });

                if (!newMember) {
                    return {
                        message: `Error al crear el miembro`,
                        status: 400,
                        data: null
                    };
                }

                return {
                    data: newMember,
                    message: `Miembro creado exitosamente`,
                    status: 201,
                };

            } catch (error) {

                console.error("Error al crear el miembro:", error);

                return {
                    message: `Por favor contacte al administrador`,
                    status: 500,
                    data: null
                };
            }
        });
    }

    // 2. LISTAR EMPLEADOS (Solo de mi empresa)
    async findAll(businessId: number) {
        try {

            const members = await prisma.businessMember.findMany({
                where: { businessId: businessId }, // <--- FILTRO CRÍTICO
                include: {
                    user: { 
                        select: { id: true, name: true, ci: true } 
                    },
                    role: { select: { code: true, name: true } }
                },
                orderBy: { joinedAt: 'desc' }
            });

            const onlyEmployees = members.filter(member => member.role.code !== 'OWNER');

            if (onlyEmployees.length === 0) {
                return {
                    message: `No hay miembros registrados`,
                    status: 404,
                    data: null
                };
            }

            return {
                message: `Miembros obtenidos exitosamente`,
                status: 200,
                data: onlyEmployees
            };

        } catch (error) {

            console.error("Error al obtener los miembros:", error);

            return {
                message: `Por favor contacte al administrador`,
                status: 500,
                data: null
            };
        }
    }

    // 3. OBTENER UN EMPLEADO
    async findOne(businessId: number, memberId: number) {
        try {

            const member = await prisma.businessMember.findFirst({
                where: { 
                    id: memberId,
                    businessId: businessId // <--- Seguridad: Que pertenezca a mi empresa
                },
                include: {
                    user: { select: { id: true, name: true, ci: true } },
                    role: { select: { code: true, name: true } }
                }
            });

            if (!member) {
                return {
                    message: `Empleado no encontrado.`,
                    status: 404,
                    data: null
                };
            }

            return {
                message: `Empleado obtenido exitosamente`,
                status: 200,
                data: member
            };

        } catch (error) {
            console.error("Error al obtener el empleado:", error);

            return {
                message: `Error al obtener el empleado`,
                status: 500,
                data: null
            };
        }
    }
    
    // 4. ACTUALIZAR (Cambiar rol o Desactivar)
    async update(businessId: number, memberId: number, data: UpdateMemberInterface) {

        try {

            const updatedMember = await prisma.businessMember.update({
                where: { 
                    id: memberId,
                    businessId: businessId // Seguridad: solo actualiza si pertenece al negocio
                },
                data: data
            });
            if (!updatedMember) {
                return {
                    message: `No se pudo actualizar el miembro`,
                    status: 400,
                    data: null
                };
            }
    
            // Luego hacer un findUnique para retornar los datos completos
            const member = await prisma.businessMember.findUnique({
                where: { id: memberId },
                include: { role: true, user: true }
            });
    
            return {
                message: `Miembro actualizado exitosamente`,
                status: 200,
                data: member
            };

        } catch (error) {

            console.error("Error al actualizar el miembro:", error);

            return {
                message: `Error al actualizar el miembro`,
                status: 500,
                data: null
            };
        }
    }

    // 5. ELIMINAR (Quitar acceso totalmente)
    async remove(businessId: number, memberId: number) {

        const { data, message, status } = await this.findOne(businessId, memberId);

        if (!data) {
            return {
                message: message,
                status: status,
                data: null
            };
        }
        
        try {
            const deletedMember = await prisma.businessMember.delete({
                where: { id: memberId }
            });

            if (!deletedMember) {
                return {
                    message: `No se pudo eliminar el miembro`,
                    status: 400,
                    data: null
                };
            }

            return {
                message: `Miembro eliminado exitosamente`,
                status: 200,
                data: deletedMember
            };

        } catch (error) {
            console.error("Error al eliminar el miembro:", error);

            return {
                message: `Error al eliminar el miembro`,
                status: 500,
                data: null
            };
        }
    }
}
