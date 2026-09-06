import { Op, Sequelize } from "sequelize";
import sequelize from '../models/config.js';
import { publication } from '../models/publication.js';
import { image } from '../models/image.js';
import { comment } from '../models/comment.js';
import { user } from '../models/user.js';
import { label } from '../models/label.js';
import { follower } from '../models/follower.js';
import { assessment } from '../models/assessment.js';



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

//  COMENTAR UNA FOTO (ASÍNCRONICO)

export const crearComentarioFoto = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: "Debes iniciar sesion para comentar" });
        }

        const { imageId, text } = req.body; 
        const userIdLogueado = req.session.user.id;
        const usernameLogueado = req.session.user.username;

        await comment.create({
            image_id: parseInt(imageId),
            user_id: userIdLogueado,
            content: text.trim(),
            date: new Date()
        });

        const foto = await image.findByPk(imageId, { include: [{ model: publication }] });
        if (!foto || !foto.publication.comments_allowed) {
            return res.status(403).json({
                success: false,
                message: "Los comentarios para esta publicación han sido cerrados por el autor."
            });
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

//  VALORAR/VOTAR UNA FOTO (ASÍNCRONICO)
export const valorarFoto = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: "Debes iniciar sesion para votar" });
        }

        const { imageId, rating } = req.body; 
        const userIdLogueado = req.session.user.id;

        const votoExistente = await assessment.findOne({
            where: { image_id: imageId, user_id: userIdLogueado }
        });

        if (votoExistente) {
            return res.json({
                success: false,
                message: "Ya has valorado esta imagen"
            });
        }

        await assessment.create({
            image_id: parseInt(imageId),
            user_id: userIdLogueado,
            score: parseFloat(rating)
        });

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

        return res.json({
            success: true,
            nuevoPromedio: nuevoPromedio,
            nuevaCantidad: cantidadVotos
        });

    } catch (error) {
        console.error(" Error al procesar la valoración relacional:", error);
        return res.status(500).json({ success: false, message: "Error al registrar tu voto" });
    }
};


//  MOTOR DE BÚSQUEDA / EXPLORAR CONTENT

export const explorarContenido = async (req, res) => {
    try {
        const { keyword, tag } = req.query; 

        const etiquetasDisponibles = await label.findAll({
            attributes: ['name'],
            group: ['name'],
            order: [['name', 'ASC']]
        });

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

        const publicacionesEncontradas = await publication.findAll({
            where: condicionesPublicacion,
            order: [['createdAt', 'DESC']], 
            include: [
                {
                    model: image,
                    as: 'images',
                    attributes: ['url'] 
                },
                {
                    model: label,
                    as: 'etiquetas',
                    where: Object.keys(condicionesEtiqueta).length > 0 ? condicionesEtiqueta : null,
                    required: Object.keys(condicionesEtiqueta).length > 0 
                }
            ]
        });

        const publicacionesLimpias = publicacionesEncontradas.map(p => p.get({ plain: true }));
        const todasLasEtiquetasLimpias = etiquetasDisponibles.map(e => e.get({ plain: true }));

        return res.render('explorar', {
            publicaciones: publicacionesLimpias,
            todasLasEtiquetas: todasLasEtiquetasLimpias,
            query: {
                keyword: keyword || '',
                tag: tag || ''
            },
            userLogueado: req.session.user || null
        });

    } catch (error) {
        console.error(" Error en el motor de busqueda :", error);
        return res.status(500).send("Error interno en el motor de busqueda");
    }
};


//  SEGUIR / DEJAR DE SEGUIR (ASÍNCRONICO)

export const toggleSeguirUsuario = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: "Debes iniciar sesion para seguir usuarios" });
        }

        const { creatorId } = req.body;
        const userIdLogueado = req.session.user.id;

        //No permitimos seguir a uno mismo
        if (parseInt(creatorId) === userIdLogueado) {
            return res.json({ success: false, message: "No podes seguirte a vos mismo" });
        }

        const relacionExiste = await follower.findOne({
            where: { 
                follower_id: userIdLogueado, 
                followed_id: parseInt(creatorId) 
            }
        });

        //No permitimos seguir a un mismo usuario más de una vez
        if (relacionExiste) {
            await follower.destroy({
                where: {
                    follower_id: userIdLogueado,
                    followed_id: parseInt(creatorId)
                }
            });
            return res.json({ success: true, siguiendo: false });
        } else {
            await follower.create({
                follower_id: userIdLogueado,        
                followed_id: parseInt(creatorId)    
            });
            
            return res.json({ success: true, siguiendo: true });
        }
    } catch (error) {
        console.error("Error al procesar el follow :", error);
        return res.status(500).json({ success: false, message: "Error interno de base de datos" });
    }
};
