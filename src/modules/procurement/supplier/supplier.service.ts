import { prisma } from '@/configs';
import { CreateSupplierInterface, UpdateSupplierInterface } from './interfaces';

export class SupplierService {

  // 1. CREAR PROVEEDOR
  async create(businessId: number, data: CreateSupplierInterface) {
    try {
      const supplier = await prisma.supplier.create({
        data: {
          businessId,
          ...data
        }
      });

      return {
        status: 201,
        message: 'Proveedor registrado exitosamente',
        data: supplier
      };

    } catch (error) {
      console.error('Error al crear proveedor:', error);
      return {
        status: 500,
        message: 'Error interno al registrar el proveedor',
        data: null
      };
    }
  }

  // 2. LISTAR (Tenant Scoped)
  async findAll(businessId: number) {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { businessId },
        orderBy: { nameCompany: 'asc' }
      });

      if (suppliers.length === 0) {
        return {
          status: 200,
            message: 'No hay proveedores registrados aún',
            data: []
        };
      }

      return {
        status: 200,
        message: 'Proveedores obtenidos exitosamente',
        data: suppliers
      };

    } catch (error) {
      console.error('Error al listar proveedores:', error);
      return {
        status: 500,
        message: 'Error interno al obtener proveedores',
        data: null
      };
    }
  }

  // 3. OBTENER UNO
  async findOne(businessId: number, id: number) {
    try {
      const supplier = await prisma.supplier.findFirst({
        where: { id, businessId }
      });

      if (!supplier) {
        return {
          status: 404,
          message: 'Proveedor no encontrado',
          data: null
        };
      }

      return {
        status: 200,
        message: 'Proveedor encontrado',
        data: supplier
      };

    } catch (error) {
      return {
        status: 500,
        message: 'Error interno del servidor',
        data: null
      };
    }
  }

  // 4. ACTUALIZAR
  async update(businessId: number, id: number, data: UpdateSupplierInterface) {
    try {
      // Verificar existencia primero
      const exists = await prisma.supplier.findFirst({ where: { id, businessId } });
      
      if (!exists) {
        return {
          status: 404,
          message: 'Proveedor no encontrado para actualizar',
          data: null
        };
      }

      const updatedSupplier = await prisma.supplier.update({
        where: { id },
        data: data
      });

      return {
        status: 200,
        message: 'Proveedor actualizado correctamente',
        data: updatedSupplier
      };

    } catch (error) {
      console.error('Error actualizando proveedor:', error);
      return {
        status: 500,
        message: 'Error interno al actualizar',
        data: null
      };
    }
  }

  // 5. ELIMINAR (Con validación de compras previas)
  async remove(businessId: number, id: number) {
    try {
      // Verificar si tiene compras asociadas para evitar romper integridad
      const purchasesCount = await prisma.purchase.count({
        where: { supplierId: id }
      });

      if (purchasesCount > 0) {
        return {
            status: 409, // Conflict
            message: `No se puede eliminar: El proveedor tiene ${purchasesCount} compras registradas.`,
            data: null
        };
      }

      // Validar que exista y sea mío
      const exists = await prisma.supplier.findFirst({ where: { id, businessId } });
      if (!exists) {
        return { status: 404, message: 'Proveedor no encontrado', data: null };
      }

      await prisma.supplier.delete({ where: { id } });

      return {
        status: 200,
        message: 'Proveedor eliminado correctamente',
        data: null
      };

    } catch (error) {
      return {
        status: 500,
        message: 'Error interno al eliminar',
        data: null
      };
    }
  }
}