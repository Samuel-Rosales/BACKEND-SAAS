import { Request, Response } from 'express';
import { StockMovementService } from './stock-movement.service';
import { FindMovementsQuery } from './interfaces';

export class StockMovementController {
    private service = new StockMovementService();

    create = async (req: Request, res: Response) => {
        const {businessId, membershipId} = req.user;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        if (!membershipId) {
            return res.status(403).json({
                message: 'Membresía de negocio requerida para crear un movimiento de stock',
                data: null
            });
        }

        const {status, data, message} = await this.service.create(businessId, membershipId, req.body);

        res.status(status).json({ 
            message, 
            data 
        });
    };
findAll = async (req: Request, res: Response) => {
        
        // 1. SEGURIDAD: En GET, confiamos exclusivamente en el Token (req.user)
        const businessId = Number(req.user?.businessId);

        if (!businessId || isNaN(businessId)) {
            return res.status(401).json({
                message: 'No autorizado: ID de negocio no identificado',
                data: null
            });
        }

        // 2. MAPPING Y TIPADO
        // Aunque el validator ya hizo .toInt(), TypeScript ve req.query como strings.
        // Hacemos el cast explícito para cumplir con la interfaz 'FindMovementsQuery'.
        const queryOptions: FindMovementsQuery = {
            page: req.query.page ? Number(req.query.page) : 1,
            limit: req.query.limit ? Number(req.query.limit) : 10,
            search: req.query.search as string | undefined,
            type: req.query.type as string | undefined,
            // Convertimos a Number solo si existen, si no undefined
            depotId: req.query.depotId ? Number(req.query.depotId) : undefined,
            productId: req.query.productId ? Number(req.query.productId) : undefined,
            startDate: req.query.startDate as string | undefined,
            endDate: req.query.endDate as string | undefined,
        };

        // 3. LLAMADA AL SERVICIO
        const { status, data, message, meta } = await this.service.findAll(businessId, queryOptions);
        
        // 4. RESPUESTA ESTÁNDAR
        return res.status(status).json({ 
            message, 
            data, 
            meta // Indispensable para que tu Frontend dibuje la paginación
        });
    };

    findOne = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user?.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const {status, data, message} = await this.service.findOne(businessId, +id);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    findByProduct = async (req: Request, res: Response) => {
        const { productId } = req.params;
        const businessId = req.user?.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const {status, data, message} = await this.service.findByProduct(businessId, +productId);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    findByDepot = async (req: Request, res: Response) => {
        const { depotId } = req.params;
        const businessId = req.user?.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const {status, data, message} = await this.service.findByDepot(businessId, +depotId);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    findByType = async (req: Request, res: Response) => {
        const { type } = req.params;
        const businessId = req.user?.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const {status, data, message} = await this.service.findByType(businessId, type);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    /*update = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user?.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const {status, data, message} = await this.service.update(businessId, +id, req.body);
        
        res.status(status).json({ 
            message, 
            data 
        });
    };*/

    remove = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user?.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const {status, data, message} = await this.service.remove(businessId, +id);

        res.status(status).json({ 
            message, 
            data 
        });
    };
}
