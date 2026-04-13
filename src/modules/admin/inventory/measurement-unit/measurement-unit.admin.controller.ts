import { Request, Response } from 'express';
import { MeasurementUnitService } from '@/modules/inventory/measurement-unit/measurement-unit.service';

export class MeasurementUnitAdminController {
  private service = new MeasurementUnitService();

  create = async (req: Request, res: Response) => {
    const { status, data, message } = await this.service.create(req.body);

    res.status(status).json({
      message,
      data,
    });
  };

  findAll = async (_req: Request, res: Response) => {
    const { status, data, message } = await this.service.findAllAdmin();

    res.status(status).json({
      message,
      data,
    });
  };

  findOne = async (req: Request, res: Response) => {
    const { id } = req.params;

    const { status, data, message } = await this.service.findOneAdmin(+id);

    res.status(status).json({
      message,
      data,
    });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;

    const { status, data, message } = await this.service.update(+id, req.body);

    res.status(status).json({
      message,
      data,
    });
  };

  remove = async (req: Request, res: Response) => {
    const { id } = req.params;

    const { status, data, message } = await this.service.remove(+id);

    res.status(status).json({
      message,
      data,
    });
  };
}
