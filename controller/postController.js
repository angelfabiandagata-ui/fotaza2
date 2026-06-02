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

        return res.redirect('/perfil');

    } catch (error) {
        console.error(" Error en la creación de publicación multiple:", error);
        return res.status(500).send("Error interno del servidor al procesar el album");
    }
};


//  VER DETALLE DE UNA PUBLICACIÓN

export const verDetallePublicacion = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id) || id.includes('.')) {
            return res.status(404).send("Recurso no válido");
        }

        // Traemos todo los datos de la publicación, incluyendo imágenes, comentarios, valoraciones, eiquetas, y el usuario creador
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

        // Control de relacion de seguimiento para pintar correctamente el botón "Seguir" o "Siguiendo"
        let yaLoSigue = false;
        let esSuPropioPost = false;

        if (req.session && req.session.user) {
            const userIdLogueado = req.session.user.id;
            esSuPropioPost = post.user_id === userIdLogueado;

            const seguimiento = await follower.findOne({
                where: {
                    follower_id: userIdLogueado,
                    followed_id: post.user_id
                }
            });
            if (seguimiento) yaLoSigue = true;
        }

        // Mapeamos las imágenes y las insertamos 
        const imagenesDetalladas = post.images.map(img => {
            const votos = img.valoraciones || [];
            const cantidadVotos = votos.length;
            const sumaNotas = votos.reduce((acc, curr) => acc + curr.score, 0);
            const promedioCalculado = cantidadVotos > 0 ? (sumaNotas / cantidadVotos).toFixed(1) : "0.0";

            const listaComentarios = (img.comentarios || []).map(c => {
                return {
                    usuario: c.user ? c.user.username : `Usuario #${c.user_id}`, 
                    texto: c.content,
                    fecha: c.date ? new Date(c.date).toLocaleDateString('es-AR') : ''
                };
            });

            return {
                id: img.id,
                url: img.url,
                watermark: img.watermark,
                average_assessment: promedioCalculado, 
                number_assessments: cantidadVotos,     
                comentarios: listaComentarios          
            };
        });

        return res.render('post/post', {
            publicacion: post.get({ plain: true }), 
            imagenesDetalladas: imagenesDetalladas,
            etiquetas: post.etiquetas ? post.etiquetas.map(t => t.get({ plain: true })) : [],
            esSuPropioPost,
            yaLoSigue,
            userLogueado: req.session.user || null
        });

    } catch (error) {
        console.error(" Error al traer el detalle: ", error);
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
           crearToast("Ya has valorado esta imagen", "error"); return res.json({ 
                success: false,
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


//

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

// Funcion para crear un alerta flotante (toast) de forma dinámica
function crearToast(mensaje, tipo = "success") {
    const toast = document.createElement("div");
    toast.classList.add("toast-flotante", tipo);
    toast.innerText = mensaje;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("fade-out");
        toast.addEventListener("transitionend", () => {
            toast.remove();
        });
    }, 3000);
}