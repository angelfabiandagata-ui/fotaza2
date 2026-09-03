import bcrypt from 'bcrypt';
import { user } from '../models/user.js'; 

//REGISTRO DE USUARIOS

export const registrarUsuario = async (req, res) => {
    try {
        const { usuario, email, contrasenia } = req.body;

        // Validamos duplicados en la base de datos
        const usuarioExiste = await user.findOne({ where: { email } });
        if (usuarioExiste) {
            return res.render('auth/signup', { error: 'El correo electronico ya esta registrado' });
        }

        // Encriptamos la contraseña
        const hashedPassword = await bcrypt.hash(contrasenia, 10);

        //  Insertamos en la base de datos 
        await user.create({
            username: usuario,       
            email: email,           
            password: hashedPassword 
        });

        return res.redirect('/auth/login');

    } catch (error) {
        console.error(" Error crítico en el proceso de registro:", error);
        return res.status(500).send("Error interno al intentar registrarse.");
    }
};


//  INICIO DE SESIoN (LOGIN)

export const iniciarSesion = async (req, res) => {
    try {
        // verificamos que el usuario exista y que la contraseña sea correcta
        const { email, contrasenia } = req.body; 

        // 1Buscamos al usuario por email
        const usuarioEncontrado = await user.findOne({ where: { email } });
        if (!usuarioEncontrado) {
            return res.render('auth/login', { error: 'Credenciales incorrectas' });
        }

        // Comparamos el input 
        const passwordCorrecto = await bcrypt.compare(contrasenia, usuarioEncontrado.password);
        if (!passwordCorrecto) {
            return res.render('auth/login', { error: 'Credenciales incorrectas' });
        }

        // ÉXITO
        req.session.user = {
            id: usuarioEncontrado.id,
            username: usuarioEncontrado.username,
            email: usuarioEncontrado.email
        };

        return res.redirect('/explorar');
    } catch (error) {
        console.error("Error en el proceso de login:", error);
        return res.status(500).send("Error interno al iniciar sesion");
    }
};

// VALIDACIONES ASINCRONAS
export const verificarEmailDisponible = async (req, res) => {
    try {
        const { email } = req.query;
        const existe = await user.revisarEmail(email);
        return res.json({ respuesta: existe });
    } catch (error) {
        console.error("Error al revisar email asíncrono:", error);
        return res.status(500).json({ error: "Error de servidor" });
    }
};

export const verificarUsuarioDisponible = async (req, res) => {
    try {
        const { usuario } = req.query;
        const existe = await user.revisarUsuario(usuario);
        return res.json({ respuesta: existe });
    } catch (error) {
        console.error("Error al revisar usuario asíncrono:", error);
        return res.status(500).json({ error: "Error de servidor" });
    }
};

// CERRAR SESION (LOGOUT)
export const cerrarSesion = async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(" No se pudo cerrar la sesión de forma correcta:", err);
        }
        res.clearCookie('connect.sid'); 
        return res.redirect('/auth/login');
    });
};