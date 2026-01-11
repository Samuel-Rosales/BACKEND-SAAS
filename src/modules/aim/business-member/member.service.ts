import { prisma } from '@/configs';
import { AddMemberInterface, UpdateMemberInterface } from './interfaces/index';

export class MemberService {

    // 1. AGREGAR MIEMBRO (Invitar)
    async addMember(businessId: number, data: AddMemberInterface) {
        // A. Buscar al usuario por ci
        const user = await prisma.user.findUnique({
            where: { ci: data.ci }
        });

        if (!user) {
            return {
                message: `El usuario con la cédula ${data.ci} no está registrado en el sistema.`,
                status: 400,
                data: null
            };
        }

        // B. Verificar si ya trabaja aquí
        const existingMember = await prisma.businessMember.findFirst({
            where: {
                businessId: businessId,
                userId: user.id
            }
        });

        if (existingMember) {
            throw new Error(`El usuario ${data.email} ya es miembro de esta empresa.`);
        }

        // C. Crear la relación
        return await prisma.businessMember.create({
        data: {
            businessId: businessId,
            userId: user.id,
            roleId: data.roleId,
            isActive: true
        },
        include: {
            user: { select: { name: true, email: true, ci: true } },
            role: true
        }
        });
    }

    // 2. LISTAR EMPLEADOS (Solo de mi empresa)
    async findAll(businessId: number) {
        return await prisma.businessMember.findMany({
        where: { businessId: businessId }, // <--- FILTRO CRÍTICO
        include: {
            user: { 
                select: { id: true, name: true, email: true, phone: true } 
            },
            role: true
        },
        orderBy: { joinedAt: 'desc' }
        });
    }

    // 3. OBTENER UN EMPLEADO
    async findOne(businessId: number, memberId: number) {
        const member = await prisma.businessMember.findFirst({
        where: { 
            id: memberId,
            businessId: businessId // <--- Seguridad: Que pertenezca a mi empresa
        },
        include: {
            user: true,
            role: true
        }
        });

        if (!member) throw new Error('Empleado no encontrado en esta empresa.');
        return member;
    }

    // 4. ACTUALIZAR (Cambiar rol o Desactivar)
    async update(businessId: number, memberId: number, data: UpdateMemberDto) {
        // Verificamos existencia y pertenencia primero
        await this.findOne(businessId, memberId);

        return await prisma.businessMember.update({
        where: { id: memberId },
        data: data,
        include: { role: true }
        });
    }

    // 5. ELIMINAR (Quitar acceso totalmente)
    async remove(businessId: number, memberId: number) {
        await this.findOne(businessId, memberId);
        
        return await prisma.businessMember.delete({
        where: { id: memberId }
        });
    }
}