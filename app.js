import 'dotenv/config';
import express from 'express';
import pug from 'pug';
import './models/sync.js';
import { connectDatabase } from './models/config.js';
import authRoutes from './routes/auth.js';     

// CONSTANTES
const PORT = process.env.PORT || 3000;
const app = express();

//cargar pug
app.set("view engine", "pug");
app.set('views', './views');

// MIDDLEWARES
// MIDDLEWARES
app.use(express.static('public'));
app.use(express.json({ limit: '10mb' }));
//PARA IMG
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// rutas
app.get("/",(req, res , next)=>{
    res.render("index");
})

app.get("/index",(req, res , next)=>{
    res.render("index");
})

// Enrutador de Autenticación 
app.use('/auth', authRoutes);

app.get("/explorar",(req, res , next)=>{
    res.render("explorar");
})

app.get("/auth/login", (req, res) => {
    res.render("auth/login"); 
});


app.get("/auth/signup", (req, res) => {
    res.render("auth/signup"); 
});

app.get("/perfil", (req, res) => {
    // Simulación de un usuario autenticado (en una aplicación real, esto vendría de la sesión o base de datos)
    const usuario = {   
        username: "JohnDoe",
        profile_photo: "/images/user-profile.jpg"
    };
    res.render("perfil", { usuario });
});

app.get("/post/new", (req, res) => {
    res.render("post/new-post");
});

app.get("/post/post", (req, res) => {
    res.render("post/post");
});



// INICIALIZACION DEL SERVIDOR Y CONEXION A POSTGRES

connectDatabase()
  .then(() => {
    app.listen(PORT, (err) => {
      if (err) {
        console.error(" ❌ Error al iniciar el servidor: ", err);
        return;
      }
      console.log(` [✓] Servidor corriendo impecable en el puerto: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(" ❌ Error crítico de conexión a la base de datos: ", err);
  });