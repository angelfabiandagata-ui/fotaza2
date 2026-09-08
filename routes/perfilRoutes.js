import { Router } from 'express';
import { 
    mostrarPerfil, 
    verPerfilPorId, 
    cambiarAvatarAsincronico 
} from '../controller/perfilController.js';
import { requerirAutenticacion } from '../middleware/authMiddleware.js';

const router = Router();

// RUTAS DEL PERFIL

// 1. Vista principal del perfil propio
router.get('/', requerirAutenticacion, mostrarPerfil);

// 2. Vista de perfil por ID
router.get('/:id', verPerfilPorId);

// 3. Cambiar avatar
router.post('/cambiar-avatar', requerirAutenticacion, cambiarAvatarAsincronico);

export default router;