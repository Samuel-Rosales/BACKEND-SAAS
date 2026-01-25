import { Router } from 'express';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { CreditNoteController } from './credit-note.controller';
import { CreditNoteValidator } from './credit-note.validator';

const router = Router();
const controller = new CreditNoteController();
const validator = new CreditNoteValidator();

// 1. Proteger todas las rutas (Solo usuarios logueados)
router.use(authMiddleware);

router.get(
    '/', 
    validator.validateList, 
    handleValidationErrors, 
    controller.findAll
);

router.post(
    '/', 
    validator.validateCreate,   // 1. Reglas de validación (Express-Validator)
    handleValidationErrors,     // 2. Si hay error, detiene aquí y responde 400
    controller.create           // 3. Si todo ok, ejecuta la lógica
);

// Opcional: Listar Notas de Crédito
// router.get('/', controller.findAll);

export const CreditNoteRoute = router;