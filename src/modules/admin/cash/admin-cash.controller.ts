import { Request, Response } from 'express';
import { AdminCashService } from './admin-cash.service';

export class AdminCashController {
  private service: AdminCashService;

  constructor() {
    this.service = new AdminCashService();
  }

  async getBalance(req: Request, res: Response) {
    try {
      const month = req.query.month as string | undefined;
      const result = await this.service.getBalance(month);
      return res.status(result.status).json(result);
    } catch (error: any) {
      return res.status(500).json({
        status: 500,
        message: error.message || 'Error interno del servidor',
        data: null,
      });
    }
  }

  async getExpenses(req: Request, res: Response) {
    try {
      const { currency, category, month, search } = req.query as {
        currency?: string;
        category?: string;
        month?: string;
        search?: string;
      };

      const result = await this.service.getExpenses({ currency, category, month, search });
      return res.status(result.status).json(result);
    } catch (error: any) {
      return res.status(500).json({
        status: 500,
        message: error.message || 'Error interno del servidor',
        data: [],
      });
    }
  }

  async createExpense(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.service.createExpense(req.body, userId);
      return res.status(result.status).json(result);
    } catch (error: any) {
      return res.status(500).json({
        status: 500,
        message: error.message || 'Error al crear gasto',
        data: null,
      });
    }
  }

  async deleteExpense(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!id || isNaN(id)) {
        return res.status(400).json({
          status: 400,
          message: 'ID de gasto inválido',
          data: null,
        });
      }

      const result = await this.service.deleteExpense(id);
      return res.status(result.status).json(result);
    } catch (error: any) {
      return res.status(500).json({
        status: 500,
        message: error.message || 'Error al eliminar gasto',
        data: null,
      });
    }
  }
}
