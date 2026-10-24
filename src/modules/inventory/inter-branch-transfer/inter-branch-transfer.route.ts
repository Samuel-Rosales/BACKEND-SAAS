import { Router } from 'express';
import { InterBranchTransferController } from './inter-branch-transfer.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new InterBranchTransferController();

// Todas las rutas requieren autenticación y contexto de negocio
router.use(authMiddleware);

// Despacho: Crear y enviar mercancía desde el almacén origen
router.post('/dispatch', controller.createDispatch);

// Recepción: Ver despachos pendientes que van dirigidos a este negocio
router.get('/pending', controller.getPendingTransfers);

// Historial: Ver despachos enviados por este negocio/depósito
router.get('/sent', controller.getSentTransfers);

// Ver detalle de un despacho específico
router.get('/:id', controller.getTransferById);

// Recepción auditada: Confirmar llegada, registrar conformes, dañados y faltantes
router.post('/:id/receive', controller.receiveTransfer);

export const InterBranchTransferRoute = router;
