import { Model, DataTypes, Sequelize } from "sequelize";
import sequelize from "./config.js";

export class collection extends Model {}

collection.init(
    {
        id:{
            type:DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement:true,
            allowNull:false,
        },
        post_id:{
            type:DataTypes.INTEGER,
            allowNull:false,
        },
        user_id:{
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        title:{
            type:DataTypes.STRING,
            allowNull:false,
        },
        category:{
            type:DataTypes.STRING,
            allowNull:false,
        },
        public:{
            type:DataTypes.BOOLEAN,
            allowNull:false,
        },
    },
        {
            sequelize,
            modelName: 'collection',
            tableName: 'collections',
            createdAt: true,
            deletedAt: true,
            updatedAt: true,

        },

);