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

    console.log("Insertando o actualizando usuarios iniciales");

    // Admin
    const [adminUser, adminCreated] = await user.findOrCreate({
      where: { username: "admin" },
      defaults: {
        password: hashAdmin,
        email: "admin@gmail.com",
        state: true,
        offer: false,
        role: 'admin',
        number_publications_removed: 0
      }
    });

    if (!adminCreated) {
      adminUser.role = 'admin';
      adminUser.password = hashAdmin;
      await adminUser.save();
      console.log("Usuario 'admin' ya existía: rol y clave actualizados.");
    } else {
      console.log("Usuario 'admin' creado exitosamente.");
    }

    // Usuario de prueba 
    const [testUser, testCreated] = await user.findOrCreate({
      where: { username: "userPrueba" },
      defaults: {
        password: hashUser,
        email: "userPrueba@gmail.com",
        state: true,
        offer: false,
        role: 'user',
        number_publications_removed: 0
      }
    });

    if (!testCreated) {
      testUser.role = 'user';
      testUser.password = hashUser;
      await testUser.save();
      console.log("Usuario 'userPrueba' ya existía: actualizado.");
    } else {
      console.log("Usuario 'userPrueba' creado exitosamente.");
    }

    console.log("Seeder ejecutado con éxito.");

  } catch (error) {
    console.error("Error al ejecutar el seeder:", error);
  } finally {
    await sequelize.close();
    console.log("🔌 Conexión con la base de datos cerrada");
  }
}

seed();