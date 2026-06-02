import express from 'express';
import { 
    formularioNuevaPublicacion, 
    crearPublicacion, 
    verDetallePublicacion, 
    crearComentarioFoto, 
    valorarFoto, 
    toggleSeguirUsuario 
} from '../controller/postController.js';

import { requerirAutenticacion } from '../middleware/authMiddleware.js';

const router = express.Router();


// GESTIÓN DE PUBLICACIONES 


// Formulario de subida y acción de creación (Protegidos con candado de sesión)
router.get('/post/new', requerirAutenticacion, formularioNuevaPublicacion);
router.post('/post/new', requerirAutenticacion, crearPublicacion);

// Visualización del detalle del carrusel 
router.get('/post/show/:id', requerirAutenticacion, verDetallePublicacion);



// INTERACCIONES ASÍNCRONAS 



router.post('/post/comment', requerirAutenticacion, crearComentarioFoto);


router.post('/post/rate', requerirAutenticacion, valorarFoto);



// EXPLORACIÓN Y RELACIONES



// Sistema dinámico de Seguir / Dejar de seguir creadores
router.post('/user/follow', requerirAutenticacion, toggleSeguirUsuario);

export default router;