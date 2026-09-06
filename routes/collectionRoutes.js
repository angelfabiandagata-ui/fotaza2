import { Router } from 'express';
import { 
    crearColeccion, 
    guardarEnColeccion, 
    obtenerMisColecciones,
    verDetalleColeccion,
    removerPublicacionDeColeccion, 
    eliminarColeccion             
} from '../controller/collectionController.js';
import { requerirAutenticacion } from '../middleware/authMiddleware.js';

const router = Router();

// Si montaste con app.use('/', collectionRoutes) en app.js:
router.post('/colecciones/crear', requerirAutenticacion, crearColeccion);
router.post('/colecciones/agregar', requerirAutenticacion, guardarEnColeccion);
router.get('/colecciones/mis-colecciones', requerirAutenticacion, obtenerMisColecciones);
router.get('/colecciones/:id', requerirAutenticacion, verDetalleColeccion);
router.post('/colecciones/remover-post', requerirAutenticacion, removerPublicacionDeColeccion);
router.delete('/colecciones/:id', requerirAutenticacion, eliminarColeccion);

export default router;