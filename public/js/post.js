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

// FUNCIONES DE CONTROL DEL CARRUSEL Y SINCRONIZACIÓN

const actualizarContenidoImagen = (index) => {
    const imgActiva = window.listaImagenes ? window.listaImagenes[index] : null;
    if (!imgActiva) return;

    if (hiddenRatingId) hiddenRatingId.value = imgActiva.id;
    if (hiddenCommentId) hiddenCommentId.value = imgActiva.id;

    if (photoCounter) photoCounter.textContent = `Imagen ${index + 1} de ${window.listaImagenes.length}`;
    if (currentRating) currentRating.textContent = `⭐ ${imgActiva.average_assessment || '0.0'}`;
    if (currentVotes) currentVotes.textContent = `(${imgActiva.number_assessments || 0} votos)`;

    if (commentsBox) {
        commentsBox.innerHTML = '';

        if (imgActiva.comentarios && imgActiva.comentarios.length > 0) {
            imgActiva.comentarios.forEach(c => {
                const div = document.createElement('div');
                div.className = 'comment-item';
                div.id = `comment-node-${c.id}`;
                div.style = 'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; font-size: 0.85rem; border-bottom: 1px solid #f0f0f0; padding-bottom: 6px;';

                const fechaFormateada = c.date ? new Date(c.date).toLocaleDateString('es-AR') : '';
                const autor = c.user ? c.user.username : (c.usuario || `Usuario #${c.user_id}`);

                const currentId = window.currentUserId ? Number(window.currentUserId) : null;
                const authorId = window.postAuthorId ? Number(window.postAuthorId) : null;
                const commentUserId = Number(c.user_id);

                // Reglas de visibilidad
                const esComentarioDelAutorPost = Boolean(authorId && commentUserId === authorId);
                const esMiPropioComentario = Boolean(currentId && commentUserId === currentId);
                const esDuenioDelPost = Boolean(currentId && currentId === authorId);

                // Denunciar: usuario logueado, no es su post y no es su propio comentario
                const puedeDenunciar = Boolean(currentId && !esComentarioDelAutorPost && !esMiPropioComentario);

                // Borrar: el que escribió el comentario O el dueño de la publicación
                const puedeBorrar = Boolean(currentId && (esMiPropioComentario || esDuenioDelPost));

                div.innerHTML = `
                    <div class="comment-main" style="flex-grow: 1; padding-right: 8px;">
                        <strong class="comment-user" style="color: #333; margin-right: 6px;">${autor}:</strong>
                        <span class="comment-text" style="color: #555;">${c.content || c.texto}</span>
                        <div style="font-size: 0.75rem; color: #999; margin-top: 2px;">${fechaFormateada}</div>
                    </div>
                    <div class="comment-actions" style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                        ${puedeDenunciar ? `
                            <button 
                                type="button"
                                class="btn-denunciar-comentario" 
                                data-comment-id="${c.id}" 
                                title="Denunciar comentario"
                                style="background: transparent; border: none; cursor: pointer; font-size: 0.85rem; padding: 0; line-height: 1;"
                            >🚩</button>
                        ` : ''}

                        ${puedeBorrar ? `
                            <button 
                                type="button"
                                class="btn-borrar-comentario" 
                                data-comment-id="${c.id}" 
                                title="Eliminar comentario"
                                style="background: transparent; border: none; cursor: pointer; font-size: 0.85rem; padding: 0; line-height: 1; opacity: 0.7; transition: opacity 0.2s;"
                                onmouseover="this.style.opacity='1'"
                                onmouseout="this.style.opacity='0.7'"
                            >🗑️</button>
                        ` : ''}
                    </div>
                `;
                commentsBox.appendChild(div);
            });
        } else {
            commentsBox.innerHTML = '<p class="no-comments-text" style="color: #999; font-size: 0.85rem; text-align: center; margin: 15px 0;">No hay comentarios en esta imagen aún.</p>';
        }
    }
};

const cambiarSlide = (nuevoIndice) => {
    if (slides.length === 0) return;

    slides[currentIndex].style.display = 'none';

    currentIndex = nuevoIndice;
    if (currentIndex >= slides.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = slides.length - 1;

    slides[currentIndex].style.display = 'block';
    actualizarContenidoImagen(currentIndex);
};

// Navegación de carrusel
if (btnNext) btnNext.addEventListener('click', () => cambiarSlide(currentIndex + 1));
if (btnPrev) btnPrev.addEventListener('click', () => cambiarSlide(currentIndex - 1));

// PUBLICAR COMENTARIOS
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

                // Persistir en memoria local
                if (window.listaImagenes && window.listaImagenes[currentIndex]) {
                    window.listaImagenes[currentIndex].comentarios.push({ 
                        id: resultado.commentId || Date.now(),
                        user_id: window.currentUserId,
                        user: { username: resultado.username },
                        content: textoComentario,
                        date: new Date()
                    });
                }

                actualizarContenidoImagen(currentIndex);
            } else {
                crearToast("No se pudo publicar tu comentario.", "error");
            }
        } catch (error) {
            crearToast("Error de conexión al publicar el comentario", "error");
        }
    });
}

// VALORACIONES
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
                crearToast("¡Voto registrado con éxito!", "success");
                
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
            console.error("Error de red al enviar la valoración:", error);
            crearToast("Error de conexión al votar", "error");
        }
    });
}

// TOGGLE COMENTARIOS
const btnToggleComments = document.querySelector('#btn-toggle-comments');
const footerCommentBox = document.querySelector('#footer-comment-box');
const commentsClosedMsg = document.querySelector('#comments-closed-msg');

if (btnToggleComments) {
    btnToggleComments.addEventListener('click', async () => {
        const postId = btnToggleComments.getAttribute('data-post-id');
        try {
            const response = await fetch('/post/toggle-comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId })
            });
            const data = await response.json();

            if (data.success) {
                if (data.comments_allowed) {
                    btnToggleComments.textContent = 'Cerrar comentarios';
                    if (footerCommentBox) footerCommentBox.style.display = 'block';
                    if (commentsClosedMsg) commentsClosedMsg.style.display = 'none';
                } else {
                    btnToggleComments.textContent = 'Abrir comentarios';
                    if (footerCommentBox) footerCommentBox.style.display = 'none';
                    if (commentsClosedMsg) commentsClosedMsg.style.display = 'block';
                }
                crearToast(data.message, "success");
            } else {
                crearToast(data.message, "error");
            }
        } catch (error) {
            console.error("Error al alternar comentarios:", error);
            crearToast("Error de conexión", "error");
        }
    });
}

// BOTÓN "ME INTERESA"
const btnInteres = document.querySelector('#btn-interes');
if (btnInteres) {
    btnInteres.addEventListener('click', async () => {
        const idFotoActiva = hiddenRatingId ? hiddenRatingId.value : null;
        if (!idFotoActiva) return;

        try {
            const response = await fetch('/interes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageId: idFotoActiva })
            });

            const data = await response.json();
            if (data.success) {
                window.location.href = data.redirectUrl;
            } else {
                crearToast(data.message || 'No se pudo registrar el interés', 'error');
            }
        } catch (err) {
            console.error(err);
            crearToast('Error de conexión', 'error');
        }
    });
}

// DENUNCIA DE IMÁGENES
const btnAbrirDenuncia = document.querySelector('#btn-abrir-denuncia');
const modalDenuncia = document.querySelector('#modal-denuncia');
const btnCancelarDenuncia = document.querySelector('#btn-cancelar-denuncia');
const formDenuncia = document.querySelector('#form-denuncia');

if (btnAbrirDenuncia) {
    btnAbrirDenuncia.addEventListener('click', () => {
        if (modalDenuncia) modalDenuncia.style.display = 'flex';
    });
}

if (btnCancelarDenuncia) {
    btnCancelarDenuncia.addEventListener('click', () => {
        if (modalDenuncia) modalDenuncia.style.display = 'none';
    });
}

if (formDenuncia) {
    formDenuncia.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idFotoActiva = hiddenRatingId ? hiddenRatingId.value : null;
        const reason = document.querySelector('#select-reason').value;
        const description = document.querySelector('#text-justification').value;

        try {
            const res = await fetch('/denunciar/imagen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageId: idFotoActiva, reason, description })
            });
            const data = await res.json();

            modalDenuncia.style.display = 'none';
            formDenuncia.reset();
            crearToast(data.message, data.success ? 'success' : 'error');
        } catch (error) {
            console.error(error);
            crearToast('Error al procesar la denuncia.', 'error');
        }
    });
}

// DENUNCIA DE COMENTARIOS
const modalDenunciaComentario = document.querySelector('#modal-denuncia-comentario');
const btnCancelarDenunciaComentario = document.querySelector('#btn-cancelar-denuncia-comentario');
const formDenunciaComentario = document.querySelector('#form-denuncia-comentario');
const hiddenCommentInput = document.querySelector('#hidden-comment-id-denuncia');

// Abrir modal al tocar la banderita
if (commentsBox) {
    commentsBox.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-denunciar-comentario');
        if (!btn) return;

        const commentId = btn.getAttribute('data-comment-id');
        if (hiddenCommentInput) hiddenCommentInput.value = commentId;
        if (modalDenunciaComentario) modalDenunciaComentario.style.display = 'flex';
    });
}

if (commentsBox) {
    commentsBox.addEventListener('click', async (e) => {
        const btnDelete = e.target.closest('.btn-borrar-comentario');
        if (!btnDelete) return;

        const commentId = btnDelete.getAttribute('data-comment-id');
        if (!confirm("¿Seguro que deseas eliminar este comentario?")) return;

        try {
            const res = await fetch('/comentario/eliminar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commentId })
            });
            const data = await res.json();

            if (data.success) {
                crearToast("Comentario eliminado.", "success");

                // Quitamos el comentario del array local de memoria
                if (window.listaImagenes && window.listaImagenes[currentIndex]) {
                    window.listaImagenes[currentIndex].comentarios = 
                        window.listaImagenes[currentIndex].comentarios.filter(c => c.id != commentId);
                }

                // Removemos el nodo visualmente
                const nodo = document.querySelector(`#comment-node-${commentId}`);
                if (nodo) nodo.remove();

                // Si no quedaron comentarios, mostramos el texto de vacío
                if (commentsBox.children.length === 0) {
                    commentsBox.innerHTML = '<p class="no-comments-text" style="color: #999; font-size: 0.85rem; text-align: center; margin: 15px 0;">No hay comentarios en esta imagen aún.</p>';
                }
            } else {
                crearToast(data.message || "Error al eliminar comentario.", "error");
            }
        } catch (err) {
            console.error("Error al eliminar comentario:", err);
            crearToast("Error de conexión.", "error");
        }
    });
}

// Cerrar modal de comentario
if (btnCancelarDenunciaComentario) {
    btnCancelarDenunciaComentario.addEventListener('click', () => {
        if (modalDenunciaComentario) modalDenunciaComentario.style.display = 'none';
    });
}

// Enviar denuncia de comentario
if (formDenunciaComentario) {
    formDenunciaComentario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const commentId = hiddenCommentInput ? hiddenCommentInput.value : null;
        const reason = document.querySelector('#select-reason-comment').value;
        const description = document.querySelector('#text-justification-comment').value;

        try {
            const res = await fetch('/denunciar/comentario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commentId, reason, description })
            });
            const data = await res.json();

            if (modalDenunciaComentario) modalDenunciaComentario.style.display = 'none';
            formDenunciaComentario.reset();
            crearToast(data.message, data.success ? 'success' : 'error');
        } catch (error) {
            console.error(error);
            crearToast('Error al procesar la denuncia del comentario.', 'error');
        }
    });
}

// BOTÓN FOLLOW Y CARGA INICIAL
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
            const response = await fetch('/follow', {
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
                crearToast(resultado.message || "No se pudo cambiar el seguimiento", "error");
            }
        } catch (error) {
            console.error("Error al seguir al usuario:", error);
            crearToast("Error de conexión al seguir", "error");
        }
    }
});

// CONTROL DEL MODAL DE COLECCIONES
const btnAbrirModalCol = document.querySelector('#btn-abrir-modal-coleccion');
const modalCol = document.querySelector('#modal-colecciones');
const btnCancelarModalCol = document.querySelector('#btn-cancelar-modal-col');
const selectMisColecciones = document.querySelector('#select-mis-colecciones');
const formGuardarColeccion = document.querySelector('#form-guardar-coleccion');
const formNuevaColRapida = document.querySelector('#form-nueva-coleccion-rapida');

// Cargar colecciones del usuario y abrir modal
if (btnAbrirModalCol) {
    btnAbrirModalCol.addEventListener('click', async () => {
        modalCol.style.display = 'flex';
        selectMisColecciones.innerHTML = '<option value="" disabled selected>Cargando...</option>';

        try {
            const res = await fetch('/colecciones/mis-colecciones');
            const data = await res.json();

            if (data.success && data.colecciones.length > 0) {
                selectMisColecciones.innerHTML = data.colecciones.map(c => 
                    `<option value="${c.id}">${c.title} (${c.public ? 'Pública' : 'Privada'})</option>`
                ).join('');
            } else {
                selectMisColecciones.innerHTML = '<option value="" disabled selected>No tienes colecciones aún</option>';
            }
        } catch (error) {
            console.error(error);
            selectMisColecciones.innerHTML = '<option value="" disabled selected>Error al cargar colecciones</option>';
        }
    });
}

if (btnCancelarModalCol) {
    btnCancelarModalCol.addEventListener('click', () => {
        modalCol.style.display = 'none';
    });
}

// Guardar post en la colección elegida
if (formGuardarColeccion) {
    formGuardarColeccion.addEventListener('submit', async (e) => {
        e.preventDefault();
        const collectionId = selectMisColecciones.value;
        const postId = document.querySelector('#coleccion-post-id').value;

        if (!collectionId) return;

        try {
            const res = await fetch('/colecciones/agregar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collectionId, postId })
            });
            const data = await res.json();

            modalCol.style.display = 'none';
            crearToast(data.message, data.success ? 'success' : 'error');
        } catch (err) {
            console.error(err);
            crearToast('Error al guardar en la colección', 'error');
        }
    });
}

// Crear colección en el mismo modal
if (formNuevaColRapida) {
    formNuevaColRapida.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.querySelector('#input-nuevo-titulo-col').value;
        const isPublic = document.querySelector('#check-col-publica').checked;

        try {
            const res = await fetch('/colecciones/crear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, isPublic })
            });
            const data = await res.json();

            if (data.success) {
                crearToast("Colección creada", "success");
                // Insertamos la nueva opción y la seleccionamos automáticamente
                const nuevaOpcion = document.createElement('option');
                nuevaOpcion.value = data.collection.id;
                nuevaOpcion.textContent = `${data.collection.title} (${data.collection.public ? 'Pública' : 'Privada'})`;
                nuevaOpcion.selected = true;

                if (selectMisColecciones.querySelector('option[disabled]')) {
                    selectMisColecciones.innerHTML = '';
                }
                selectMisColecciones.appendChild(nuevaOpcion);
                formNuevaColRapida.reset();
            } else {
                crearToast(data.message || 'Error al crear', 'error');
            }
        } catch (err) {
            console.error(err);
            crearToast('Error de conexión', 'error');
        }
    });
}

function crearToast(mensaje, tipo = "success") {
    const toast = document.createElement("div");
    toast.classList.add("toast-flotante", tipo);
    toast.innerText = mensaje;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("fade-out");
        toast.addEventListener("transitionend", () => toast.remove());
    }, 3000);
}