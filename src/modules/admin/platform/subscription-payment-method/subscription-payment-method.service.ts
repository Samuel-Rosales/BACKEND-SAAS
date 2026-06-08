import { prisma } from '@/configs';
import { CreateSubscriptionPaymentMethodInterface, UpdateSubscriptionPaymentMethodInterface } from './interfaces';

export class SubscriptionPaymentMethodService {

  async create(data: CreateSubscriptionPaymentMethodInterface) {
    try {
      const existing = await prisma.subscriptionPaymentMethod.findUnique({
        where: { name: data.name },
      });

      if (existing) {
        return {
          status: 400,
          message: 'Ya existe un método de pago de suscripción con ese nombre',
          data: null,
        };
      }

      const method = await prisma.subscriptionPaymentMethod.create({
        data: {
          name: data.name,
          type: data.type,
          currency: data.currency,
          isActive: data.isActive !== undefined ? data.isActive : true,
          details: data.details ?? undefined,
        },
      });

      return {
        status: 201,
        message: 'Método de pago creado exitosamente',
        data: method,
      };
    } catch (error) {
      console.error('SubscriptionPaymentMethodService.create error:', error);
      return {
        status: 500,
        message: 'Error interno al crear el método de pago',
        data: null,
      };
    }
  }

  async findAll() {
    try {
      const methods = await prisma.subscriptionPaymentMethod.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      return {
        status: 200,
        message: 'Métodos de pago obtenidos exitosamente',
        data: methods,
      };
    } catch (error) {
      console.error('SubscriptionPaymentMethodService.findAll error:', error);
      return {
        status: 500,
        message: 'Error interno al obtener los métodos de pago',
        data: null,
      };
    }
  }

  async findOne(id: number) {
    try {
      const method = await prisma.subscriptionPaymentMethod.findUnique({
        where: { id },
      });

      if (!method) {
        return {
          status: 404,
          message: 'Método de pago no encontrado',
          data: null,
        };
      }

      return {
        status: 200,
        message: 'Método de pago obtenido exitosamente',
        data: method,
      };
    } catch (error) {
      console.error('SubscriptionPaymentMethodService.findOne error:', error);
      return {
        status: 500,
        message: 'Error interno al obtener el método de pago',
        data: null,
      };
    }
  }

  async update(id: number, data: UpdateSubscriptionPaymentMethodInterface) {
    try {
      const existing = await prisma.subscriptionPaymentMethod.findUnique({
        where: { id },
      });

      if (!existing) {
        return {
          status: 404,
          message: 'Método de pago no encontrado',
          data: null,
        };
      }

      if (data.name && data.name !== existing.name) {
        const nameTaken = await prisma.subscriptionPaymentMethod.findUnique({
          where: { name: data.name },
        });
        if (nameTaken) {
          return {
            status: 400,
            message: 'Ya existe otro método de pago con ese nombre',
            data: null,
          };
        }
      }

      const updateData: Record<string, any> = { ...data };
      if (data.details === null) {
        updateData.details = null;
      }

      const updated = await prisma.subscriptionPaymentMethod.update({
        where: { id },
        data: updateData,
      });

      return {
        status: 200,
        message: 'Método de pago actualizado exitosamente',
        data: updated,
      };
    } catch (error) {
      console.error('SubscriptionPaymentMethodService.update error:', error);
      return {
        status: 500,
        message: 'Error interno al actualizar el método de pago',
        data: null,
      };
    }
  }

  async remove(id: number) {
    try {
      const existing = await prisma.subscriptionPaymentMethod.findUnique({
        where: { id },
      });

      if (!existing) {
        return {
          status: 404,
          message: 'Método de pago no encontrado',
          data: null,
        };
      }

      await prisma.subscriptionPaymentMethod.delete({
        where: { id },
      });

      return {
        status: 200,
        message: 'Método de pago eliminado exitosamente',
        data: null,
      };
    } catch (error) {
      console.error('SubscriptionPaymentMethodService.remove error:', error);
      return {
        status: 500,
        message: 'Error interno al eliminar el método de pago',
        data: null,
      };
    }
  }
}
