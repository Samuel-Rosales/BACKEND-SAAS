import { prisma } from '@/configs';
import { CreateClientInterface, UpdateClientInterface } from './interfaces';

export class ClientService {

  // 1. CREAR CLIENTE
  async create(businessId: number, data: CreateClientInterface) {
    try {
      const client = await prisma.client.create({
        data: {
          businessId,
          ...data
        }
      });

      return {
        status: 201,
        message: 'Cliente registrado exitosamente',
        data: client
      };

    } catch (error) {
      console.error('Error al crear cliente:', error);
      return {
        status: 500,
        message: 'Error interno al registrar el cliente',
        data: null
      };
    }
  }

  // 2. LISTAR (Tenant Scoped + Search + Status)
  async findAll(businessId: number, query?: { search?: string, status?: string }) {
    try {
      const search = query?.search ? String(query.search).trim() : undefined;
      const statusParam = query?.status ? String(query.status).toLowerCase() : undefined;

      const whereClause: any = { businessId };

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      
      if (statusParam) {
        if (statusParam === 'true' || statusParam === 'active') {
          whereClause.isActive = true;
        } else if (statusParam === 'false' || statusParam === 'inactive') {
          whereClause.isActive = false;
        }
      }
      

      const clients = await prisma.client.findMany({
        where: whereClause,
        orderBy: { name: 'asc' }
      });

      if (clients.length === 0) {
        return {
          status: 200,
          message: 'No hay clientes registrados aún',
          data: []
        };
      }

      return {
        status: 200,
        message: 'Clientes obtenidos exitosamente',
        data: clients
      };

    } catch (error) {
      console.error('Error al listar clientes:', error);
      return {
        status: 500,
        message: 'Error interno al obtener clientes',
        data: null
      };
    }
  }

  // 3. OBTENER UNO
  async findOne(businessId: number, id: number) {
    try {
      const client = await prisma.client.findFirst({
        where: { id, businessId }
      });

      if (!client) {
        return {
          status: 404,
          message: 'Cliente no encontrado',
          data: null
        };
      }

      return {
        status: 200,
        message: 'Cliente encontrado',
        data: client
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
  async update(businessId: number, id: number, data: UpdateClientInterface) {
    try {
      // Verificar existencia primero
      const exists = await prisma.client.findFirst({ where: { id, businessId } });

      if (!exists) {
        return {
          status: 404,
          message: 'Cliente no encontrado para actualizar',
          data: null
        };
      }

      const updatedClient = await prisma.client.update({
        where: { id },
        data: data
      });

      return {
        status: 200,
        message: 'Cliente actualizado correctamente',
        data: updatedClient
      };

    } catch (error) {
      console.error('Error actualizando cliente:', error);
      return {
        status: 500,
        message: 'Error interno al actualizar',
        data: null
      };
    }
  }

  // 5. ELIMINAR (Con validación de ventas previas)
  async remove(businessId: number, id: number) {
    try {
      // 1. Buscar el cliente y contar sus ventas asociadas
      const client = await prisma.client.findFirst({
        where: { id, businessId },
        include: {
          _count: {
            select: {
              sales: true // Relación con la tabla de ventas
            }
          }
        }
      });

      if (!client) {
        return {
          message: 'Cliente no encontrado',
          status: 404,
          data: null
        };
      }

      // 2. Extraer cantidad de dependencias
      const totalSales = client._count.sales;

      // 3. DECISIÓN: ¿Archivar o Borrar?
      if (totalSales > 0) {
        // === ESCENARIO A: NO SE PUEDE ELIMINAR ===
        // El cliente tiene historial de ventas. No se debe borrar para no perder datos contables.

        return {
          message: `No se puede eliminar: El cliente tiene ${totalSales} venta(s) registrada(s).`,
          status: 409,
          data: null
        };

      } else {
        // === ESCENARIO B: HARD DELETE (Borrado Físico) ===
        // El cliente no tiene historial. Es seguro borrarlo de la base de datos. 

        await prisma.client.delete({
          where: { id }
        });

        return {
          message: 'Cliente eliminado permanentemente (No tenía historial de ventas)',
          status: 200,
          data: null
        };
      }

    } catch (error) {
      console.error('Error al eliminar el cliente:', error);
      return {
        message: 'Error interno al procesar la eliminación',
        status: 500,
        data: null
      };
    }
  }
}
