import 'dotenv/config';
import express from 'express';
import pug from 'pug';

// CONSTANTES
const PORT = process.env.PORT || 3000;
const app = express();

//cargar pug
app.set("view engine", "pug");
app.set('views', './views');

// MIDDLEWARES
app.use(express.static('public'));

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



// iniciar servidor
app.listen(PORT, (err) => {
      if (err) {
        console.error(" [X] Error al iniciar el servidor: ", err);
      }
      console.log(` [✓] Servidor corriendo en el puerto:${PORT}`);
    });