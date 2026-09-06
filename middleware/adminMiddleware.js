export const requerirValidador = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/auth/login');
    }
    if (req.session.user.role !== 'admin') {
        return res.status(403).send("Acceso denegado: se requiere rol de validador de contenidos.");
    }
    next();
};