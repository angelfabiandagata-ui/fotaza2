import { Model, DataTypes } from "sequelize";
import sequelize from "./config.js";

export class complaint_comment extends Model {}

complaint_comment.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  comment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  user_id: { // Usuario denunciante
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
    type: DataTypes.ENUM('pendiente', 'revisada'),
    defaultValue: 'pendiente',
    allowNull: false,
  }
}, {
  sequelize,
  modelName: "complaint_comment",
  tableName: "complaints_comments",
  timestamps: true,
});