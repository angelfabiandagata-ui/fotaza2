
export const requerirAutenticacion = (req, res, next) => {
    if (req.session && req.session.user) {
        return next(); // Esta logueado, pasa sin problemas
    }
    // Si no est logueado, lo mandamos derecho a la pantalla de login
    return res.redirect('/auth/login');
};