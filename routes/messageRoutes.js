import express from 'express';
import { 
    manifestarInteres, 
    verMensajes, 
    enviarMensaje 
} from '../controller/messageController.js';
import { requerirAutenticacion } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/interes', requerirAutenticacion, manifestarInteres);
router.get('/mensajes', requerirAutenticacion, verMensajes);
router.post('/mensajes/enviar', requerirAutenticacion, enviarMensaje);

export default router;