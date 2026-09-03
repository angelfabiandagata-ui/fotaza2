import sequelize from './config.js';
import {collection} from './collection.js';
import {comment} from './comment.js';
import {label} from './label.js';
import {image} from './image.js';
import {publication} from './publication.js';
import {follower} from './follower.js';
import {user} from './user.js';
import {assessment} from './assessment.js';
import { message } from './message.js';



// To create a One-To-One relationship, the hasOne and belongsTo associations are used together;
// To create a One-To-Many relationship, the hasMany and belongsTo associations are used together;
// To create a Many-To-Many relationship, two belongsToMany calls are used together


//user a publication(1 - n)
publication.belongsTo(user, { 
    foreignKey: 'user_id', 
    as: 'usuarioCreador' 
});
user.hasMany(publication, { 
    foreignKey: 'user_id', 
    as: 'publicaciones' 
});



//colection y user a publication (n - m)
publication.belongsToMany(user, { 
    through: collection, 
    foreignKey: 'post_id', 
    otherKey: 'user_id',
    as: 'usuariosQueMeGuardaron'
});

user.belongsToMany(publication, { 
    through: collection, 
    foreignKey: 'user_id', 
    otherKey: 'post_id',
    as: 'misColecciones'
});


//publication a image (1 - n)
publication.hasMany(image,{
    foreignKey: 'post_id',
    as: 'images',
});
image.belongsTo(publication,{
    foreignKey: 'post_id',
});

//image a comment (1 - n)
image.hasMany(comment, { 
    foreignKey: 'image_id', 
    as: 'comentarios' 
});

comment.belongsTo(image, { 
    foreignKey: 'image_id' 
});


//user a comment (1 - n)
user.hasMany(comment,{
    foreignKey: 'user_id',
});
comment.belongsTo(user,{
    foreignKey: 'user_id',
});

//publication a label (1 - n)
publication.hasMany(label,{
    foreignKey: 'post_id',
    as: 'etiquetas',
});
label.belongsTo(publication,{
    foreignKey: 'post_id',
});


//image y user a assessment (1 - n)
image.hasMany(assessment, 
    { foreignKey: 'image_id', 
        as: 'valoraciones' });
assessment.belongsTo(image, 
    { foreignKey: 'image_id' });


user.hasMany(assessment,{
    foreignKey: 'user_id',
});
assessment.belongsTo(user,{
    foreignKey: 'user_id',
});



// user a user - seguidores (n - m)
user.belongsToMany(user, { 
    through: 'followers', 
    as: 'siguiendo',       // los que yo sigo
    foreignKey: 'follower_id', 
    otherKey: 'followed_id' 
});

// user a user (n - m)
user.belongsToMany(user, { 
    through: 'followers', 
    as: 'seguidores',      // los que me siguen
    foreignKey: 'followed_id', 
    otherKey: 'follower_id' 
});

// Relacion para mensajeria
user.hasMany(message, { 
    foreignKey: 'user_id_emisor', 
    as: 'mensajesEnviados' });
message.belongsTo(user, 
    { foreignKey: 'user_id_emisor', 
        as: 'emisor' 
    });

// Relacion para el Receptor en mensajeria
user.hasMany(message, { 
    foreignKey: 'user_id_receptor', 
    as: 'mensajesRecibidos' 
    });
message.belongsTo(user, { 
    foreignKey: 'user_id_receptor', 
    as: 'receptor' 
    });