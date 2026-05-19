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


// iniciar servidor
app.listen(PORT, (err) => {
      if (err) {
        console.error(" [X] Error al iniciar el servidor: ", err);
      }
      console.log(` [✓] Servidor corriendo en el puerto:${PORT}`);
    });