import { user } from '../models/user.js';
import { publication } from '../models/publication.js';
import { image } from '../models/image.js';
import { follower } from '../models/follower.js';

//  MOSTRAR PERFIL DE USUARIO
export const mostrarPerfil = async (req, res) => {
    try {
        // Valida seguridad de sesion activa
        if (!req.session || !req.session.user) {
            return res.redirect('/auth/login');
        }

        const userId = req.session.user.id;

        // Buscamos el usuario en la base de datos 
        const usuarioEncontrado = await user.findByPk(userId);
        if (!usuarioEncontrado) {
            return res.status(404).send("Error: El usuario de la sesion no existe en la DB");
        }

        // Traemos las publicaciones con sus respectivas imágenes asociadas
        const misFotosReales = await publication.findAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']], 
            include: [{ 
                model: image, 
                as: 'images' 
            }]
        });

        // Contadores de seguidores y seguidos 
        const cantSeguidores = await follower.count({ where: { followed_id: userId } });
        const cantSeguidos = await follower.count({ where: { follower_id: userId } });

        // Limpiamos los datos para Pug
        const usuarioLimpio = usuarioEncontrado.get({ plain: true });
        const publicacionesLimpias = misFotosReales.map(p => p.get({ plain: true }));

        // Renderizar la vista pasando los datos puros
        return res.render("perfil", { 
            usuario: usuarioLimpio, 
            userLogueado: req.session.user, 
            publicaciones: publicacionesLimpias, 
            seguidoresCount: cantSeguidores, 
            seguidosCount: cantSeguidos
        });

    } catch (error) {
        console.error("Error en mostrarPerfil:", error);
        return res.status(500).send("Error interno del servidor al cargar el perfi");
    }
};


//  CAMBIAR AVATAR (ASÍNCRONICO)
export const cambiarAvatarAsincronico = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: "No autorizado" });
        }

        const userId = req.session.user.id;
        const { avatar } = req.body; 

        if (!avatar) {
            return res.status(400).json({ success: false, message: "No se envio ninguna imagen" });
        }

        const usuario = await user.findByPk(userId);
        if (!usuario) {
            return res.status(404).json({ success: false, message: "Usuario no encontrado" });
        }

        // Actualizamos la columna correspondiente de la tabla user
        usuario.profile_photo = avatar;
        await usuario.save();

        // Refrescamos la sesion del usuario en el servidor con los datos actualizados
        req.session.user = {
            id: usuario.id,
            username: usuario.username,
            email: usuario.email,
            profile_photo: usuario.profile_photo
        };
        
        // Forzamos el guardado de la sesion antes de responder al fetch
        req.session.save((err) => {
            if (err) {
                console.error("Error al guardar sesion:", err);
                return res.status(500).json({ success: false, message: "Error al guardar la sesion" });
            }
            return res.json({ success: true, avatarUrl: usuario.profile_photo });
        });

    } catch (error) {
        console.error(" Error en cambiarAvatarAsincronico:", error);
        return res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};
