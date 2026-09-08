import { notification } from '../models/notification.js';
import { user } from '../models/user.js';

// Obtener las notificaciones del usuario logueado 
export const obtenerNotificaciones = async (req, res) => {
    try {
        const userId = req.session.user.id;

        const notificaciones = await notification.findAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']],
            limit: 15,
            include: [
                {
                    model: user,
                    as: 'remitente',
                    attributes: ['id', 'username', 'profile_photo'],
                },
            ],
        });

        const noLeidas = await notification.count({
            where: { user_id: userId, is_read: false },
        });

        return res.json({
            success: true,
            notificaciones,
            noLeidas,
        });
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Marcar una o todas como leídas
export const marcarComoLeida = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id } = req.params;

        if (id === 'todas') {
            await notification.update(
                { is_read: true },
                { where: { user_id: userId, is_read: false } }
            );
        } else {
            await notification.update(
                { is_read: true },
                { where: { id, user_id: userId } }
            );
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('Error al marcar notificación:', error);
        return res.status(500).json({ success: false, message: 'Error al actualizar' });
    }
};