import { Model,  DataTypes } from "sequelize";
import sequelize from "./config.js";

export class message extends Model {}

message.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  user_id_emisor: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  user_id_receptor: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },    
  content: {
    type: DataTypes.STRING(255),
    allowNull: true,
    },
  read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },  
}, {
  sequelize,
  modelName: "message",
  tableName: "messages",
  createdAt: true,
  deletedAt: true,
});