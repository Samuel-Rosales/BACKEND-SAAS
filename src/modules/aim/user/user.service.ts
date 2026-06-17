import { prisma } from '@/configs';
import { CreateUserInterface, UpdateUserInterface } from './interfaces';
import bcrypt from 'bcryptjs';

export class UserService {
    
    async findAll() {
        try {
    
            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    name: true,
                    ci: true,
                }
            });

            if (!users) {
                return {
                    message: `No se encontraron usuarios`,
                    status: 404,
                    data: null
                };
            }

            if (users.length === 0) {
                return {
                    message: `No hay usuarios registrados`,
                    status: 404,
                    data: null
                };
            }
    
            return {
                message: `Usuarios obtenidos exitosamente`,
                status: 200,
                data: users
            };

        } catch (error) {
            console.error(error);
            return {
                message: `Por favor contacte al administrador`,
                status: 500,
                data: null
            };
        }
    }

    async create(data: CreateUserInterface) {
        try {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword: string = await bcrypt.hash(data.password, salt);

            const user = await prisma.$transaction(async (tx) => {
                const newUser = await tx.user.create({
                    data: {
                        ci: data.ci,
                        name: data.name,
                        password: hashedPassword,
                    },
                    select: {
                        id: true,
                        name: true,
                        ci: true,
                    },
                });

                await tx.userContact.create({
                    data: {
                        userId: newUser.id,
                        email: data.email,
                        phone: data.phone,
                        address: '',
                        city: '',
                        state: '',
                    },
                });

                return newUser;
            });

            if (!user) {
                return {
                    message: `Error al crear el usuario`,
                    status: 400,
                    data: null
                };
            }

            return {
                message: `Usuario creado exitosamente`,
                status: 201,
                data: user
            };

        } catch (error) {
            console.error(error);
            return {
                message: `Por favor contacte al administrador`,
                status: 500,
                data: null
            };
        }
    }

    async findOne(id: number) {
        try {

            const user = await prisma.user.findUnique({
                where: { id },
                select: {
                    id: true,
                    name: true,
                    memberships: true,
                    contacts: true,
                }
            });

            if (!user) {
                return {
                    message: `Usuario no encontrado`,
                    status: 404,
                    data: null
                };
            }

            return {
                message: `Usuario obtenido exitosamente`,
                status: 200,
                data: user
            }

        } catch (error) {
            console.error(error);
            return {
                message: `Por favor contacte al administrador`,
                status: 500,
                data: null
            };
        }
    }

    async update(id: number, data: UpdateUserInterface) {
        try {
            if (data.password) {
                const salt = await bcrypt.genSalt(10);
                data.password = await bcrypt.hash(data.password, salt);
            }
    
            const user = await prisma.user.update({
                where: { id },
                data: data,
                select: { 
                    id: true, 
                    name: true, 
                    contacts: true,
                }
            });

            return {
                message: `Usuario actualizado exitosamente`,
                status: 200,
                data: user
            };
        } catch (error) {
            console.error(error);

            return {
                message: `Por favor contacte al administrador`,
                status: 500,
                data: null
            };
        }
    }

    async remove(id: number) {
        try {

            const user = await prisma.user.findUnique({ where: { id } });

            if (!user) {
                throw new Error('User not found');
            }

            await prisma.user.delete({ where: { id } });

            return {
                message: `Usuario eliminado exitosamente`,
                status: 200,
                data: null
            };
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
