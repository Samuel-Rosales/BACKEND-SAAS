import { Request, Response } from 'express';
import { ExpenseService } from './expense.service';

export class ExpenseController {
  private service = new ExpenseService();

  findAll = async (req: Request, res: Response) => {
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(400).json({ message: 'ID de negocio requerido', data: null });
    }

    const result = await this.service.findAll(businessId, req.query);
    return res.status(result.status).json(result);
  };

  getSummary = async (req: Request, res: Response) => {
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(400).json({ message: 'ID de negocio requerido', data: null });
    }

    const { fromDate, toDate } = req.query;
    const result = await this.service.getSummary(
      businessId,
      fromDate as string | undefined,
      toDate as string | undefined
    );
    return res.status(result.status).json(result);
  };

  getReport = async (req: Request, res: Response) => {
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(400).json({ message: 'ID de negocio requerido', data: null });
    }

    const { fromDate, toDate, categoryId, currency } = req.query;
    const result = await this.service.getReport(businessId, {
      fromDate: fromDate as string | undefined,
      toDate: toDate as string | undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      currency: currency as any,
    });
    return res.status(result.status).json(result);
  };

  findOne = async (req: Request, res: Response) => {
    const businessId = req.user?.businessId;
    const { id } = req.params;

    if (!businessId) {
      return res.status(400).json({ message: 'ID de negocio requerido', data: null });
    }

    const result = await this.service.findOne(businessId, Number(id));
    return res.status(result.status).json(result);
  };

  create = async (req: Request, res: Response) => {
    const businessId = req.user?.businessId;
    const memberId = req.user?.membershipId;

    if (!businessId) {
      return res.status(400).json({ message: 'ID de negocio requerido', data: null });
    }

    if (!memberId) {
      return res.status(403).json({ message: 'Se requiere una membresía activa en este negocio', data: null });
    }

    const result = await this.service.create(businessId, memberId, req.body);
    return res.status(result.status).json(result);
  };

  update = async (req: Request, res: Response) => {
    const businessId = req.user?.businessId;
    const { id } = req.params;

    if (!businessId) {
      return res.status(400).json({ message: 'ID de negocio requerido', data: null });
    }

    const result = await this.service.update(businessId, Number(id), req.body);
    return res.status(result.status).json(result);
  };

  remove = async (req: Request, res: Response) => {
    const businessId = req.user?.businessId;
    const { id } = req.params;

    if (!businessId) {
      return res.status(400).json({ message: 'ID de negocio requerido', data: null });
    }

    const result = await this.service.remove(businessId, Number(id));
    return res.status(result.status).json(result);
  };
}
