// CAPTURA DE ELEMENTOS DEL DOM

const slides = document.querySelectorAll('.slide-wrapper'); 
const btnPrev = document.querySelector('#prev-slide');
const btnNext = document.querySelector('#next-slide');

const formComment = document.querySelector('#form-comment');
const inputCommentText = document.querySelector('#input-comment-text');
const hiddenCommentId = document.querySelector('#hidden-image-id-comment');
const commentsBox = document.querySelector('#comments-box');

const formRating = document.querySelector('#form-rating');
const selectRating = document.querySelector('#select-rating');
const hiddenRatingId = document.querySelector('#hidden-image-id-rating');

// Variables de interfaz de texto
const photoCounter = document.querySelector('#photo-counter');
const currentRating = document.querySelector('#current-rating');
const currentVotes = document.querySelector('#current-votes');

let currentIndex = 0; // Indice de la foto activa actual

//  FUNCIONES DE CONTROL DEL CARRUSEL Y SINCRONIZACIÓN

const actualizarContenidoImagen = (index) => {
    const imgActiva = window.listaImagenes[index];
    if (!imgActiva) return;

    //  Sincronizamos los inputs hidden para que los formularios apunten a la foto correcta
    if (hiddenRatingId) hiddenRatingId.value = imgActiva.id;
    if (hiddenCommentId) hiddenCommentId.value = imgActiva.id;

    //  Actualizamos contadores y promedios en la interfaz
    if (photoCounter) photoCounter.textContent = `Imagen ${index + 1} de ${window.listaImagenes.length}`;
    if (currentRating) currentRating.textContent = `⭐ ${imgActiva.average_assessment || '0.0'}`;
    if (currentVotes) currentVotes.textContent = `(${imgActiva.number_assessments || 0} votos)`;

    //  Limpiamos y redibujamos la caja de comentarios de la imagen especifica
    if (commentsBox) {
        commentsBox.innerHTML = '';
        
        if (imgActiva.comentarios && imgActiva.comentarios.length > 0) {
            imgActiva.comentarios.forEach(c => {
                const div = document.createElement('div');
                div.className = 'comment-item';
                div.innerHTML = `
                    <div class="comment-main">
                        <strong class="comment-user">${c.usuario}</strong>
                        <span class="comment-text">${c.texto}</span>
                    </div>
                    <span class="comment-date">${c.fecha || ''}</span>
                `;
                commentsBox.appendChild(div);
            });
        } else {
            commentsBox.innerHTML = '<p class="no-comments-text" style="color: #888; font-style: italic; padding: 10px;">Sin comentarios en esta foto. ¡Sé el primero!</p>';
        }
    }
};

const cambiarSlide = (nuevoIndice) => {
    if (slides.length === 0) return;

    // Ocultamos el wrapper actual
    slides[currentIndex].style.display = 'none';

    // Calculamos el nuevo indice respetando extremos del carrusel
    currentIndex = nuevoIndice;
    if (currentIndex >= slides.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = slides.length - 1;

    // Mostramos el nuevo wrapper activo
    slides[currentIndex].style.display = 'block';

    // Hidratamos los datos de la nueva imagen activa
    actualizarContenidoImagen(currentIndex);
};

// Asignamos los eventos de clics a las flechas del carrusel
if (btnNext) btnNext.addEventListener('click', () => cambiarSlide(currentIndex + 1));
if (btnPrev) btnPrev.addEventListener('click', () => cambiarSlide(currentIndex - 1));


//  ENVÍO ASÍNCRONICO DE COMENTARIOS

if (formComment) {
    formComment.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        const idFotoActiva = hiddenCommentId ? hiddenCommentId.value : null; 
        const textoComentario = inputCommentText.value.trim();
        
        if (!idFotoActiva || !textoComentario) return;

        try {
            const response = await fetch('/post/comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageId: idFotoActiva, text: textoComentario })
            });
            const resultado = await response.json();
            
            if (resultado.success) {
                inputCommentText.value = '';
                const fechaHoy = new Date().toLocaleDateString('es-AR');

                // Agregamos el comentario al DOM
                const nuevoDiv = document.createElement('div');
                nuevoDiv.className = 'comment-item';
                nuevoDiv.innerHTML = `
                    <div class="comment-main">
                        <strong class="comment-user">${resultado.username}</strong>
                        <span class="comment-text">${textoComentario}</span>
                    </div>
                    <span class="comment-date">${fechaHoy}</span>
                `;
                
                if (commentsBox.querySelector('.no-comments-text')) {
                    commentsBox.innerHTML = '';
                }
                commentsBox.appendChild(nuevoDiv);
                
                // Lo persistimos en el array de memoria por si cambia de foto y vuelve
                if (window.listaImagenes && window.listaImagenes[currentIndex]) {
                    window.listaImagenes[currentIndex].comentarios.push({ 
                        usuario: resultado.username, 
                        texto: textoComentario,
                        fecha: fechaHoy
                    });
                }
            } else {
                 crearToast("No se pudo publicar tu comentario.", "error");
            }
        } catch (error) {
            crearToast("Error de conexión al publicar el comentario", "error");
        }
    });
}


//  ENVIO ASINCRONICO DE VALORACIONES 

if (formRating) {
    formRating.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const idFotoActiva = hiddenRatingId ? hiddenRatingId.value : null; 
        const notaSeleccionada = parseInt(selectRating.value);

        if (!idFotoActiva) return;

        try {
            const response = await fetch('/post/rate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageId: idFotoActiva, rating: notaSeleccionada }) 
            });

            const resultado = await response.json();

            if (resultado.success) {
                crearToast("¡Voto registrado con exito!", "success");
                
                // Actualizamos la interfaz en caliente con el nuevo promedio y cantidad de votos
                if (currentRating) currentRating.textContent = `⭐ ${resultado.nuevoPromedio}`;
                if (currentVotes) currentVotes.textContent = `(${resultado.nuevaCantidad} votos)`;
                
                if (window.listaImagenes && window.listaImagenes[currentIndex]) {
                    window.listaImagenes[currentIndex].average_assessment = resultado.nuevoPromedio;
                    window.listaImagenes[currentIndex].number_assessments = resultado.nuevaCantidad;
                }
            } else {
                crearToast(resultado.message || "No se pudo registrar el voto", "error");
            }
        } catch (error) {
            console.error("Error de red al enviar la valoracion:", error);
            crearToast("Error de conexión al votar", "error");
        }
    });
}


// INICIALIZACION AUTOMATICA Y DELEGACION (FOLLOW)

document.addEventListener('DOMContentLoaded', () => {
    if (window.listaImagenes && window.listaImagenes.length > 0) {
        slides.forEach((slide, i) => {
            slide.style.display = i === 0 ? 'block' : 'none';
        });
        actualizarContenidoImagen(0);
    }
});

document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'btn-follow') {
        e.preventDefault();
        
        const btnFollow = e.target;
        const creatorId = btnFollow.getAttribute('data-creator-id');

        if (!creatorId) return;

        try {
            const response = await fetch('/user/follow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ creatorId: creatorId })
            });
            
            const resultado = await response.json();

            if (resultado.success) {
                if (resultado.siguiendo) {
                    btnFollow.textContent = 'Siguiendo';
                    btnFollow.style.backgroundColor = '#fff';
                    btnFollow.style.color = '#007bff';
                } else {
                    btnFollow.textContent = 'Seguir';
                    btnFollow.style.backgroundColor = '#007bff';
                    btnFollow.style.color = '#fff';
                }
            } else {
                crearToast(resultado.message || "No se pudo cambiar el estado de seguimiento", "error");
            }
        } catch (error) {
            console.error(" Error de red al intentar procesar el follow:", error);
            crearToast("Error de conexión al seguir al usuario", "error");
        }
    }
});

// Funcion para crear un alerta flotante (toast) de forma dinámica
function crearToast(mensaje, tipo = "success") {
    const toast = document.createElement("div");
    toast.classList.add("toast-flotante", tipo);
    toast.innerText = mensaje;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("fade-out");
        toast.addEventListener("transitionend", () => {
            toast.remove();
        });
    }, 3000);
}