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
        where: { businessId, isActive: true },
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
        where: { id, businessId, isActive: true }
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
      const exists = await prisma.supplier.findFirst({ where: { id, businessId, isActive: true } });
      
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
        // 1. Buscar el proveedor y contar sus compras asociadas
        // (Usamos include _count para hacerlo en una sola consulta eficiente)
        const supplier = await prisma.supplier.findFirst({
            where: { id, businessId },
            include: {
                _count: {
                    select: {
                        purchases: true // Relación con la tabla de compras
                    }
                }
            }
        });

        if (!supplier) {
            return {
                message: 'Proveedor no encontrado',
                status: 404,
                data: null
            };
        }

        // 2. Extraer cantidad de dependencias
        const totalPurchases = supplier._count.purchases;

        // 3. DECISIÓN: ¿Archivar o Borrar?
        if (totalPurchases > 0) {
            // === ESCENARIO A: SOFT DELETE (Archivar) ===
            // El proveedor tiene historial de compras. No se debe borrar para no perder datos contables.

            // Si ya estaba archivado (inactivo), avisamos para no procesar de más
            if (!supplier.isActive) {
                return {
                    message: 'El proveedor ya se encuentra archivado',
                    status: 400,
                    data: null
                };
            }

            // Lo desactivamos
            await prisma.supplier.update({
                where: { id },
                data: { isActive: false }
            });

            return {
                message: `Proveedor archivado correctamente. No se eliminó físicamente porque tiene ${totalPurchases} compra(s) registrada(s).`,
                status: 200,
                data: null
            };

        } else {
            // === ESCENARIO B: HARD DELETE (Borrado Físico) ===
            // El proveedor no tiene historial. Es seguro borrarlo de la base de datos. 

            await prisma.supplier.delete({
                where: { id }
            });

            return {
                message: 'Proveedor eliminado permanentemente (No tenía historial de compras)',
                status: 200,
                data: null
            };
        }

    } catch (error) {
        console.error('Error al eliminar el proveedor:', error);
        return {
            message: 'Error interno al procesar la eliminación',
            status: 500,
            data: null
        };
    }
  }
}