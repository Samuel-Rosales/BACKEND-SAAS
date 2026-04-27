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
  async findAll(businessId: number, query?: { page?: number, limit?: number, search?: string, isActive?: string }) {
    try {
      const search = query?.search ? String(query.search).trim() : undefined;
      const isActiveParam = query?.isActive ? String(query.isActive).toLowerCase() : undefined;
      const page = Number(query?.page) || 1;
      const limit = Number(query?.limit) || 20;
      const skip = (page - 1) * limit;

      const whereClause: any = { businessId };

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { ci: { contains: search, mode: 'insensitive' } }
        ];
      }

      
      if (isActiveParam) {
        if (isActiveParam === 'true' || isActiveParam === 'active') {
          whereClause.isActive = true;
        } else if (isActiveParam === 'false' || isActiveParam === 'inactive') {
          whereClause.isActive = false;
        }
      }
      

      const [clients, total] = await Promise.all([
        prisma.client.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        skip,
        take: limit
        }),
        prisma.client.count({ where: whereClause })
      ]);

      if (clients.length === 0) {
        return {
          status: 200,
          message: 'No hay clientes registrados aún',
          data: [],
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        };
      }

      return {
        status: 200,
        message: 'Clientes obtenidos exitosamente',
        data: clients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
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

  // 6. HISTORIAL DE COMPRAS (VENTAS) DE UN CLIENTE
  async purchaseHistory(businessId: number, clientId: number) {
    try {
      const client = await prisma.client.findFirst({
        where: { id: clientId, businessId }
      });

      if (!client) {
        return {
          status: 404,
          message: 'Cliente no encontrado',
          data: null
        };
      }

      const sales = await prisma.sale.findMany({
        where: {
          businessId,
          clientId,
          deletedAt: null
        },
        orderBy: { createdAt: 'desc' },
        include: {
          exchangeRate: { select: { rate: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
              productPresentation: { select: { id: true, name: true, factor: true } }
            }
          },
          payments: {
            include: {
              paymentMethod: { select: { id: true, name: true, type: true, currency: true } },
              exchangeRate: { select: { rate: true } }
            }
          },
          creditNotes: {
            include: {
              items: {
                include: { product: { select: { id: true, name: true, sku: true } } }
              },
              creditNotePayments: {
                include: {
                  paymentMethod: { select: { id: true, name: true, type: true, currency: true } },
                  exchangeRate: { select: { rate: true } }
                }
              }
            }
          }
        }
      });

      const formatted = sales.map(sale => ({
        ...sale,
        subTotal: Number(sale.subTotal),
        taxAmount: Number(sale.taxAmount),
        discount: Number(sale.discount),
        totalAmount: Number(sale.totalAmount),
        remainingBalance: Number(sale.remainingBalance),
        exchangeRate: sale.exchangeRate ? { ...sale.exchangeRate, rate: Number(sale.exchangeRate.rate) } : sale.exchangeRate,
        items: sale.items.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          subTotal: Number(item.subTotal),
          productPresentation: item.productPresentation
            ? { ...item.productPresentation, factor: Number(item.productPresentation.factor) }
            : item.productPresentation
        })),
        payments: sale.payments.map(p => ({
          ...p,
          amount: Number(p.amount),
          exchangeRate: p.exchangeRate ? { ...p.exchangeRate, rate: Number(p.exchangeRate.rate) } : p.exchangeRate
        })),
        creditNotes: sale.creditNotes.map(cn => ({
          ...cn,
          totalAmount: Number(cn.totalAmount),
          items: cn.items.map(it => ({
            ...it,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            subTotal: Number(it.subTotal)
          })),
          creditNotePayments: cn.creditNotePayments.map(pay => ({
            ...pay,
            amount: Number(pay.amount),
            exchangeRate: pay.exchangeRate ? { ...pay.exchangeRate, rate: Number(pay.exchangeRate.rate) } : pay.exchangeRate
          }))
        }))
      }));

      return {
        status: 200,
        message: 'Historial de compras obtenido exitosamente',
        data: {
          client,
          sales: formatted
        }
      };

    } catch (error) {
      console.error('Error en purchaseHistory:', error);
      return {
        status: 500,
        message: 'Error interno al obtener el historial de compras',
        data: null
      };
    }
  }
}
