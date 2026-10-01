import { prisma } from '@/configs';
import { CreateExpenseCategoryInterface, UpdateExpenseCategoryInterface } from './interfaces';

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Servicios Básicos', description: 'Luz, agua, gas, internet, telefonía', color: '#3B82F6' },
  { name: 'Alquiler y Condominio', description: 'Canon de arrendamiento y cuotas de condominio', color: '#8B5CF6' },
  { name: 'Nómina y Salarios', description: 'Sueldos, salarios, bonos y adelantos al personal', color: '#10B981' },
  { name: 'Mantenimiento y Reparaciones', description: 'Reparación de equipos, pintura, mejoras de local', color: '#F59E0B' },
  { name: 'Publicidad y Mercadeo', description: 'Redes sociales, impresiones, material publicitario', color: '#EC4899' },
  { name: 'Suministros y Consumibles', description: 'Artículos de oficina, limpieza, papelería', color: '#06B6D4' },
  { name: 'Transporte y Logística', description: 'Fletes, combustible, pasajes, envíos', color: '#6366F1' },
  { name: 'Impuestos y Tasas', description: 'Tributos municipales, aranceles, tasas fiscales', color: '#EF4444' },
  { name: 'Otros Gastos', description: 'Gastos diversos e imprevistos del negocio', color: '#6B7280' },
];

export class ExpenseCategoryService {

  async ensureDefaultCategories(businessId: number) {
    const count = await prisma.expenseCategory.count({
      where: { businessId },
    });

    if (count === 0) {
      await prisma.expenseCategory.createMany({
        data: DEFAULT_EXPENSE_CATEGORIES.map((cat) => ({
          businessId,
          name: cat.name,
          description: cat.description,
          color: cat.color,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }
  }

  async findAll(businessId: number, onlyActive = false) {
    try {
      await this.ensureDefaultCategories(businessId);

      const whereClause: any = { businessId };
      if (onlyActive) {
        whereClause.isActive = true;
      }

      const categories = await prisma.expenseCategory.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { expenses: { where: { deletedAt: null } } },
          },
        },
        orderBy: { name: 'asc' },
      });

      return {
        status: 200,
        message: 'Categorías de gastos obtenidas exitosamente',
        data: categories,
      };
    } catch (error) {
      console.error('Error in ExpenseCategoryService.findAll:', error);
      return {
        status: 500,
        message: 'Error interno al obtener categorías de gastos',
        data: null,
      };
    }
  }

  async findOne(businessId: number, id: number) {
    try {
      const category = await prisma.expenseCategory.findFirst({
        where: { id, businessId },
        include: {
          _count: {
            select: { expenses: { where: { deletedAt: null } } },
          },
        },
      });

      if (!category) {
        return {
          status: 404,
          message: 'Categoría de gasto no encontrada',
          data: null,
        };
      }

      return {
        status: 200,
        message: 'Categoría obtenida',
        data: category,
      };
    } catch (error) {
      console.error('Error in ExpenseCategoryService.findOne:', error);
      return {
        status: 500,
        message: 'Error interno al obtener la categoría de gasto',
        data: null,
      };
    }
  }

  async create(businessId: number, data: CreateExpenseCategoryInterface) {
    try {
      const existing = await prisma.expenseCategory.findFirst({
        where: {
          businessId,
          name: { equals: data.name.trim(), mode: 'insensitive' },
        },
      });

      if (existing) {
        return {
          status: 400,
          message: `Ya existe una categoría con el nombre "${data.name}"`,
          data: null,
        };
      }

      const category = await prisma.expenseCategory.create({
        data: {
          businessId,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          color: data.color || '#6B7280',
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
      });

      return {
        status: 201,
        message: 'Categoría de gasto creada exitosamente',
        data: category,
      };
    } catch (error) {
      console.error('Error in ExpenseCategoryService.create:', error);
      return {
        status: 500,
        message: 'Error interno al crear la categoría de gasto',
        data: null,
      };
    }
  }

  async update(businessId: number, id: number, data: UpdateExpenseCategoryInterface) {
    try {
      const existing = await prisma.expenseCategory.findFirst({
        where: { id, businessId },
      });

      if (!existing) {
        return {
          status: 404,
          message: 'Categoría de gasto no encontrada',
          data: null,
        };
      }

      if (data.name && data.name.trim() !== existing.name) {
        const duplicate = await prisma.expenseCategory.findFirst({
          where: {
            businessId,
            name: { equals: data.name.trim(), mode: 'insensitive' },
            id: { not: id },
          },
        });

        if (duplicate) {
          return {
            status: 400,
            message: `Ya existe otra categoría con el nombre "${data.name}"`,
            data: null,
          };
        }
      }

      const updated = await prisma.expenseCategory.update({
        where: { id },
        data: {
          name: data.name !== undefined ? data.name.trim() : undefined,
          description: data.description !== undefined ? data.description.trim() || null : undefined,
          color: data.color !== undefined ? data.color : undefined,
          isActive: data.isActive !== undefined ? data.isActive : undefined,
        },
      });

      return {
        status: 200,
        message: 'Categoría de gasto actualizada exitosamente',
        data: updated,
      };
    } catch (error) {
      console.error('Error in ExpenseCategoryService.update:', error);
      return {
        status: 500,
        message: 'Error interno al actualizar la categoría de gasto',
        data: null,
      };
    }
  }

  async remove(businessId: number, id: number) {
    try {
      const existing = await prisma.expenseCategory.findFirst({
        where: { id, businessId },
        include: {
          _count: {
            select: { expenses: true },
          },
        },
      });

      if (!existing) {
        return {
          status: 404,
          message: 'Categoría de gasto no encontrada',
          data: null,
        };
      }

      if (existing._count.expenses > 0) {
        // Soft deactivate if expenses are linked
        const updated = await prisma.expenseCategory.update({
          where: { id },
          data: { isActive: false },
        });

        return {
          status: 200,
          message: 'La categoría tiene gastos asociados y fue desactivada en lugar de eliminarse',
          data: updated,
        };
      }

      await prisma.expenseCategory.delete({
        where: { id },
      });

      return {
        status: 200,
        message: 'Categoría de gasto eliminada exitosamente',
        data: null,
      };
    } catch (error) {
      console.error('Error in ExpenseCategoryService.remove:', error);
      return {
        status: 500,
        message: 'Error interno al eliminar la categoría de gasto',
        data: null,
      };
    }
  }
}
