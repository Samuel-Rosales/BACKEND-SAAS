import React from 'react';
import { Request, Response } from 'express';
import { PurchaseOrderService } from './purchase-order.service';
import { renderToStream } from '@react-pdf/renderer';
import PurchaseOrderPDF from '@/templates/PurchaseOrderPDF';

const service = new PurchaseOrderService();

export class PurchaseOrderController {

    async create(req: Request, res: Response) {
        try {
            const { businessId, membershipId } = req.user;
            if (!businessId) {
                return res.status(400).json({ message: 'Falta el header x-business-id.' });
            }
            if (!membershipId) {
                return res.status(400).json({ message: 'Falta la membresía de usuario activa.' });
            }

            const result = await service.create(Number(businessId), Number(membershipId), req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            console.error('Error in PurchaseOrderController.create:', error);
            return res.status(500).json({ message: 'Error interno en el servidor.' });
        }
    }

    async findAll(req: Request, res: Response) {
        try {
            const { businessId } = req.user;
            if (!businessId) {
                return res.status(400).json({ message: 'Falta el header x-business-id.' });
            }

            const result = await service.findAll(Number(businessId), req.query);
            return res.status(result.status).json(result);
        } catch (error) {
            console.error('Error in PurchaseOrderController.findAll:', error);
            return res.status(500).json({ message: 'Error interno en el servidor.' });
        }
    }

    async findOne(req: Request, res: Response) {
        try {
            const { businessId } = req.user;
            const { id } = req.params;

            const result = await service.findOne(Number(businessId), Number(id));
            return res.status(result.status).json(result);
        } catch (error) {
            console.error('Error in PurchaseOrderController.findOne:', error);
            return res.status(500).json({ message: 'Error interno en el servidor.' });
        }
    }

    async updateStatus(req: Request, res: Response) {
        try {
            const { businessId } = req.user;
            const { id } = req.params;
            const { status } = req.body;

            const result = await service.updateStatus(Number(businessId), Number(id), status);
            return res.status(result.status).json(result);
        } catch (error) {
            console.error('Error in PurchaseOrderController.updateStatus:', error);
            return res.status(500).json({ message: 'Error interno en el servidor.' });
        }
    }

    async receive(req: Request, res: Response) {
        try {
            const { businessId, membershipId } = req.user;
            const { id } = req.params;

            if (!businessId || !membershipId) {
                return res.status(400).json({ message: 'Falta identificación de negocio o membresía.' });
            }

            const result = await service.receive(Number(businessId), Number(membershipId), Number(id), req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            console.error('Error in PurchaseOrderController.receive:', error);
            return res.status(500).json({ message: 'Error interno al procesar recepción.' });
        }
    }

    async streamPdf(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const businessId = (req as any).user?.businessId || req.query.businessId;

            if (!businessId) {
                return res.status(400).json({ message: 'Falta identificación de empresa para generar PDF.' });
            }

            const pdfData = await service.getPdfData(Number(businessId), Number(id));
            if (!pdfData) {
                return res.status(404).json({ message: 'Orden de compra no encontrada.' });
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="orden-compra-OC-${String(pdfData.orderNumber).padStart(4, '0')}.pdf"`);

            const element = React.createElement(PurchaseOrderPDF, pdfData);
            const stream = await renderToStream(element as any);
            return stream.pipe(res);
        } catch (error) {
            console.error('Error streaming PurchaseOrder PDF:', error);
            return res.status(500).json({ message: 'Error al generar PDF de orden de compra.' });
        }
    }
}
