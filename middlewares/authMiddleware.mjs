export const authorizeRole = (role) => (req, res, next) => {
    if (req.user.rol !== role) return res.status(403).json({ message: 'No tienes permiso para acceder a esta ruta' });
    next();
  };
  