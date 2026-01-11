import { prisma } from '@/configs';
import { AddMemberInterface, UpdateMemberInterface } from './interfaces/index';
import bcrypt from 'bcryptjs';

export class MemberService {

    // "BUSCAR O CREAR" Y VINCULAR
    async addMember(businessId: number, data: AddMemberInterface) {
        try {

            const response = await prisma.$transaction(async (tx) => {
                
                // 1. Verificar si el usuario YA existe globalmente (por Email o Cédula)
                const user = await tx.user.findUnique({
                    where: {
                        ci: data.ci,
                    },
                });

                // 2. Si NO existe, lo creamos
                if (!user) {
                    // Generamos su contraseña inicial basada en su Cédula
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(data.ci, salt); // Password = Cédula

                    const newUser = await tx.user.create({
                        data: {
                            ci: data.ci,
                            name: data.name,
                            password: hashedPassword // Se guarda encriptada
                        }
                    });
                } else {
                    // Opcional: Validar consistencia.
                    // Si encontraste el email, pero la cédula es distinta a la que enviaron, es un error.
                    if (user.ci !== data.ci && user.email === data.email) {
                        throw new Error('El correo ya existe pero pertenece a otra cédula.');
                    }
                    if (user.ci === data.ci && user.email !== data.email) {
                        throw new Error('La cédula ya existe pero tiene otro correo asociado.');
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
                throw new Error(`El usuario ${user.name} ya es parte de tu equipo.`);
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
                user: { select: { id: true, name: true, email: true, ci: true } },
                role: true
                }
            });

            return {
                ...newMember,
                // Mensaje informativo para el frontend
                infoMessage: user.createdAt > new Date(Date.now() - 5000) 
                    ? 'Usuario creado exitosamente. Su contraseña es su número de Cédula.' 
                    : 'Usuario existente agregado a la empresa.'
            };
            });
        } catch (error) {
            console.error(error);
            return {
                message: `Por favor contacte al administrador`,
                status: 500,
                data: null
            };
        }
    }
}