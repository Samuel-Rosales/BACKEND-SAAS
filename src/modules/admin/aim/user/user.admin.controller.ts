import { Request, Response } from 'express';
import { UserAdminService } from './user.admin.service';

const userAdminService = new UserAdminService();

export class UserAdminController {
  /**
   * GET /api/v1/admin/users
   * query: page, limit, q, isSuperAdmin
   */
  async list(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const q = (req.query.q as string | undefined) ?? undefined;

      const isSuperAdminRaw = req.query.isSuperAdmin as string | undefined;
      const isSuperAdmin =
        typeof isSuperAdminRaw === 'string'
          ? isSuperAdminRaw === 'true'
            ? true
            : isSuperAdminRaw === 'false'
              ? false
              : undefined
          : undefined;

      const result = await userAdminService.list({ page, limit, q, isSuperAdmin });
      return res.status(result.status).json(result);
    } catch (error) {
      console.error('UserAdminController.list error:', error);
      return res.status(500).json({
        message: 'Error interno del servidor',
        status: 500,
        data: null,
      });
    }
  }
}
