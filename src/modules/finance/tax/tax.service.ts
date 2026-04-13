import { prisma } from '@/configs';
import { CreateTaxInterface, UpdateTaxInterface } from './interfaces';

export class TaxService {
  async create(data: CreateTaxInterface) {
    try {
      const existing = await prisma.tax.findFirst({
        where: { name: data.name },
      });

      if (existing) {
        return {
          message: 'Ya existe un impuesto con ese nombre',
          status: 400,
          data: null,
        };
      }

      const tax = await prisma.tax.create({
        data: {
          name: data.name,
          rate: data.rate,
          code: data.code ?? null,
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
      });

      return {
        message: 'Impuesto creado exitosamente',
        status: 201,
        data: tax,
      };
    } catch (error) {
      console.error('Error al crear el impuesto:', error);
      return {
        message: 'Error al crear el impuesto',
        status: 500,
        data: null,
      };
    }
  }

  async findAll() {
    try {
      const taxes = await prisma.tax.findMany({
        orderBy: { name: 'asc' },
      });

      if (taxes.length === 0) {
        return {
          message: 'No hay impuestos registrados',
          status: 200,
          data: [],
        };
      }

      return {
        message: 'Impuestos obtenidos exitosamente',
        status: 200,
        data: taxes,
      };
    } catch (error) {
      console.error('Error al obtener impuestos:', error);
      return {
        message: 'Error al obtener impuestos',
        status: 500,
        data: null,
      };
    }
  }

  async findActive() {
    try {
      const taxes = await prisma.tax.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });

      return {
        message: 'Impuestos activos obtenidos exitosamente',
        status: 200,
        data: taxes,
      };
    } catch (error) {
      console.error('Error al obtener impuestos activos:', error);
      return {
        message: 'Error al obtener impuestos activos',
        status: 500,
        data: null,
      };
    }
  }

  async findOne(id: number) {
    try {
      const tax = await prisma.tax.findUnique({
        where: { id },
      });

      if (!tax) {
        return {
          message: 'Impuesto no encontrado',
          status: 404,
          data: null,
        };
      }

      return {
        message: 'Impuesto obtenido exitosamente',
        status: 200,
        data: tax,
      };
    } catch (error) {
      console.error('Error al obtener el impuesto:', error);
      return {
        message: 'Error al obtener el impuesto',
        status: 500,
        data: null,
      };
    }
  }

  async update(id: number, data: UpdateTaxInterface) {
    try {
      const existing = await prisma.tax.findUnique({
        where: { id },
      });

      if (!existing) {
        return {
          message: 'Impuesto no encontrado',
          status: 404,
          data: null,
        };
      }

      if (data.name && data.name !== existing.name) {
        const nameTaken = await prisma.tax.findFirst({
          where: { name: data.name, NOT: { id } },
        });

        if (nameTaken) {
          return {
            message: 'Ya existe un impuesto con ese nombre',
            status: 400,
            data: null,
          };
        }
      }

      const updated = await prisma.tax.update({
        where: { id },
        data: {
          ...data,
          code: data.code === undefined ? undefined : data.code,
        },
      });

      return {
        message: 'Impuesto actualizado exitosamente',
        status: 200,
        data: updated,
      };
    } catch (error) {
      console.error('Error al actualizar el impuesto:', error);
      return {
        message: 'Error al actualizar el impuesto',
        status: 500,
        data: null,
      };
    }
  }

  async remove(id: number) {
    try {
      const tax = await prisma.tax.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              products: true,
              purchases: true,
            },
          },
        },
      });

      if (!tax) {
        return {
          message: 'Impuesto no encontrado',
          status: 404,
          data: null,
        };
      }

      const totalRelations = (tax._count.products ?? 0) + (tax._count.purchases ?? 0);

      if (totalRelations > 0) {
        return {
          message: `No se puede eliminar el impuesto porque tiene ${totalRelations} registro(s) asociado(s). Se recomienda desactivarlo.`,
          status: 400,
          data: null,
        };
      }

      await prisma.tax.delete({ where: { id } });

      return {
        message: 'Impuesto eliminado exitosamente',
        status: 200,
        data: null,
      };
    } catch (error) {
      console.error('Error al eliminar el impuesto:', error);
      return {
        message: 'Error al eliminar el impuesto',
        status: 500,
        data: null,
      };
    }
  }
}
