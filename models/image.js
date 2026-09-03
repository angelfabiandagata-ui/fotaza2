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
  average_assessment: {
    type: DataTypes.VIRTUAL,
    get() {
      const votos = this.valoraciones;
      if (!votos || votos.length === 0) return "0.0";
      const suma = votos.reduce((acc, curr) => acc + curr.score, 0);
      return (suma / votos.length).toFixed(1);
    }
  },
  number_assessments: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.valoraciones ? this.valoraciones.length : 0;
    }
  }
}, {
  sequelize,
  modelName: "image",
  tableName: "images",
  createdAt: true,
  deletedAt: true,
});