import express from 'express';
import { 
    denunciarImagen, 
    panelValidador, 
    darDeBajaPublicacion, 
    desestimarDenuncias,
    denunciarComentario,
    verDenunciasComentariosAutor,
    eliminarComentario,
} from '../controller/complaintController.js';
import { requerirAutenticacion } from '../middleware/authMiddleware.js';
import { requerirValidador } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Endpoints para usuarios registrados
router.post('/denunciar/imagen', requerirAutenticacion, denunciarImagen);

// Endpoints exclusivos para el Admin
router.get('/admin/moderacion', requerirValidador, panelValidador);
router.post('/admin/publicacion/baja', requerirValidador, darDeBajaPublicacion);
router.post('/admin/denuncia/desestimar', requerirValidador, desestimarDenuncias);

// Denuncias de comentarios
router.post('/denunciar/comentario', requerirAutenticacion, denunciarComentario);
router.get('/mis-denuncias-comentarios', requerirAutenticacion, verDenunciasComentariosAutor);
router.post('/comentario/eliminar', requerirAutenticacion, eliminarComentario);


export default router;