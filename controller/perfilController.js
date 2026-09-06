import { user } from '../models/user.js';
import { publication } from '../models/publication.js';
import { image } from '../models/image.js';
import { follower } from '../models/follower.js';
import { collection } from '../models/collection.js';

// MOSTRAR PERFIL DE USUARIO
export const mostrarPerfil = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.redirect('/auth/login');
        }

        const userId = req.session.user.id;

        const usuarioEncontrado = await user.findByPk(userId);
        if (!usuarioEncontrado) {
            return res.status(404).send("Error: El usuario de la sesión no existe en la DB");
        }

        // Publicaciones propias con imágenes
        const misFotosReales = await publication.findAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']], 
            include: [{ 
                model: image, 
                as: 'images' 
            }]
        });

        // Colecciones del usuario con publicaciones e imágenes asociadas
        const misColecciones = await collection.findAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']],
            include: [{
                model: publication,
                include: [{ 
                    model: image, 
                    as: 'images' 
                }]
            }]
        });

        // Contadores de seguidores y seguidos
        const cantSeguidores = await follower.count({ where: { followed_id: userId } });
        const cantSeguidos = await follower.count({ where: { follower_id: userId } });

        // Normalización de datos para Pug
        const usuarioLimpio = usuarioEncontrado.get({ plain: true });
        const publicacionesLimpias = misFotosReales.map(p => p.get({ plain: true }));
        const coleccionesLimpias = misColecciones.map(c => c.get({ plain: true }));

        return res.render("perfil", { 
            usuario: usuarioLimpio, 
            userLogueado: req.session.user, 
            publicaciones: publicacionesLimpias,
            colecciones: coleccionesLimpias,
            seguidoresCount: cantSeguidores, 
            seguidosCount: cantSeguidos
        });

    } catch (error) {
        console.error("Error en mostrarPerfil:", error);
        return res.status(500).send("Error interno del servidor al cargar el perfil");
    }
};

// CAMBIAR AVATAR (ASÍNCRONO)
export const cambiarAvatarAsincronico = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: "No autorizado" });
        }

        const userId = req.session.user.id;
        const { avatar } = req.body; 

        if (!avatar) {
            return res.status(400).json({ success: false, message: "No se envió ninguna imagen" });
        }

        const usuario = await user.findByPk(userId);
        if (!usuario) {
            return res.status(404).json({ success: false, message: "Usuario no encontrado" });
        }

        usuario.profile_photo = avatar;
        await usuario.save();

        // Conserva el objeto previo (incluyendo role) y solo actualiza profile_photo
        req.session.user = {
            ...req.session.user,
            profile_photo: usuario.profile_photo
        };
        
        req.session.save((err) => {
            if (err) {
                console.error("Error al guardar sesión:", err);
                return res.status(500).json({ success: false, message: "Error al guardar la sesión" });
            }
            return res.json({ success: true, avatarUrl: usuario.profile_photo });
        });

    } catch (error) {
        console.error("Error en cambiarAvatarAsincronico:", error);
        return res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};