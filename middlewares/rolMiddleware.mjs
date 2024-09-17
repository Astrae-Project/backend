export const authorizeRole = (role) => {
    return (req, res, next) => {
      if (req.user.role !== role) {
        return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
      }
      next();
    };
  };
  