import { Model, DataTypes } from "sequelize";
import sequelize from "./config.js";

export class collection extends Model {}

collection.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        category: {
            type: DataTypes.STRING,
            allowNull: true, // Mejor permitir null por si no define categoría
        },
        public: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        modelName: 'collection',
        tableName: 'collections',
        timestamps: true,
        paranoid: true, // deletedAt habilitado
    }
);