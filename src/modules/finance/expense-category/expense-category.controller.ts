import { Request, Response } from 'express';
import { ExpenseCategoryService } from './expense-category.service';

export class ExpenseCategoryController {
  private service = new ExpenseCategoryService();

  findAll = async (req: Request, res: Response) => {
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(400).json({ message: 'ID de negocio requerido', data: null });
    }

    const onlyActive = req.query.active === 'true';
    const result = await this.service.findAll(businessId, onlyActive);
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
    if (!businessId) {
      return res.status(400).json({ message: 'ID de negocio requerido', data: null });
    }

    const result = await this.service.create(businessId, req.body);
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
