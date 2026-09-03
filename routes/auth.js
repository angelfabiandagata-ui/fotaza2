import express from 'express';
import { registrarUsuario, iniciarSesion, cerrarSesion, verificarEmailDisponible, verificarUsuarioDisponible } from '../controller/authController.js';
import { user } from '../models/user.js'; 

const router = express.Router();


// RENDERIZADO DE VISTAS (PUG)

router.get('/login', (req, res) => res.render('auth/login'));
router.get('/signup', (req, res) => res.render('auth/signup')); 


// PROCESAMIENTO DE ACCIONES (CONTROLADORES)

router.post('/signup', registrarUsuario);
router.post('/login', iniciarSesion);
router.get('/logout', cerrarSesion);

// Validaciones asíncronas
router.get("/revisarEmail", verificarEmailDisponible);
router.get("/revisarUsuario", verificarUsuarioDisponible);


export default router;