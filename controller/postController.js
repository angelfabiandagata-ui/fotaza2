import { Op, Sequelize } from "sequelize";
import sequelize from '../models/config.js';
import { publication } from '../models/publication.js';
import { image } from '../models/image.js';
import { comment } from '../models/comment.js';
import { user } from '../models/user.js';
import { label } from '../models/label.js';
import { follower } from '../models/follower.js';
import { assessment } from '../models/assessment.js';
import { crearNotificacion } from '../utils/notificationService.js'; 

//  FORMULARIO NUEVA PUBLICACIÓN
export const formularioNuevaPublicacion = (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/auth/login');
    }
    return res.render('post/new-post', { userLogueado: req.session.user });
};

// CREAR PUBLICACIÓN 

export const crearPublicacion = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        if (!req.session || !req.session.user) {
            await t.rollback();
            return res.status(401).json({ 
                success: false, 
                message: "Sesión expirada. Por favor, inicia sesión nuevamente" 
            });
        }

        const { titulo, descripcion, imagenesInput, labels, hasLicense, watermarkInput } = req.body;
        const userIdLogueado = req.session.user.id;

        if (!imagenesInput) {
            await t.rollback();
            return res.status(400).json({ 
                success: false, 
                message: "No se cargó ninguna foto." 
            });
        }

        const listaImagenesBase64 = JSON.parse(imagenesInput);
        if (listaImagenesBase64.length === 0) {
            await t.rollback();
            return res.status(400).json({ 
                success: false, 
                message: "El post no puede estar vacío" 
            });
        }

        // 2. Insertamos la publicación
        const nuevaPublicacion = await publication.create({
            user_id: userIdLogueado,
            state: true,                                
            title: titulo,                                  
            description: descripcion,                    
            comments_allowed: true,                          
            number_complaints: 0,
            number_assessments: 0,
            average_assessment: 0.0
        }, { transaction: t });

        // Procesamos Licencia y Marca de Agua
        const requiereLicencia = hasLicense === true || hasLicense === 'on';
        const stringMarcaAgua = requiereLicencia && watermarkInput ? watermarkInput : null;

        // Guardamos las imágenes vinculadas a la transacción
        for (const base64Foto of listaImagenesBase64) {
            await image.create({
                post_id: nuevaPublicacion.id,          
                url: base64Foto,                                    
                type: "jpeg",                                        
                copyright: requiereLicencia,                
                license: requiereLicencia,                  
                watermark: stringMarcaAgua                  
            }, { transaction: t });
        }

        // Guardamos las etiquetas vinculadas a la transacción
        if (labels && labels.trim() !== '') {
            const arrayEtiquetas = labels.split(',').map(tag => tag.trim().toLowerCase());
            for (const nombreEtiqueta of arrayEtiquetas) {
                await label.create({
                    post_id: nuevaPublicacion.id,
                    name: nombreEtiqueta
                }, { transaction: t });
            }
        }

        // Confirmamos todos los cambios en la base de datos
        await t.commit();

        return res.json({
            success: true,
            message: "¡Publicación creada con éxito!"
        });

    } catch (error) {
        // Revertimos cualquier inserción previa ante un fallo
        await t.rollback();
        console.error("❌ Error en la creación de publicación:", error);

        // Retornamos el JSON de error con status 500 para destrabar el fetch del cliente
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor al procesar la publicación"
        });
    }
};


//  VER DETALLE DE UNA PUBLICACIÓN

// controllers/postController.js

export const verDetallePublicacion = async (req, res) => {
    try {
        const postId = req.params.id;
        const usuarioLogueado = req.session ? req.session.user : null;

        // Condición, si estas logueado ves todas las fotos, si no, solo las públicas
        const filtroImagenes = usuarioLogueado ? {} : { copyright: false };

        const post = await publication.findByPk(postId, {
            include: [
                {
                    model: image,
                    as: 'images',
                    where: filtroImagenes,
                    required: false, // Si no hay fotos públicas, no rompe la consulta del post
                    include: [
                        {
                            model: comment,
                            as: 'comentarios',
                            include: [{ model: user, attributes: ['id', 'username'] }]
                        },
                        {
                            model: assessment,
                            as: 'valoraciones'
                        }
                    ]
                },
                {
                    model: label,
                    as: 'etiquetas'
                },
                {
                    model: user,
                    as: 'usuarioCreador',
                    attributes: ['id', 'username']
                }
            ]
        });

        if (!post) {
            return res.status(404).send("Publicación no encontrada");
        }

        // Si es usuario anónimo y la publicación no contiene ninguna foto pública
        if (!usuarioLogueado && (!post.images || post.images.length === 0)) {
            return res.render('post/post-privado', {
                title: post.title,
                mensaje: "Esta publicación contiene únicamente fotos protegidas por derechos de autor. Inicia sesión para verlas"
            });
        }

        let yaLoSigue = false;
        let esSuPropioPost = false;

        if (usuarioLogueado) {
            const userIdLogueado = usuarioLogueado.id;
            esSuPropioPost = post.user_id === userIdLogueado;

            if (!esSuPropioPost) {
                const seguimiento = await follower.findOne({
                    where: {
                        follower_id: userIdLogueado,
                        followed_id: post.user_id
                    }
                });
                if (seguimiento) yaLoSigue = true;
            }
        }

        res.render('post/post', {
            publicacion: post,
            imagenesDetalladas: post.images || [],
            etiquetas: post.etiquetas || [],
            yaLoSigue,
            esSuPropioPost,
            userLogueado: usuarioLogueado
        });

    } catch (error) {
        console.error("Error al obtener la publicación:", error);
        res.status(500).send("Error interno del servidor");
    }
};

// COMENTAR UNA FOTO (ASÍNCRONO)
export const crearComentarioFoto = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: "Debes iniciar sesión para comentar" });
        }

        const { imageId, text } = req.body; 
        const userIdLogueado = req.session.user.id;
        const usernameLogueado = req.session.user.username;

        if (!text || text.trim() === '') {
            return res.status(400).json({ success: false, message: "El comentario no puede estar vacío" });
        }

        // 1. Verificamos primero la foto, la publicación y los permisos
        const foto = await image.findByPk(imageId, { include: [{ model: publication }] });
        if (!foto || !foto.publication) {
            return res.status(404).json({
                success: false,
                message: "No se encontró la publicación vinculada a esta imagen"
            });
        }

        if (!foto.publication.comments_allowed) {
            return res.status(403).json({
                success: false,
                message: "Los comentarios para esta publicación han sido cerrados por el autor"
            });
        }

        // 2. Guardamos el comentario
        await comment.create({
            image_id: parseInt(imageId),
            user_id: userIdLogueado,
            content: text.trim(),
            date: new Date()
        });

        // 3. NOTIFICACIÓN AL AUTOR DE LA PUBLICACIÓN
        try {
            const post = foto.publication;
            const textoCorto = text.trim().length > 35 
                ? text.trim().substring(0, 32) + '...' 
                : text.trim();

            await crearNotificacion({
                userId: post.user_id,                          // Destinatario: autor del post
                senderId: userIdLogueado,                      // Emisor: quien comentó
                type: 'COMMENT',
                message: `@${usernameLogueado} comentó: "${textoCorto}"`,
                url: `/post/show/${post.id}`
            });
        } catch (notifErr) {
            console.error("Error al generar la notificación de comentario:", notifErr);
            // No interrumpe la respuesta al cliente
        }

        return res.json({
            success: true, 
            username: usernameLogueado 
        });

    } catch (error) {
        console.error("Error al insertar comentario en la foto:", error);
        return res.status(500).json({ success: false, message: "No se pudo publicar tu comentario" });
    }
};

// Alternar cierre/apertura de comentarios
export const toggleComentarios = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: "No autorizado" });
        }

        const { postId } = req.body;
        const userId = req.session.user.id;

        const post = await publication.findByPk(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: "Publicación no encontrada" });
        }

        // Solo el creador puede abrir/cerrar comentarios
        if (post.user_id !== userId) {
            return res.status(403).json({ success: false, message: "No tienes permiso para modificar esta publicación" });
        }

        post.comments_allowed = !post.comments_allowed;
        await post.save();

        return res.json({
            success: true,
            comments_allowed: post.comments_allowed,
            message: post.comments_allowed ? "Comentarios habilitados" : "Comentarios cerrados"
        });
    } catch (error) {
        console.error("Error al alternar comentarios:", error);
        return res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// VALORAR/VOTAR UNA FOTO (ASÍNCRONO)
export const valorarFoto = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: "Debes iniciar sesión para votar" });
        }

        const { imageId, rating } = req.body; 
        const userIdLogueado = req.session.user.id;

        // 1. Obtener la imagen junto con la publicación para conocer al autor
        const fotoInfo = await image.findByPk(imageId, {
            include: [{
                model: publication,
                attributes: ['id', 'user_id', 'title']
            }]
        });

        if (!fotoInfo || !fotoInfo.publication) {
            return res.status(404).json({ success: false, message: "No se encontró la publicación vinculada a esta imagen" });
        }

        const post = fotoInfo.publication;

        // 2. Bloquear si intenta votar su propia publicación
        if (post.user_id === userIdLogueado) {
            return res.json({
                success: false,
                message: "No puedes valorar tus propias imágenes"
            });
        }

        // 3. Verificar si ya votó previamente
        const votoExistente = await assessment.findOne({
            where: { image_id: imageId, user_id: userIdLogueado }
        });

        if (votoExistente) {
            return res.json({
                success: false,
                message: "Ya has valorado esta imagen"
            });
        }

        // 4. Registrar la valoración
        await assessment.create({
            image_id: parseInt(imageId),
            user_id: userIdLogueado,
            score: parseFloat(rating)
        });

        // 5. Recalcular cantidad de votos y promedio
        const resultado = await assessment.findOne({
            where: { image_id: imageId },
            attributes: [
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'cantidadVotos'],
                [Sequelize.fn('AVG', Sequelize.col('score')), 'promedioReal']
            ],
            raw: true
        });

        const cantidadVotos = parseInt(resultado.cantidadVotos) || 0;
        const nuevoPromedio = parseFloat(resultado.promedioReal || 0).toFixed(1);

        // 6. NOTIFICACIÓN AL AUTOR DE LA PUBLICACIÓN
        try {
            const emisor = req.session.user.username || "Un usuario";

            await crearNotificacion({
                userId: post.user_id,
                senderId: userIdLogueado,
                type: 'RATING',
                message: `@${emisor} puntuó tu publicación con ${rating} ⭐`,
                url: `/post/show/${post.id}`
            });
        } catch (notifErr) {
            console.error("Error al generar la notificación de valoración:", notifErr);
        }

        return res.json({
            success: true,
            nuevoPromedio: nuevoPromedio,
            nuevaCantidad: cantidadVotos
        });

    } catch (error) {
        console.error("Error al procesar la valoración relacional:", error);
        return res.status(500).json({ success: false, message: "Error al registrar tu voto" });
    }
};


// MOTOR DE BÚSQUEDA 
export const explorarContenido = async (req, res) => {
    try {
        const { keyword, tag } = req.query;

        // 1. Obtener todas las etiquetas disponibles para los filtros de la vista
        const etiquetasDisponibles = await label.findAll({
            attributes: ['name'],
            group: ['name'],
            order: [['name', 'ASC']]
        });

        // 2. Filtros de búsqueda sobre la publicación
        let condicionesPublicacion = { state: true };
        let condicionesEtiqueta = {};

        if (keyword && keyword.trim() !== '') {
            const termino = `%${keyword.trim()}%`;
            condicionesPublicacion[Op.or] = [
                { title: { [Op.iLike]: termino } },
                { description: { [Op.iLike]: termino } }
            ];
        }

        if (tag && tag.trim() !== '') {
            condicionesEtiqueta.name = tag.trim().toLowerCase();
        }

        // 3. Consulta principal con agregaciones de puntuación y ranking
        const publicacionesEncontradas = await publication.findAll({
            where: condicionesPublicacion,
            attributes: [
                'id',
                'title',
                'description',
                'createdAt',
                [Sequelize.fn('COALESCE', Sequelize.fn('AVG', Sequelize.col('images.valoraciones.score')), 0), 'promedioPuntaje'],
                [Sequelize.fn('COUNT', Sequelize.col('images.valoraciones.id')), 'totalVotos']
            ],
            include: [
                {
                    model: user,
                    as: 'usuarioCreador',
                    attributes: ['id', 'username', 'profile_photo'],
                    where: { state: true }, // Excluye publicaciones de usuarios suspendidos
                    required: true
                },
                {
                    model: image,
                    as: 'images',
                    attributes: ['id', 'url'],
                    required: false,
                    include: [
                        {
                            model: assessment,
                            as: 'valoraciones', 
                            attributes: []
                        }
                    ]
                },
                {
                    model: label,
                    as: 'etiquetas',
                    attributes: ['name'],
                    where: Object.keys(condicionesEtiqueta).length > 0 ? condicionesEtiqueta : null,
                    required: Object.keys(condicionesEtiqueta).length > 0
                }
            ],
            // Agrupamos por las columnas necesarias en PostgreSQL / SQL estricto
            group: [
                'publication.id',
                'usuarioCreador.id',
                'images.id',
                'etiquetas.id'
            ],
            // 1° Mejor promedio, 2° Mayor cantidad de votos, 3° Más recientes
            order: [
                [Sequelize.literal('"promedioPuntaje"'), 'DESC'],
                [Sequelize.literal('"totalVotos"'), 'DESC'],
                ['createdAt', 'DESC']
            ],
            subQuery: false
        });

        // 4. Formatear y limpiar los resultados para Pug
        const publicacionesLimpias = publicacionesEncontradas.map(p => {
            const item = p.get({ plain: true });
            item.promedioPuntaje = parseFloat(item.promedioPuntaje || 0).toFixed(1);
            item.totalVotos = parseInt(item.totalVotos) || 0;
            return item;
        });

        const todasLasEtiquetasLimpias = etiquetasDisponibles.map(e => e.get({ plain: true }));

        return res.render('explorar', {
            publicaciones: publicacionesLimpias,
            todasLasEtiquetas: todasLasEtiquetasLimpias,
            query: {
                keyword: keyword || '',
                tag: tag || ''
            },
            userLogueado: req.session ? req.session.user : null
        });

    } catch (error) {
        console.error("Error en el motor de busqueda:", error);
        return res.status(500).send("Error interno en el motor de busqueda");
    }
};


//  SEGUIR / DEJAR DE SEGUIR (ASÍNCRONO)
export const toggleSeguirUsuario = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: "Debes iniciar sesión para seguir usuarios" });
        }

        const { creatorId } = req.body;
        const userIdLogueado = req.session.user.id;
        const targetId = parseInt(creatorId);

        // No permitimos seguirse a uno mismo
        if (targetId === userIdLogueado) {
            return res.json({ success: false, message: "No podés seguirte a vos mismo" });
        }

        const relacionExiste = await follower.findOne({
            where: { 
                follower_id: userIdLogueado, 
                followed_id: targetId 
            }
        });

        if (relacionExiste) {
            // Dejar de seguir 
            await relacionExiste.destroy();
            return res.json({ success: true, siguiendo: false });
        } else {
            // Comenzar a seguir 
            await follower.create({
                follower_id: userIdLogueado,        
                followed_id: targetId    
            });

            // Notificación al usuario seguido
            const emisorUsername = req.session.user.username || "Alguien";
            await crearNotificacion({
                userId: targetId,
                senderId: userIdLogueado,
                type: 'FOLLOW',
                message: `@${emisorUsername} ha comenzado a seguirte`,
                url: `/perfil/${userIdLogueado}`
            });
            
            return res.json({ success: true, siguiendo: true });
        }
    } catch (error) {
        console.error("Error al procesar el follow:", error);
        return res.status(500).json({ success: false, message: "Error interno de base de datos" });
    }
};

