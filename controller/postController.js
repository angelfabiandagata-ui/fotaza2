import { Op, Sequelize as sequelize } from "sequelize";
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
    try {
        if (!req.session || !req.session.user) {
            return res.redirect('/auth/login');
        }

        const { titulo, descripcion, imagenesInput, labels, hasLicense, watermarkInput } = req.body; 
        const userIdLogueado = req.session.user.id;

        if (!imagenesInput) {
            return res.status(400).send("Error: No se cargo ninguna foto");
        }

        const listaImagenesBase64 = JSON.parse(imagenesInput);
        if (listaImagenesBase64.length === 0) {
            return res.status(400).send("Error: El post esta vacío");
        }

        // Insertamos la publicacion
        const nuevaPublicacion = await publication.create({
            user_id: userIdLogueado,
            state: true,                     
            title: titulo,                   
            description: descripcion,        
            comments_allowed: true,          
            number_complaints: 0,
            number_assessments: 0,
            average_assessment: 0.0
        });

        // Procesamos Licencia y Marca de Agua
        const requiereLicencia = hasLicense === 'on';
        const stringMarcaAgua = requiereLicencia && watermarkInput ? watermarkInput : null;

        // Guardamos las imágenes del carrusel
        for (const base64Foto of listaImagenesBase64) {
            await image.create({
                post_id: nuevaPublicacion.id,       
                url: base64Foto,                    
                type: "jpeg",                        
                copyright: requiereLicencia,         
                license: requiereLicencia,           
                watermark: stringMarcaAgua          
            });
        }

        // Guardamos las etiquetas si es que se enviaron
        if (labels && labels.trim() !== '') {
            const arrayEtiquetas = labels.split(',').map(tag => tag.trim().toLowerCase());
            for (const nombreEtiqueta of arrayEtiquetas) {
                await label.create({
                    post_id: nuevaPublicacion.id, 
                    name: nombreEtiqueta
                });
            }
        }

        return res.json({ 
            success: true, 
            message: "¡Publicación creada con éxito!" 
        });

    } catch (error) {
        console.error(" Error en la creación de publicación", error);
    }
};


//  VER DETALLE DE UNA PUBLICACIÓN

export const verDetallePublicacion = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id) || id.includes('.')) {
            return res.status(404).send("Recurso no válido");
        }

        // Traemos todos los datos de la publicación 
        const post = await publication.findByPk(id, {
            include: [
                {
                    model: image,
                    as: 'images',
                    include: [
                        { 
                            model: comment, 
                            as: 'comentarios', 
                            include: [{ model: user, attributes: ['username'] }] 
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

        // Control de relación de seguimiento
        let yaLoSigue = false;
        let esSuPropioPost = false;

        if (req.session && req.session.user) {
            const userIdLogueado = req.session.user.id;
            esSuPropioPost = post.user_id === userIdLogueado;

            // Solo consulta a la base de datos si el post pertenece a otra persona
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

        // Serializamos las instancias para pasarlas limpias a la vista.
        const imagenesDetalladas = post.images.map(img => img.toJSON());

        return res.render('post/post', {
            publicacion: post.get({ plain: true }),
            imagenesDetalladas,
            etiquetas: post.etiquetas ? post.etiquetas.map(t => t.get({ plain: true })) : [],
            esSuPropioPost,
            yaLoSigue,
            userLogueado: req.session.user || null
        });

    } catch (error) {
        console.error("Error al traer el detalle: ", error);
        return res.status(500).send("Error al cargar la publicacion");
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

        return res.json({ 
            success: true, 
            username: usernameLogueado 
        });

    } catch (error) {
        console.error("Error al insertar comentario en la foto:", error);
        return res.status(500).json({ success: false, message: "No se pudo publicar tu comentario" });
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
                [sequelize.fn('COUNT', sequelize.col('id')), 'cantidadVotos'],
                [sequelize.fn('AVG', sequelize.col('score')), 'promedioReal']
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
