import { complaint_image } from '../models/complaint_image.js';
import { complaint_comment } from '../models/complaint_comment.js';
import { image } from '../models/image.js';
import { publication } from '../models/publication.js';
import { comment } from '../models/comment.js';
import { user } from '../models/user.js';

// Registrar denuncia sobre una imagen
export const denunciarImagen = async (req, res) => {
    try {
        const { imageId, reason, description } = req.body;
        const userId = req.session.user.id;

        if (!reason || !description || description.trim() === '') {
            return res.status(400).json({ success: false, message: "El motivo y la justificación son obligatorios" });
        }

        // Evitar que el mismo usuario denuncie dos veces la misma imagen
        const denunciaPrevia = await complaint_image.findOne({
            where: { image_id: imageId, user_id: userId }
        });

        if (denunciaPrevia) {
            return res.status(400).json({ success: false, message: "Ya has enviado una denuncia para esta imagen" });
        }

        await complaint_image.create({
            image_id: imageId,
            user_id: userId,
            reason,
            description
        });

        // Actualizamos contador en la publicacion
        const foto = await image.findByPk(imageId);
        if (foto) {
            await publication.increment('number_complaints', { by: 1, where: { id: foto.post_id } });
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
            p.images.some(img => img.denuncias && img.denuncias.length > 3)
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

// Registrar denuncia sobre un comentario
export const denunciarComentario = async (req, res) => {
    try {
        const { commentId, reason, description } = req.body;
        const userId = req.session.user.id;

        if (!reason || !description || description.trim() === '') {
            return res.status(400).json({ success: false, message: "Completá motivo y justificación" });
        }

        const comentario = await comment.findByPk(commentId);
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

        await complaint_comment.create({
            comment_id: commentId,
            user_id: userId,
            reason,
            description,
            state: 'pendiente'
        });

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

// Acción del autor: Borrar el comentario denunciado
export const borrarComentarioDenunciado = async (req, res) => {
    try {
        const { commentId } = req.body;
        const userId = req.session.user.id;

        const com = await comment.findByPk(commentId, {
            include: [{
                model: image,
                include: [{ model: publication }]
            }]
        });

        if (!com) {
            return res.status(404).json({ success: false, message: "Comentario no encontrado" });
        }

        // Validar que quien borra sea el dueño del post
        if (com.image.publication.user_id !== userId) {
            return res.status(403).json({ success: false, message: "No tenés permiso para moderar este comentario" });
        }

        // Eliminamos las denuncias asociadas y el comentario
        await complaint_comment.destroy({ where: { comment_id: commentId } });
        await com.destroy();

        return res.json({ success: true, message: "Comentario eliminado correctamente" });
    } catch (error) {
        console.error("Error al borrar comentario:", error);
        return res.status(500).json({ success: false, message: "Error al borrar comentario" });
    }
};