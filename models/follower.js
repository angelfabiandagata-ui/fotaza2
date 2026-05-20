import { Model, DataTypes } from "sequelize";
import sequelize from "./config.js";

export class follower extends Model { }

follower.init({
    followed_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true, 
        field: 'followed_id'
    },
    follower_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true, 
        field: 'follower_id'
    },

}, {
    sequelize,
    modelName: "follower",
    tableName: "followers",
    createdAt: true,
    deletedAt: true,
});