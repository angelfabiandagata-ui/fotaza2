import { complaint_image } from '../models/complaint_image.js';
import { complaint_comment } from '../models/complaint_comment.js';
import { image } from '../models/image.js';
import { publication } from '../models/publication.js';
import { comment } from '../models/comment.js';
import { user } from '../models/user.js';
import { crearNotificacion } from '../utils/notificationService.js';

// Registrar denuncia sobre una imagen
export const denunciarImagen = async (req, res) => {
    try {
        const { imageId, reason, description } = req.body;
        const userId = req.session.user.id;

        if (!reason || !description || description.trim() === '') {
            return res.status(400).json({ success: false, message: "El motivo y la justificación son obligatorios" });
        }

        // 1. Obtener la imagen y su publicación asociada
        const foto = await image.findByPk(imageId, {
            include: [{ model: publication, as: 'publication' }]
        });

        if (!foto || !foto.publication) {
            return res.status(404).json({ success: false, message: "Imagen o publicación no encontrada" });
        }

        const autorId = foto.publication.user_id;

        // Evitar auto-denuncia
        if (autorId === userId) {
            return res.status(400).json({ success: false, message: "No puedes denunciar tu propia imagen" });
        }

        // 2. Evitar denuncias duplicadas del mismo usuario
        const denunciaPrevia = await complaint_image.findOne({
            where: { image_id: imageId, user_id: userId }
        });

        if (denunciaPrevia) {
            return res.status(400).json({ success: false, message: "Ya has enviado una denuncia para esta imagen" });
        }

        // 3. Crear el registro de denuncia
        await complaint_image.create({
            image_id: parseInt(imageId),
            user_id: userId,
            reason,
            description: description.trim()
        });

        // 4. Incrementar contador en la publicación
        await publication.increment('number_complaints', { 
            by: 1, 
            where: { id: foto.post_id } 
        });

        // 5. MODERACIÓN AUTOMÁTICA DE LA PUBLICACIÓN (Umbral: 3 denuncias)
        const postActualizado = await publication.findByPk(foto.post_id, {
            attributes: ['id', 'title', 'state', 'number_complaints']
        });

        if (postActualizado && postActualizado.number_complaints >= 3 && postActualizado.state !== false) {
            await publication.update({ state: false }, { where: { id: postActualizado.id } });

            try {
                await crearNotificacion({
                    userId: autorId,
                    senderId: userId,
                    type: 'MODERATION',
                    message: `Tu publicación "${postActualizado.title || 'Foto'}" fue dada de baja automáticamente tras recibir 3 denuncias.`,
                    url: '/perfil'
                });
            } catch (notifErr) {
                console.error("Error al notificar baja de publicación:", notifErr);
            }
        }

        // 6. MODERACIÓN AUTOMÁTICA DEL USUARIO (Umbral: 3 denuncias recibidas en total)
        // Contamos todas las denuncias en imágenes pertenecientes a este autor
        const totalDenunciasUsuario = await complaint_image.count({
            include: [{
                model: image,
                required: true,
                include: [{
                    model: publication,
                    required: true,
                    where: { user_id: autorId }
                }]
            }]
        });

        if (totalDenunciasUsuario >= 3) {
            await user.update({ state: false }, { where: { id: autorId } });
        }

        return res.json({ success: true, message: "Denuncia registrada correctamente" });

    } catch (error) {
        console.error("Error al denunciar imagen:", error);
        return res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// Panel del Validador de Contenidos: Publicaciones con más de 3 denuncias de distintos usuarios
export const panelValidador = async (req, res) => {
    try {
        // Obtenemos publicaciones con imágenes que tengan más de 3 denuncias
        const publicacionesEnRevision = await publication.findAll({
            where: { state: true },
            include: [
                {
                    model: image,
                    as: 'images',
                    required: true,
                    include: [
                        {
                            model: complaint_image,
                            as: 'denuncias',
                            where: { state: 'pendiente' },
                            include: [{ model: user, as: 'denunciante', attributes: ['username'] }]
                        }
                    ]
                },
                {
                    model: user,
                    as: 'usuarioCreador',
                    attributes: ['id', 'username', 'number_publications_removed']
                }
            ]
        });

        // Filtramos aquellas imágenes que efectivamente tengan más de 3 denuncias
        const listaTrabajo = publicacionesEnRevision.filter(p => 
            p.images.some(img => img.denuncias && img.denuncias.length > 2)
        );

        res.render('admin/moderacion', {
            publicaciones: listaTrabajo,
            userLogueado: req.session.user
        });
    } catch (error) {
        console.error("Error al cargar panel validador:", error);
        res.status(500).send("Error al cargar lista de trabajo.");
    }
};

// Acción del Validador: Dar de baja la publicación
export const darDeBajaPublicacion = async (req, res) => {
    try {
        const { postId } = req.body;
        const post = await publication.findByPk(postId);
        if (!post) return res.status(404).json({ success: false, message: "Publicación no encontrada" });

        // Ocultamos la publicación
        post.state = false;
        await post.save();

        // Incrementamos el contador de publicaciones eliminadas del autor
        const autor = await user.findByPk(post.user_id);
        if (autor) {
            autor.number_publications_removed += 1;
            
            // Si el autor tiene 3 o más publicaciones eliminadas, desactivamos su cuenta
            if (autor.number_publications_removed >= 3) {
                autor.state = false;
            }
            await autor.save();
        }

        return res.json({ 
            success: true, 
            message: "Publicación dada de baja exitosamente" 
        });
    } catch (error) {
        console.error("Error al dar de baja publicación:", error);
        return res.status(500).json({ success: false, message: "Error al procesar la baja" });
    }
};

// Acción del Validador: Desestimar denuncias
export const desestimarDenuncias = async (req, res) => {
    try {
        const { imageId } = req.body;
        await complaint_image.update(
            { state: 'desestimada' },
            { where: { image_id: imageId, state: 'pendiente' } }
        );

        return res.json({ success: true, message: "Denuncias desestimadas" });
    } catch (error) {
        console.error("Error al desestimar denuncias:", error);
        return res.status(500).json({ success: false, message: "Error al desestimar denuncias" });
    }
};

// Registrar denuncia sobre un comentario con notificación al autor
export const denunciarComentario = async (req, res) => {
    try {
        const { commentId, reason, description } = req.body;
        const userId = req.session.user.id;

        if (!reason || !description || description.trim() === '') {
            return res.status(400).json({ success: false, message: "Completá motivo y justificación" });
        }

        // 1. Buscamos el comentario incluyendo la publicación para armar la URL de la notificación
        const comentario = await comment.findByPk(commentId, {
            include: [{
                model: image,
                include: [{ model: publication }]
            }]
        });

        if (!comentario) {
            return res.status(404).json({ success: false, message: "Comentario no encontrado" });
        }

        // El autor no puede denunciar sus propios comentarios
        if (comentario.user_id === userId) {
            return res.status(400).json({ success: false, message: "No podés denunciar tu propio comentario" });
        }

        const previa = await complaint_comment.findOne({
            where: { comment_id: commentId, user_id: userId }
        });

        if (previa) {
            return res.status(400).json({ success: false, message: "Ya denunciaste este comentario" });
        }

        // 2. Registrar denuncia
        await complaint_comment.create({
            comment_id: parseInt(commentId),
            user_id: userId,
            reason,
            description: description.trim(),
            state: 'pendiente'
        });

        // 3. NOTIFICAR AL AUTOR DEL COMENTARIO
        try {
            const postId = (comentario.image && comentario.image.publication) 
                ? comentario.image.publication.id 
                : null;
            
            const urlDestino = postId ? `/post/show/${postId}` : '/perfil';

            await crearNotificacion({
                userId: comentario.user_id,                       // Destinatario: el autor del comentario
                senderId: userId,                                 // Emisor: quien denunció
                type: 'REPORT_WARNING',
                message: `Un comentario tuyo recibió una denuncia por "${reason}". Podés revisarlo o eliminarlo.`,
                url: urlDestino
            });
        } catch (notifErr) {
            console.error("Error al notificar denuncia de comentario:", notifErr);
        }

        return res.json({ success: true, message: "Comentario denunciado correctamente" });
    } catch (error) {
        console.error("Error al denunciar comentario:", error);
        return res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// Panel donde el autor ve comentarios denunciados en sus publicaciones
export const verDenunciasComentariosAutor = async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Buscamos comentarios que tengan denuncias pendientes y pertenezcan a posts del usuario
        const denuncias = await complaint_comment.findAll({
            where: { state: 'pendiente' },
            include: [
                {
                    model: comment,
                    as: 'comentario',
                    include: [
                        { model: user, attributes: ['username'] },
                        { 
                            model: image,
                            include: [{
                                model: publication,
                                where: { user_id: userId } // Solo publicaciones del autor logueado
                            }]
                        }
                    ]
                },
                {
                    model: user,
                    as: 'denunciante',
                    attributes: ['username']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Filtrar nulos en caso de que alguna relación no coincida
        const listaFiltrada = denuncias.filter(d => d.comentario && d.comentario.image && d.comentario.image.publication);

        res.render('post/denuncias-comentarios', {
            denuncias: listaFiltrada,
            userLogueado: req.session.user
        });
    } catch (error) {
        console.error("Error al cargar panel de denuncias de comentarios:", error);
        res.status(500).send("Error al cargar denuncias.");
    }
};  

export const eliminarComentario = async (req, res) => {
    try {
        const { commentId } = req.body;
        const currentUserId = req.session.user ? req.session.user.id : null;

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "No autorizado" });
        }

        // Buscamos el comentario incluyendo la imagen y la publicación para validar permisos
        const comentario = await comment.findByPk(commentId, {
            include: [{
                model: image,
                include: [{ model: publication }]
            }]
        });

        if (!comentario) {
            return res.status(404).json({ success: false, message: "El comentario no existe" });
        }

        const autorComentario = comentario.user_id;
        const duenioPost = comentario.image && comentario.image.publication 
            ? comentario.image.publication.user_id 
            : null;

        // Permiso: solo el autor del comentario O el dueño del post pueden borrarlo
        if (currentUserId !== autorComentario && currentUserId !== duenioPost) {
            return res.status(403).json({ success: false, message: "No tienes permiso para eliminar este comentario" });
        }

        // Eliminamos primero las denuncias asociadas a este comentario para evitar errores de clave foránea
        await complaint_comment.destroy({ where: { comment_id: commentId } });

        // Eliminamos el comentario
        await comentario.destroy();

        return res.json({ success: true, message: "Comentario eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar comentario:", error);
        return res.status(500).json({ success: false, message: "Error interno al eliminar comentario" });
    }
};

