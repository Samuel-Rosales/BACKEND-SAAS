import { prisma } from '@/configs';

export class SubscriptionPaymentMethodPublicService {
  async findActive() {
    try {
      const methods = await prisma.subscriptionPaymentMethod.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      return {
        status: 200,
        message: 'Métodos de pago obtenidos exitosamente',
        data: methods,
      };
    } catch (error) {
      console.error('SubscriptionPaymentMethodPublicService.findActive error:', error);
      return {
        status: 500,
        message: 'Error interno al obtener los métodos de pago',
        data: null,
      };
    }
  }
}
