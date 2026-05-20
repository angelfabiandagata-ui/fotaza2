import  'dotenv/config';
import { Sequelize } from 'sequelize';


const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});


export async function connectDatabase(){
    try{
        await sequelize.authenticate(); // testear la conexión
        console.log(' [+] Conexión a la BdD establecida.');

        await sequelize.sync({ alter: true });
        console.log(' [+] sincronizado de modelos.');
    }
    catch(error){
        console.error(' [x] No se pudo conectar a la BdD:', error);
        throw error;
    }
}
export default sequelize;