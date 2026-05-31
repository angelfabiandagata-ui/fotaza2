import { Router } from 'express';
import { mostrarPerfil, cambiarAvatarAsincronico } from '../controller/perfilController.js';
import { requerirAutenticacion } from '../middleware/authMiddleware.js';

const router = Router();


//  RUTAS DEL PERFIL 

// Vista principal: Responde en '/perfil'
router.get('/', requerirAutenticacion, mostrarPerfil);

router.post('/cambiar-avatar', requerirAutenticacion, cambiarAvatarAsincronico);

export default router;