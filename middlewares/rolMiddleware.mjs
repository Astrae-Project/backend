export const authorizeRole = (rol) => {
    return (req, res, next) => {
      if (req.usuario.rol !== rol) {
        return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
      }
      next();
    };
  };
  