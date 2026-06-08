# 📸 Fotaza 2 - Trabajo Práctico Integrador

Bienvenido a **Fotaza 2**, una aplicación web de producción digital y catálogo fotográfico desarrollada como proyecto académico. La plataforma permite a los usuarios registrarse, publicar imágenes , etiquetar , seguir a otros usuarios y valorar las publicaciones.

---

## 🚀 Características Principales

* **Autenticación Segura:** Sistema de login y registro con contraseñas encriptadas mediante `bcrypt`.
* **Gestión de Sesiones:** Persistencia de estado de usuario del lado del servidor.
* **Publicaciones Dinámicas:** Subida de múltiples imágenes por posteo convertidas eficientemente a cadenas Base64.
* **Interactividad en Tiempo Real:** Interfaz asíncrona (`fetch`) para votaciones, comentarios, carga de avatar y flujo de *follow/unfollow* sin recargar la página.
* **Alertas Flotantes (Toasts):** Sistema premium de notificaciones temporales para una experiencia de usuario fluida.

---

## 🛠️ Tecnologías y Dependencias

El proyecto está construido bajo la arquitectura **MVC (Modelo-Vista-Controlador)** utilizando el entorno de ejecución Node.js y las siguientes dependencias clave:

| Dependencia | Función en el Proyecto |
| :--- | :--- |
| **express** "5.2.1"| Framework base para el enrutamiento y la lógica del servidor HTTP. |
| **sequelize** "6.37.8"| ORM para interactuar con la base de datos relacional mediante JavaScript. |
| **pg** "8.21.0"/ **pg-hstore** "2.3.4"| Drivers necesarios para establecer la conexión nativa con PostgreSQL. |
| **pug** "3.0.4"| Motor de plantillas dinámicas para la estructura del Frontend. |
| **express-session** "1.19.0"| Middleware para la creación y gestión de las sesiones de usuario en el servidor. |
| **cookie-parser** "1.4.7"| Middleware para la traducción y lectura de las cookies enviadas por el navegador. |
| **bcrypt** "6.0.0" | Algoritmo de hash seguro para la encriptación de contraseñas. |
| **dotenv** "17.4.2"| Gestión segura de credenciales y variables de entorno (`.env`). |

---

## ⚙️ Requisitos Previos e Instalación

Para ejecutar este proyecto de forma local, necesitás tener instalado **Node.js** y un servidor de base de datos **PostgreSQL**.

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/angelfabiandagata-ui/fotaza2.git
   cd fotaza2
2. **Instalar los paquetes de node**
    ```bash
    npm install
3. **Inicializar la base de datos**
    ```bash
    npm run db:init
4. **Ejecutar npm run start**
    ```bash
    npm run start

👥 Usuarios de Prueba Generados:
Para evaluar el sistema de roles, flujo de seguidores o interactividad, podés iniciar sesión con cualquiera de estas dos cuentas creadas por el seed:

Perfil Administrador:

Email: admin@gmail.com

Contraseña: admin1234

Perfil Usuario de Pruebas:

Email: userPrueba@gmail.com

Contraseña: user1234    

El sistema queda funcionando en el puerto 3000 (localhost:3000)
