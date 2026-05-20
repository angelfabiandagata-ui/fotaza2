import { Model, DataTypes } from "sequelize";
import sequelize from "./config.js";

export class label extends Model { }

label.init(
    {
          id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
  },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        post_id: {  
            type: DataTypes.INTEGER,
            allowNull: false,
        }
    },
    {
        sequelize,
        modelName: "label",
        tableName: "labels",
        timestamps: true,
    }

);