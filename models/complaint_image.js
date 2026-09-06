import { Model, DataTypes } from "sequelize";
import sequelize from "./config.js";

export class complaint_image extends Model {}

complaint_image.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  image_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  user_id: { // Usuario que realiza la denuncia
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING(100),
    allowNull: false, 
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false, 
  },
  state: {
    type: DataTypes.ENUM('pendiente', 'desestimada', 'aceptada'),
    defaultValue: 'pendiente',
    allowNull: false,
  }
}, {
  sequelize,
  modelName: "complaint_image",
  tableName: "complaints_images",
  timestamps: true,
});