import { Model, DataTypes } from "sequelize";
import sequelize from "./config.js";

export class collectionPublication extends Model {}

collectionPublication.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        collection_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        post_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        }
    },
    {
        sequelize,
        modelName: 'collectionPublication',
        tableName: 'collection_publications',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['collection_id', 'post_id'] // Asegura que no haya duplicados de la misma publicación en la misma colección
            }
        ]
    }
);