import { Model,DataTypes } from "sequelize";
import sequelize from "./config.js";

export class publication extends Model {}

publication.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,

    },
    state: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    comments_allowed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    number_complaints: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    number_assessments: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    average_assessment: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
  },
  {

    sequelize, 
    modelName: 'publication', 
    tableName: 'publications',
    createdAt: true,
    deletedAt: true,
    updatedAt: true,
  },
);