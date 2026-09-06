import { collection } from '../models/collection.js';
import { publication } from '../models/publication.js';
import { image } from '../models/image.js';
import { collectionPublication } from '../models/collectionPublication.js';

// Crear colección (ej: "Favoritos", "Paisajes", "Ideas")
export const crearColeccion = async (req, res) => {
    try {
        const { title, category, isPublic } = req.body;
        const userId = req.session.user.id;

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: 'El título es obligatorio' });
        }

        const nueva = await collection.create({
            title: title.trim(),
            category: category || null,
            public: Boolean(isPublic),
            user_id: userId
        });

        return res.json({ success: true, message: 'Colección creada con éxito.', collection: nueva });
    } catch (error) {
        console.error("Error al crear colección:", error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Guardar una publicación dentro de una colección
export const guardarEnColeccion = async (req, res) => {
    try {
        const { collectionId, postId } = req.body;
        const userId = req.session.user.id;

        // Validamos que la colección pertenezca al usuario logueado
        const col = await collection.findOne({
            where: { id: collectionId, user_id: userId }
        });

        if (!col) {
            return res.status(404).json({ success: false, message: 'Colección no encontrada' });
        }

        // Verificamos que no exista previamente 
        const yaExiste = await collectionPublication.findOne({
            where: { collection_id: collectionId, post_id: postId }
        });

        if (yaExiste) {
            return res.status(400).json({ success: false, message: 'Esta publicación ya está guardada en esta colección' });
        }

        await collectionPublication.create({
            collection_id: collectionId,
            post_id: postId
        });

        return res.json({ success: true, message: 'Publicación guardada en la colección' });
    } catch (error) {
        console.error("Error al guardar en colección:", error);
        return res.status(500).json({ success: false, message: 'Error al procesar la solicitud' });
    }
};

// Listar colecciones del usuario 
export const obtenerMisColecciones = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const misColecciones = await collection.findAll({
            where: { user_id: userId },
            include: [{
                model: publication,
                include: [{
                    model: image,
                    as: 'images' 
                }]
            }]
        });

        return res.json({ success: true, colecciones: misColecciones });
    } catch (error) {
        console.error("Error al obtener colecciones:", error);
        return res.status(500).json({ success: false, message: 'Error al obtener colecciones' });
    }
};

export const verDetalleColeccion = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.session.user ? req.session.user.id : null;

        // Buscamos la colección incluyendo sus publicaciones y las imágenes de cada una
        const col = await collection.findByPk(id, {
            include: [{
                model: publication,
                include: [{
                    model: image,
                    as: 'images' 
                }]
            }]
        });

        if (!col) {
            return res.status(404).render('error', { 
                mensaje: "La colección solicitada no existe." 
            });
        }

        // Validación de privacidad: si es privada y no pertenece al usuario logueado, se bloquea
        if (!col.public && col.user_id !== currentUserId) {
            return res.status(403).render('error', { 
                mensaje: "Esta colección es privada." 
            });
        }

        return res.render('coleccionDetalle', {
            coleccion: col.get({ plain: true }),
            userLogueado: req.session.user
        });

    } catch (error) {
        console.error("Error al obtener detalle de colección:", error);
        return res.status(500).send("Error interno del servidor al cargar la colección.");
    }
};

// QUITAR UNA PUBLICACIÓN DE LA COLECCIÓN
export const removerPublicacionDeColeccion = async (req, res) => {
    try {
        const { collectionId, postId } = req.body;
        const userId = req.session.user.id;

        // Validamos que la colección pertenezca al usuario logueado
        const col = await collection.findOne({
            where: { id: collectionId, user_id: userId }
        });

        if (!col) {
            return res.status(403).json({ success: false, message: "No tienes permiso para modificar esta colección" });
        }

        // Eliminamos el vínculo de la tabla intermedia
        const resultado = await collectionPublication.destroy({
            where: {
                collection_id: collectionId,
                post_id: postId
            }
        });

        if (resultado > 0) {
            return res.json({ success: true, message: "Publicación eliminada de la colección" });
        } else {
            return res.status(404).json({ success: false, message: "La publicación no estaba en esta colección" });
        }
    } catch (error) {
        console.error("Error al quitar post de colección:", error);
        return res.status(500).json({ success: false, message: "Error interno al procesar la solicitud" });
    }
};

// ELIMINAR LA COLECCIÓN COMPLETA
export const eliminarColeccion = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user.id;

        const col = await collection.findOne({
            where: { id, user_id: userId }
        });

        if (!col) {
            return res.status(404).json({ success: false, message: "Colección no encontrada o no autorizada" });
        }

        // Limpiamos los vínculos de la tabla intermedia primero
        await collectionPublication.destroy({
            where: { collection_id: id }
        });

        // Eliminamos la colección
        await col.destroy();

        return res.json({ success: true, message: "Colección eliminada correctamente" });
    } catch (error) {
        console.error("Error al eliminar colección:", error);
        return res.status(500).json({ success: false, message: "Error interno al eliminar la colección" });
    }
};