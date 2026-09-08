import { Op } from 'sequelize';
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

        //  Publicaciones propias del usuario
        const misFotosReales = await publication.findAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']], 
            include: [{ model: image, as: 'images' }]
        });

        //  Colecciones del usuario
        const misColecciones = await collection.findAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']],
            include: [{
                model: publication,
                include: [{ model: image, as: 'images' }]
            }]
        });

        //  Contadores de seguidores y seguidos
        const cantSeguidores = await follower.count({ where: { followed_id: userId } });
        const cantSeguidos = await follower.count({ where: { follower_id: userId } });

        //  Obtener publicaciones de las cuentas que sigue el usuario
        // Buscamos a quiénes sigue 
        const seguidos = await follower.findAll({
            where: { follower_id: userId },
            attributes: ['followed_id']
        });

        const idsSeguidos = seguidos.map(s => s.followed_id);

        let publicacionesSeguidos = [];
        if (idsSeguidos.length > 0) {
            publicacionesSeguidos = await publication.findAll({
                where: {
                    user_id: { [Op.in]: idsSeguidos }
                },
                order: [['createdAt', 'DESC']],
                include: [
                    { 
                model: image, 
                as: 'images' 
            },
            { 
                model: user, 
                as: 'usuarioCreador', 
                attributes: ['id', 'username', 'profile_photo'] 
            }
                ],
                limit: 20 // Traemos las 20 más recientes
            });
        }

        // Normalizar objetos planos para Pug
        const usuarioLimpio = usuarioEncontrado.get({ plain: true });
        const publicacionesLimpias = misFotosReales.map(p => p.get({ plain: true }));
        const coleccionesLimpias = misColecciones.map(c => c.get({ plain: true }));
        const feedSeguidosLimpio = publicacionesSeguidos.map(p => p.get({ plain: true }));

        return res.render("perfil", { 
            usuario: usuarioLimpio, 
            userLogueado: req.session.user, 
            publicaciones: publicacionesLimpias,
            colecciones: coleccionesLimpias,
            publicacionesSeguidos: feedSeguidosLimpio,
            seguidoresCount: cantSeguidores, 
            seguidosCount: cantSeguidos,
            esMiPerfil: true
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

//Ver otros perfiles
export const verPerfilPorId = async (req, res) => {
    try {
        const perfilId = parseInt(req.params.id);
        const currentUserId = req.session && req.session.user ? req.session.user.id : null;

        // Si el usuario hace clic en su propio perfil por ID, lo redirigimos a /perfil
        if (currentUserId && perfilId === currentUserId) {
            return res.redirect('/perfil');
        }

        // 1. Buscar al usuario del perfil
        const usuarioEncontrado = await user.findByPk(perfilId, {
            attributes: ['id', 'username', 'email', 'profile_photo', 'role']
        });

        if (!usuarioEncontrado) {
            return res.status(404).render('error', { message: "Usuario no encontrado" });
        }

        // 2. Sus fotos públicas activas
        const fotos = await publication.findAll({
            where: { user_id: perfilId, state: true },
            order: [['createdAt', 'DESC']],
            include: [{ model: image, as: 'images' }]
        });

        // 3. Sus colecciones que sean PÚBLICAS
        const colecciones = await collection.findAll({
            where: { user_id: perfilId, public: true },
            order: [['createdAt', 'DESC']],
            include: [{
                model: publication,
                include: [{ model: image, as: 'images' }]
            }]
        });

        // 4. Contadores
        const cantSeguidores = await follower.count({ where: { followed_id: perfilId } });
        const cantSeguidos = await follower.count({ where: { follower_id: perfilId } });

        // 5. Saber si el usuario logueado ya sigue a este perfil
        let loSigo = false;
        if (currentUserId) {
            const existeFollow = await follower.findOne({
                where: { follower_id: currentUserId, followed_id: perfilId }
            });
            loSigo = !!existeFollow;
        }

        return res.render("perfil", {
            usuario: usuarioEncontrado.get({ plain: true }),
            userLogueado: req.session ? req.session.user : null,
            publicaciones: fotos.map(f => f.get({ plain: true })),
            colecciones: colecciones.map(c => c.get({ plain: true })),
            seguidoresCount: cantSeguidores,
            seguidosCount: cantSeguidos,
            esMiPerfil: false, 
            loSigo: loSigo      // Para pintar el botón Seguir / Dejar de seguir
        });

    } catch (error) {
        console.error("Error al ver perfil por ID:", error);
        return res.status(500).send("Error del servidor");
    }
};