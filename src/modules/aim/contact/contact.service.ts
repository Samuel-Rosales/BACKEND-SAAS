import { prisma } from '@/configs';
import { CreateContactInterface, UpdateContactInterface } from './interfaces';

export class ContactService {

    // 1. CREAR
    async create(data: CreateContactInterface) {
        try {
            
            // Verificar que el usuario existe
            const user = await prisma.user.findUnique({
                where: { id: data.userId }
            });

            if (!user) {
                return {
                    message: 'Usuario no encontrado',
                    status: 404,
                    data: null
                };
            }

            // Verificar que el usuario no tenga ya un contacto (relación 1:1)
            const existingContact = await prisma.userContact.findUnique({
                where: { userId: data.userId }
            });

            if (existingContact) {
                return {
                    message: 'El usuario ya tiene información de contacto registrada',
                    status: 400,
                    data: null
                };
            }

            // Verificar que el email no esté en uso por otro usuario
            const emailExists = await prisma.userContact.findUnique({
                where: { email: data.email }
            });

            if (emailExists) {
                return {
                    message: 'El email ya está registrado para otro usuario',
                    status: 400,
                    data: null
                };
            }

            const contact = await prisma.userContact.create({
                data: {
                    userId: data.userId,
                    email: data.email,
                    phone: data.phone,
                    address: data.address,
                    city: data.city,
                    state: data.state
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            ci: true
                        }
                    }
                }
            });

            if (!contact) {
                return {
                    message: 'No se pudo crear el contacto',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Contacto creado exitosamente',
                status: 201,
                data: contact
            };

        } catch (error) {

            console.error('Error al crear el contacto:', error);

            return {
                message: 'Error al crear el contacto',
                status: 500,
                data: null
            };

        }
    }

    // 2. LISTAR TODOS
    async findAll() {
        try {

            const contacts = await prisma.userContact.findMany({
                orderBy: { id: 'asc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            ci: true
                        }
                    }
                }
            });

            if (contacts.length === 0) {
                return {
                    message: 'No hay contactos disponibles',
                    status: 404,
                    data: []
                };
            }

            return {
                message: 'Contactos obtenidos exitosamente',
                status: 200,
                data: contacts
            };

        } catch (error) {

            console.error('Error al obtener los contactos:', error);

            return {
                message: 'Error al obtener los contactos',
                status: 500,
                data: null
            };
        }
    }

    // 3. BUSCAR UNO
    async findOne(id: number) {
        try {
            const contact = await prisma.userContact.findUnique({
                where: { id },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            ci: true
                        }
                    }
                }
            });

            if (!contact) {
                return {
                    message: 'Contacto no encontrado',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Contacto obtenido exitosamente',
                status: 200,
                data: contact
            };

         } catch (error) {

            console.error('Error al obtener el contacto:', error);

            return {
                message: 'Error al obtener el contacto',
                status: 500,
                data: null
            };
        }
    }

    // 4. BUSCAR POR USER ID
    async findByUserId(userId: number) {
        try {
            const contact = await prisma.userContact.findUnique({
                where: { userId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            ci: true
                        }
                    }
                }
            });

            if (!contact) {
                return {
                    message: 'Contacto no encontrado para este usuario',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Contacto obtenido exitosamente',
                status: 200,
                data: contact
            };

         } catch (error) {

            console.error('Error al obtener el contacto:', error);

            return {
                message: 'Error al obtener el contacto',
                status: 500,
                data: null
            };
        }
    }

    // 5. ACTUALIZAR
    async update(id: number, data: UpdateContactInterface) {

        try {

            // Si se intenta actualizar el email, verificar que no esté en uso
            if (data.email) {
                const existingContact = await prisma.userContact.findFirst({
                    where: {
                        email: data.email,
                        NOT: { id: id }
                    }
                });

                if (existingContact) {
                    return {
                        message: 'El email ya está registrado para otro usuario',
                        status: 400,
                        data: null
                    };
                }
            }

            // Si se intenta actualizar el userId, verificar que no tenga ya contacto
            if (data.userId) {
                const existingContact = await prisma.userContact.findFirst({
                    where: {
                        userId: data.userId,
                        NOT: { id: id }
                    }
                });

                if (existingContact) {
                    return {
                        message: 'El usuario ya tiene información de contacto registrada',
                        status: 400,
                        data: null
                    };
                }
            }

            const updatedContact = await prisma.userContact.update({
                where: { id },
                data: data,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            ci: true
                        }
                    }
                }
            });

            if (!updatedContact) {
                return {
                    message: 'No se pudo actualizar el contacto',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Contacto actualizado exitosamente',
                status: 200,
                data: updatedContact
            };

        } catch (error) {

            console.error('Error al actualizar el contacto:', error);
            
            return {
                message: 'Error al actualizar el contacto',
                status: 500,
                data: null
            };
        }
    }

    // 6. ELIMINAR
    async remove(id: number) {
        try {

            const contact = await prisma.userContact.findUnique({
                where: { id }
            });
            
            if (!contact) {
                return {
                    message: 'Contacto no encontrado',
                    status: 404,
                    data: null
                };
            }

            await prisma.userContact.delete({
                where: { id }
            });

            return {
                message: 'Contacto eliminado exitosamente',
                status: 200,
                data: null
            };

        } catch (error) {

            console.error('Error al eliminar el contacto:', error);

            return {
                message: 'Error al eliminar el contacto',
                status: 500,
                data: null
            };
        }
    }
}
