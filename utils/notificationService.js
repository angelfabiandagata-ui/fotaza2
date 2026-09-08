import { notification } from '../models/notification.js';

/**
 * Crea una notificación en la base de datos
 * @param {Object} data
 * @param {number} data.userId - Destinatario
 * @param {number} data.senderId - Quien realiza la acción
 * @param {string} data.type - 'FOLLOW' | 'RATING' | 'COLLECTION' | 'COMMENT'
 * @param {string} data.message - Texto legible
 * @param {string} data.url - Enlace a donde debe llevar al hacer clic
 */
export const crearNotificacion = async ({ userId, senderId, type, message, url }) => {
    try {
        // Evitar notificaciones a uno mismo 
        if (userId === senderId) return null;

        return await notification.create({
            user_id: userId,
            sender_id: senderId,
            type,
            message,
            url,
            is_read: false,
        });
    } catch (error) {
        // Loguear error sin frenar el flujo principal de la petición
        console.error('Error al registrar notificación:', error);
        return null;
    }
};