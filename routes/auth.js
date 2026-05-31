import express from 'express';
import { registrarUsuario, iniciarSesion, cerrarSesion } from '../controller/authController.js';
import { user } from '../models/user.js'; 

const router = express.Router();


// RENDERIZADO DE VISTAS (PUG)

router.get('/login', (req, res) => res.render('auth/login'));
router.get('/signup', (req, res) => res.render('auth/signup')); 


// PROCESAMIENTO DE ACCIONES (CONTROLADORES)

router.post('/signup', registrarUsuario);
router.post('/login', iniciarSesion);
router.get('/logout', cerrarSesion);

// VALIDACIONES ASINCRONAS

//Atiende la petición /auth/revisarEmail
router.get("/revisarEmail", async (req, res) => {
    try {
        const { email } = req.query;
        const existe = await user.findOne({ where: { email: email } });
        return res.json({ respuesta: existe ? true : false });
    } catch (error) {
        console.error("❌ Error al revisar email asíncrono:", error);
        return res.status(500).json({ error: "Error de servidor" });
    }
});

//  Atiende la petición /auth/revisarUsuario
router.get("/revisarUsuario", async (req, res) => {
    try {
        const { usuario } = req.query;
        const existe = await user.findOne({ where: { username: usuario } });
        return res.json({ respuesta: existe ? true : false });
    } catch (error) {
        console.error("❌ Error al revisar usuario asíncrono:", error);
        return res.status(500).json({ error: "Error de servidor" });
    }
});

export default router;