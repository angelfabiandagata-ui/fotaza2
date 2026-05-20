import { Model,  DataTypes } from "sequelize";
import sequelize from "./config.js";

export class image extends Model {}

image.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  post_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING(50),
  },
  average: {
    type: DataTypes.FLOAT,
  },
  copyright: {
    type: DataTypes.BOOLEAN,
  },
  watermark: {
    type: DataTypes.TEXT,
  },
  custom_text: {
    type: DataTypes.STRING,
  },
}, {
  sequelize,
  modelName: "image",
  tableName: "images",
  createdAt: true,
  deletedAt: true,
});