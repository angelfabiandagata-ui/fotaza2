import sequelize from '../models/config.js';
import { user } from '../models/user.js';
import bcrypt from 'bcrypt'; 

async function seed() {
  try {
    console.log("Sincronizando tablas con la base de datos");
    await sequelize.sync({ alter: true });

    console.log("Encriptando contraseñas");
    const hashAdmin = await bcrypt.hash("admin1234", 10);
    const hashUser = await bcrypt.hash("user1234", 10);

    console.log("Insertando registros iniciales");

    const usuariosCreados = await user.bulkCreate([
      {
        id: 20, 
        username: "admin",
        password: hashAdmin, 
        email: "admin@gmail.com",
        state: true,
        offer: false,
        role: 'admin'
      },
      {
        id: 21,
        username: "userPrueba",
        password: hashUser, 
        email: "userPrueba@gmail.com",
        state: true,
        offer: false,
        role: 'user'
      }
    ]);

    console.log(`Seeder ejecutado con exito. Se crearon ${usuariosCreados.length} usuarios.`);

  } catch (error) {
    console.error(" Error al ejecutar el seeder:", error);
  } finally {
    await sequelize.close();
    console.log("🔌 Conexión con la base de datos cerrada");
  }
}


seed();