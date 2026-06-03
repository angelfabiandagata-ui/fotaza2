export const manejoDeErrores = (err, req, res, next) => {
// Si Express frena la petición porque el Base64 supero el límite seteado
    if (err.status === 413 || err.type === 'entity.too.large') {
        
        return res.status(413).json({
            success: false,
            message: 'Tamaño excedido: Las imágenes son demasiado pesadas para el servidor'
        });
    }

    // Si es otro tipo de error que siga su curso
    console.error(" Error no controlado:", err);
    res.status(500).send("Error interno del servidor");
};