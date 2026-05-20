const slides = document.querySelectorAll('.slide-wrapper'); 
const btnPrev = document.querySelector('#prev-slide');
const btnNext = document.querySelector('#next-slide');


let currentIndex = 0; 

const obtenerIndiceActivo = () => {
    return currentIndex;
};

// Sincroniza los textos, comentarios, estrellas e IDs ocultos según la foto activa
const actualizarContenidoImagen = (index) => {
    // Sincronizamos la lista global que inyecto Pug en el navegador (window.listaImagenes)
    const imgActiva = window.listaImagenes[index];
    if (!imgActiva) return;

    // 1. Sincronizamos los inputs hidden para que los formularios apunten a la foto correcta
    if (hiddenRatingId) hiddenRatingId.value = imgActiva.id;
    if (hiddenCommentId) hiddenCommentId.value = imgActiva.id;

    // 2. Actualizamos contadores y promedios en la interfaz
    if (photoCounter) photoCounter.textContent = `Imagen ${index + 1} de ${window.listaImagenes.length}`;
    if (currentRating) currentRating.textContent = `⭐ ${imgActiva.average_assessment || '0.0'}`;
    if (currentVotes) currentVotes.textContent = `(${imgActiva.number_assessments || 0} votos)`;

    // 3. Limpiamos y redibujamos la caja de comentarios de ESTA imagen específica
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

// Cambia de diapositiva ocultando el wrapper anterior y mostrando el nuevo
const cambiarSlide = (nuevoIndice) => {
    if (slides.length === 0) return;

    // Ocultamos el wrapper actual
    slides[currentIndex].style.display = 'none';

    // Calculamos el nuevo índice respetando extremos del carrusel
    currentIndex = nuevoIndice;
    if (currentIndex >= slides.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = slides.length - 1;

    // Mostramos el nuevo wrapper activo
    slides[currentIndex].style.display = 'block';

    // Hidratamos los datos de la nueva imagen activa
    actualizarContenidoImagen(currentIndex);
};

// Asignamos los eventos de clics a las flechas del carrusel
if (btnNext) {
    btnNext.addEventListener('click', () => cambiarSlide(currentIndex + 1));
}
if (btnPrev) {
    btnPrev.addEventListener('click', () => cambiarSlide(currentIndex - 1));
}