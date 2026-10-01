import React from 'react';
import { Request, Response } from 'express';
import { QuotationService } from './quotation.service';
import { renderToStream } from '@react-pdf/renderer';
import QuotationInvoicePDF from '@/templates/QuotationInvoicePDF';
import { prisma } from '@/configs';

const service = new QuotationService();

export class QuotationController {
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
            console.error('Error in QuotationController.create:', error);
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
            console.error('Error in QuotationController.findAll:', error);
            return res.status(500).json({ message: 'Error interno en el servidor.' });
        }
    }

    async findOne(req: Request, res: Response) {
        try {
            const { businessId } = req.user;
            const { id } = req.params;

            if (!businessId) {
                return res.status(400).json({ message: 'Falta el header x-business-id.' });
            }

            const result = await service.findOne(Number(businessId), Number(id));
            return res.status(result.status).json(result);
        } catch (error) {
            console.error('Error in QuotationController.findOne:', error);
            return res.status(500).json({ message: 'Error interno en el servidor.' });
        }
    }

    async updateStatus(req: Request, res: Response) {
        try {
            const { businessId } = req.user;
            const { id } = req.params;

            if (!businessId) {
                return res.status(400).json({ message: 'Falta el header x-business-id.' });
            }

            const result = await service.updateStatus(Number(businessId), Number(id), req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            console.error('Error in QuotationController.updateStatus:', error);
            return res.status(500).json({ message: 'Error interno en el servidor.' });
        }
    }

    async streamPdf(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const quotation = await prisma.quotation.findUnique({
                where: { id: Number(id) },
                include: {
                    business: true,
                    client: true,
                    member: { select: { user: { select: { name: true } } } },
                    exchangeRate: true,
                    items: {
                        include: {
                            product: { select: { id: true, name: true, sku: true } },
                            productPresentation: { select: { id: true, name: true } }
                        }
                    }
                }
            });

            if (!quotation) {
                return res.status(404).json({ message: 'Cotización no encontrada.' });
            }

            const rate = Number(quotation.exchangeRate?.rate || 1);
            const totalAmount = Number(quotation.totalAmount);
            const subTotal = Number(quotation.subTotal);
            const taxAmount = Number(quotation.taxAmount);
            const discount = Number(quotation.discount);

            const items = quotation.items.map((it) => ({
                productName: it.product.name,
                presentationName: it.productPresentation?.name,
                quantity: Number(it.quantity),
                unitPrice: Number(it.unitPrice),
                subTotal: Number(it.subTotal)
            }));

            const pdfStream = await renderToStream(
                React.createElement(QuotationInvoicePDF, {
                    businessName: quotation.business.name,
                    businessAddress: quotation.business.address,
                    businessPhone: quotation.business.closingNotificationPhone,
                    receiptNumber: quotation.receiptNumber,
                    createdAt: new Date(quotation.createdAt).toLocaleDateString('es-VE'),
                    validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('es-VE') : null,
                    client: {
                        name: quotation.client.name,
                        ciOrRif: quotation.client.ci,
                        phone: quotation.client.phone,
                        email: quotation.client.email,
                        address: quotation.client.address
                    },
                    sellerName: quotation.member.user.name,
                    items,
                    subTotal,
                    taxAmount,
                    discount,
                    totalAmount,
                    rate,
                    notes: quotation.notes
                }) as any
            );

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="Cotizacion-${quotation.receiptNumber}.pdf"`);

            req.on('close', () => {
                if (!res.writableFinished) {
                    (pdfStream as any).destroy?.();
                }
            });

            return (pdfStream as any).pipe(res);
        } catch (error) {
            console.error('Error in QuotationController.streamPdf:', error);
            return res.status(500).json({ message: 'Error al generar PDF de la cotización.' });
        }
    }
}
