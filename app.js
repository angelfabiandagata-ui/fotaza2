import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import pug from 'pug';
import './models/sync.js';
import { connectDatabase } from './models/config.js';
import perfilRoutes from './routes/perfilRoutes.js'; 
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
// Activador de lectura y firma de Cookies
app.use(cookieParser());
// Inicializador del motor de Sesiones
app.use(session({
    secret: process.env.SESSION_KEY,
    resave: false,                                      
    saveUninitialized: false,                           
    cookie: { 
        secure: false, 
        maxAge: 1000 * 60 * 60 * 24, // Duración exacta de la sesion: 1 día
        httpOnly: true,
        sameSite: 'lax', 
    }
}));

//  Inyector de Variables Locales Globales para PUG
app.use((req, res, next) => {
    res.locals.userLogueado = req.session.user || null;
    next();
});

// Enrutador de Autenticación 
app.use('/auth', authRoutes);

// Enrutador del Perfil 
app.use('/perfil', perfilRoutes);



// rutas
app.get("/",(req, res , next)=>{
    res.render("index");
})

app.get("/index",(req, res , next)=>{
    res.render("index");
})



app.get("/explorar",(req, res , next)=>{
    res.render("explorar");
})

app.get("/auth/login", (req, res) => {
    res.render("auth/login"); 
});


app.get("/auth/signup", (req, res) => {
    res.render("auth/signup"); 
});

app.use('/auth', authRoutes);

app.get("/perfil", (req, res) => {
    res.render("perfil"); 
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