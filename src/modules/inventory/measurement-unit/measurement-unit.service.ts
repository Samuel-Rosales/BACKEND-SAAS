import { prisma } from '@/configs';
import { CreateMeasurementUnitInterface, UpdateMeasurementUnitInterface } from './interfaces';

export class MeasurementUnitService {

    // 1. CREAR
    async create(data: CreateMeasurementUnitInterface) {
        try {
            // Opcional: evitar duplicados por nombre o símbolo
            const exists = await prisma.measurementUnit.findFirst({
                where: {
                OR: [
                    { name: data.name },
                    { symbol: data.symbol }
                ]
                }
            });

            if (exists) {
                return {
                status: 409,
                message: 'Ya existe una unidad con el mismo nombre o símbolo',
                data: null
                };
            }

            const unit = await prisma.measurementUnit.create({
                data: {
                    name: data.name,
                    symbol: data.symbol,
                    type: data.type,
                    isActive: data.isActive !== undefined ? data.isActive : true,
                }
            });

            return {
                status: 201,
                message: 'Unidad de medida creada exitosamente',
                data: unit
            };

        } catch (error) {
            console.error('Error al crear unidad de medida:', error);
            return { status: 500, message: 'Error interno al crear unidad de medida', data: null };
        }
    }

    // 2. LISTAR TODAS
    async findAll() {
        try {
            const units = await prisma.measurementUnit.findMany({
                where: { isActive: true },
                orderBy: { name: 'asc'}
            });

            if (units.length === 0) {
                return { status: 200, message: 'No hay unidades de medida registradas', data: [] };
            }

            return { status: 200, message: 'Unidades obtenidas exitosamente', data: units };
        } catch (error) {
            console.error('Error al listar unidades:', error);
            return { status: 500, message: 'Error interno al listar unidades', data: null };
        }
    }

    // Admin: listar todas (incluye inactivas)
    async findAllAdmin() {
        try {
            const units = await prisma.measurementUnit.findMany({
                orderBy: { name: 'asc' },
            });

            if (units.length === 0) {
                return { status: 200, message: 'No hay unidades de medida registradas', data: [] };
            }

            return { status: 200, message: 'Unidades obtenidas exitosamente', data: units };
        } catch (error) {
            console.error('Error al listar unidades (admin):', error);
            return { status: 500, message: 'Error interno al listar unidades', data: null };
        }
    }

    // 3. OBTENER UNA
    async findOne(id: number) {
        try {
            const unit = await prisma.measurementUnit.findUnique({ where: { id, isActive: true } });

            if (!unit) {
                return { status: 404, message: 'Unidad de medida no encontrada', data: null };
            }

            return { status: 200, message: 'Unidad de medida encontrada', data: unit };
        } catch (error) {

            console.error('Error al obtener unidad de medida:', error);
            return { status: 500, message: 'Error interno al obtener unidad de medida', data: null };
        }
    }

    // Admin: obtener una (incluye inactivas)
    async findOneAdmin(id: number) {
        try {
            const unit = await prisma.measurementUnit.findUnique({ where: { id } });

            if (!unit) {
                return { status: 404, message: 'Unidad de medida no encontrada', data: null };
            }

            return { status: 200, message: 'Unidad de medida encontrada', data: unit };
        } catch (error) {
            console.error('Error al obtener unidad de medida (admin):', error);
            return { status: 500, message: 'Error interno al obtener unidad de medida', data: null };
        }
    }

    // 4. ACTUALIZAR
    async update(id: number, data: UpdateMeasurementUnitInterface) {
        try {
            const exists = await prisma.measurementUnit.findUnique({ where: { id } });

            if (!exists) {
                return { status: 404, message: 'Unidad de medida no encontrada', data: null };
            }

            // Validar duplicados si cambian nombre o símbolo
            if (data.name || data.symbol) {
                const duplicate = await prisma.measurementUnit.findFirst({
                where: {
                    AND: [
                    { id: { not: id } },
                    {
                        OR: [
                        data.name ? { name: data.name } : undefined,
                        data.symbol ? { symbol: data.symbol } : undefined
                        ].filter(Boolean) as any
                    }
                    ]
                }
                });
                if (duplicate) {
                return { status: 409, message: 'Nombre o símbolo ya en uso por otra unidad', data: null };
                }
            }

            const updated = await prisma.measurementUnit.update({
                where: { id },
                data
            });

            return { status: 200, message: 'Unidad de medida actualizada', data: updated };
        } catch (error) {
            console.error('Error al actualizar unidad de medida:', error);
            return { 
                status: 500,
                message: 'Error interno al actualizar unidad de medida',
                data: null
            }
        }   
    }

    // 5. ELIMINAR
    async remove(id: number) {
        try {
            // 1. Buscamos la unidad Y contamos sus productos en un solo viaje a la BD
            const unit = await prisma.measurementUnit.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: { products: true }
                    }
                }
            });

            // 2. Validación: ¿Existe?
            if (!unit) {
                return {
                    status: 404,
                    message: 'Unidad de medida no encontrada',
                    data: null
                };
            }

            // 3. Validación: ¿Se está usando? (Integridad Referencial)
            if (unit._count.products > 0) {
                return {
                    status: 400,
                    message: `No se puede eliminar la unidad "${unit.name}" porque está asignada a ${unit._count.products} producto(s). Se recomienda desactivarla.`,
                    data: null
                };
            }

            // 4. Eliminación Física (Es seguro porque ya validamos que nadie la usa)
            await prisma.measurementUnit.delete({
                where: { id }
            });

            return {
                status: 200,
                message: 'Unidad de medida eliminada exitosamente',
                data: null
            };

        } catch (error) {
            console.error('Error al eliminar unidad de medida:', error);
            // Capturamos el error específico de Prisma si algo falla en la FK a último momento
            return { 
                status: 500, 
                message: 'Error interno al eliminar unidad de medida', 
                data: null 
            };
        }
    }
}
