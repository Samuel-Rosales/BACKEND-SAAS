import { prisma } from '@/configs';
import { CreateRoleDto, UpdateRoleDto } from './interfaces';

export class RoleService {

    // 1. CREAR
    async create(data: CreateRoleDto) {
        try {
            
            const role = await prisma.role.create({
                data: {
                    name: data.name,
                    code: data.code
                }
            });

            if (!role) {
                return {
                    message: 'No se pudo crear el rol',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Rol creado exitosamente',
                status: 201,
                data: role
            };

        } catch (error) {

            console.error('Error al crear el rol:', error);

            return {
                message: 'Error al crear el rol',
                status: 500,
                data: null
            };

        }
    }

    // 2. LISTAR TODOS
    async findAll() {
        try {

            const roles = await prisma.role.findMany({
                where: { code: { not: 'OWNER' } },
                orderBy: { id: 'asc' }
            });

            if (roles.length === 0) {
                return {
                    message: 'No hay roles disponibles',
                    status: 404,
                    data: []
                };
            }

            return {
                message: 'Roles obtenidos exitosamente',
                status: 200,
                data: roles
            };

        } catch (error) {

            console.error('Error al obtener los roles:', error);

            return {
                message: 'Error al obtener los roles',
                status: 500,
                data: null
            };
        }
    }

    // 3. BUSCAR UNO
    async findOne(id: number) {
        try {
            const role = await prisma.role.findUnique({
                where: { id }
            });

            if (!role) {
                return {
                    message: 'Rol no encontrado',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Rol obtenido exitosamente',
                status: 200,
                data: role
            };

         } catch (error) {

            console.error('Error al obtener el rol:', error);

            return {
                message: 'Error al obtener el rol',
                status: 500,
                data: null
            };
        }
    }

    // 4. ACTUALIZAR
    async update(id: number, data: UpdateRoleDto) {

        try {

            const updatedRole = await prisma.role.update({
                where: { id },
                data: data
            });

            if (!updatedRole) {
                return {
                    message: 'No se pudo actualizar el rol',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Rol actualizado exitosamente',
                status: 200,
                data: updatedRole
            };

        } catch (error) {

            console.error('Error al actualizar el rol:', error);
            
            return {
                message: 'Error al actualizar el rol',
                status: 500,
                data: null
            };
        }
    }

    // 5. ELIMINAR (Con protección de integridad)
    async remove(id: number) {
        try {

            const role = await prisma.role.findUnique({
                where: { id }
            });
            
            if (!role) {
                return {
                    message: 'Rol no encontrado',
                    status: 404,
                    data: null
                };
            }

            await prisma.role.delete({
                where: { id }
            });

            return {
                message: 'Rol eliminado exitosamente',
                status: 200,
                data: null
            };

        } catch (error) {

            console.error('Error al eliminar el rol:', error);

            return {
                message: 'Error al eliminar el rol',
                status: 500,
                data: null
            };
        }
    }
}