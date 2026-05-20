import { Model, DataTypes } from "sequelize";
import  sequelize  from './config.js';

export class user extends Model {

    //static por que permite usar sin especificar una instancia
    static async revisarEmail(pemail) {
    const res = await user.findOne({ where: { email: pemail } });
    if(res){return true;}else{return false;}
    }    
    static async revisarUsuario(usuario) {
    const res = await user.findOne({ where: { username: usuario} });
    if(res){return true;}else{return false;}
    }  

    static async crearUsuario(usuario, contrasenia, email, ofertas){
        try {
            const usuario1 = user.build({
            username: usuario,
            password: contrasenia,
            email: email,
            offer: ofertas,
        })
        await usuario1.save();
        return usuario1;
        }
        catch(err){console.log(err)}  
    }
}


user.init(
    {
        id: {
            type: DataTypes.INTEGER,
            unique: true,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        profile_photo: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        number_publications_removed: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        state: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        offer:{ type: DataTypes.BOOLEAN, 
            allowNull: true }
    },
    {
        sequelize,
        modelName: "user",
        tableName: "users",
        createdAt: true,
        deletedAt: true,
    }
);
