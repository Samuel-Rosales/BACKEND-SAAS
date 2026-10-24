import { Request, Response } from 'express';
import { AiService } from './ai.service';

const aiService = new AiService();

export class AiController {
    chat = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const { message, history, tzOffset, localDate } = req.body;

        if (!businessId) {
            return res.status(400).json({
                error: 'Falta identificar la empresa activa (x-business-id requerido).'
            });
        }

        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({
                error: 'El campo "message" es obligatorio.'
            });
        }

        try {
            const parsedTzOffset = tzOffset !== undefined && !isNaN(Number(tzOffset)) ? Number(tzOffset) : 240;
            const userId = req.user?.id ? Number(req.user.id) : undefined;
            const result = await aiService.chat(businessId, message.trim(), history || [], parsedTzOffset, localDate, userId);
            return res.status(200).json({
                message: result.text,
                actions: result.actions,
                modelUsed: result.modelUsed,
                subagent: result.subagent,
                suggestedOptions: result.suggestedOptions,
                usage: result.usage
            });
        } catch (error: any) {
            console.error('[Guardián AI] Error en controlador:', error.message);
            return res.status(500).json({
                error: error.message || 'Error procesando la consulta con la inteligencia artificial.'
            });
        }
    };

    getUsage = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const tzOffset = req.query.tzOffset ? Number(req.query.tzOffset) : 240;

        if (!businessId) {
            return res.status(400).json({
                error: 'Falta identificar la empresa activa.'
            });
        }

        try {
            const info = await aiService.getUsage(businessId, tzOffset);
            return res.status(200).json(info);
        } catch (error: any) {
            console.error('[Guardián AI] Error obteniendo uso:', error.message);
            return res.status(500).json({
                error: error.message || 'Error consultando cuota de uso.'
            });
        }
    };
}
