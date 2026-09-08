import { Op } from 'sequelize';
import { message } from '../models/message.js';
import { user } from '../models/user.js';
import { image } from '../models/image.js';
import { publication } from '../models/publication.js';
import { crearNotificacion } from '../utils/notificationService.js';

// Botón "Me interesa"
export const manifestarInteres = async (req, res) => {
    try {
        const { imageId } = req.body;
        const remitenteId = req.session.user.id;
        const remitenteUsername = req.session.user.username || 'Un usuario';

        const foto = await image.findByPk(imageId, {
            include: [{ model: publication, as: 'publication' }]
        });

        if (!foto || !foto.publication) {
            return res.status(404).json({ success: false, message: 'Imagen o publicación no encontrada' });
        }

        const autorId = foto.publication.user_id;

        if (autorId === remitenteId) {
            return res.status(400).json({ success: false, message: 'No puedes comprar tu propia imagen' });
        }

        // Mensaje automático inicial en el chat
        await message.create({
            user_id_emisor: remitenteId,
            user_id_receptor: autorId,
            content: `¡Hola! Me interesa adquirir tu imagen: "${foto.publication.title}"`,
            read: false
        });

        // NOTIFICACIÓN AL AUTOR
        try {
            const tituloPost = foto.publication.title 
                ? `"${foto.publication.title}"` 
                : 'tu imagen';

            await crearNotificacion({
                userId: autorId,                                      // Destinatario: el autor de la foto
                senderId: remitenteId,                                // Emisor: quien presionó "Me interesa"
                type: 'INTEREST',
                message: `@${remitenteUsername} mostró interés en adquirir ${tituloPost}`,
                url: `/mensajes?con=${remitenteId}`                   // Enlace directo al chat con el interesado
            });
        } catch (notifErr) {
            console.error('Error al generar notificación de interés:', notifErr);
            // No interrumpe la respuesta al cliente
        }

        return res.json({ success: true, redirectUrl: `/mensajes?con=${autorId}` });
    } catch (error) {
        console.error('Error al manifestar interés:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};


// Ver bandeja de entrada / chat con otro usuario
export const verMensajes = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const otroUsuarioId = req.query.con ? parseInt(req.query.con) : null;

        // Traemos todos los mensajes donde participa el usuario logueado
        const mensajesTodos = await message.findAll({
            where: {
                [Op.or]: [
                    { user_id_emisor: userId },
                    { user_id_receptor: userId }
                ]
            },
            include: [
                { model: user, as: 'emisor', attributes: ['id', 'username'] },
                { model: user, as: 'receptor', attributes: ['id', 'username'] }
            ],
            order: [['createdAt', 'ASC']]
        });

        // Filtrar usuarios con los que se conversó
        const contactosMap = new Map();
        mensajesTodos.forEach(m => {
            const contacto = m.user_id_emisor === userId ? m.receptor : m.emisor;
            if (contacto && !contactosMap.has(contacto.id)) {
                contactosMap.set(contacto.id, contacto);
            }
        });
        const contactos = Array.from(contactosMap.values());

        // Mensajes de la conversación activa
        const mensajesChat = otroUsuarioId 
            ? mensajesTodos.filter(m => 
                (m.user_id_emisor === userId && m.user_id_receptor === otroUsuarioId) ||
                (m.user_id_emisor === otroUsuarioId && m.user_id_receptor === userId)
              )
            : [];

        const contactoActivo = contactos.find(c => c.id === otroUsuarioId) || null;

        return res.render('mensajes', {
            contactos,
            mensajesChat,
            contactoActivo,
            userLogueado: req.session.user
        });
    } catch (error) {
        console.error('Error al cargar mensajes:', error);
        return res.status(500).send('Error al cargar la mensajería');
    }
};

// Enviar un mensaje de respuesta
export const enviarMensaje = async (req, res) => {
    try {
        const { receptorId, content } = req.body;
        const emisorId = req.session.user.id;

        if (!content || content.trim() === '') {
            return res.redirect(`/mensajes?con=${receptorId}`);
        }

        await message.create({
            user_id_emisor: emisorId,
            user_id_receptor: parseInt(receptorId),
            content: content.trim(),
            read: false
        });

        return res.redirect(`/mensajes?con=${receptorId}`);
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        return res.status(500).send('Error al enviar el mensaje');
    }
};