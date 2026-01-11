import { prisma } from '@/configs';
import { AuthInterface } from './interface/auth.interface';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/utils/jwt.util';

export class AuthService {

    async login(data: AuthInterface) {
        try {
            // 1. Buscar usuario por email
            const user = await prisma.user.findUnique({
            where: { ci: data.ci },
            include: {
                // Incluimos las membresías para que el frontend sepa 
                // a qué empresas puede entrar este usuario
                memberships: {
                where: { isActive: true },
                include: { 
                    business: { select: { id: true, name: true, logoUrl: true } },
                    role: { select: { code: true, name: true } }
                }
                }
            }
            });

            if (!user) {
                throw new Error('Credenciales inválidas'); // No digas "usuario no existe" por seguridad
            }

            // 2. Comparar contraseñas (Hash vs Texto plano)
            const isMatch = await bcrypt.compare(data.password, user.password);

            if (!isMatch) {
                throw new Error('Credenciales inválidas, contraseña incorrecta');
            }

            // 3. Generar Token
            // Guardamos el ID del usuario en el token.
            // OJO: No guardamos el businessId todavía, porque el usuario debe ELEGIR a qué empresa entrar.
            const token = generateToken({ id: user.id, ci: user.ci });

            // 4. Retornar datos (Excluyendo contraseña)
            const { password, ...userWithoutPass } = user;

            return {
                status: 200,
                message: 'Inicio de sesión exitoso',
                data: {
                    user: userWithoutPass,
                    token,
                    // El frontend usará esto para mostrar: "¿A qué empresa quieres entrar hoy?"
                    availableBusinesses: user.memberships.map(m => ({
                        businessId: m.businessId,
                        businessName: m.business.name,
                        role: m.role.name,
                        roleCode: m.role.code
                    }))
                }
            };
        } catch (error) {
            console.error(error);

            return {
                status: 500,
                message: 'Error al iniciar sesión',
                data: null
            };
        }
    }
}