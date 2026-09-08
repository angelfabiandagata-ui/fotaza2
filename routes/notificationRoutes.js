import { Router } from 'express';
import {
    obtenerNotificaciones,
    marcarComoLeida,
} from '../controller/notificationController.js';
import { requerirAutenticacion } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/notificaciones', requerirAutenticacion, obtenerNotificaciones);
router.post('/notificaciones/marcar/:id', requerirAutenticacion, marcarComoLeida);

export default router;