import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  const refreshToken = req.cookies.refreshToken; // Refresh token también en las cookies

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Por favor, inicia sesión.' });
  }

  try {
    // Verificar el token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Usuario autenticado
    next();
  } catch (err) {
    // Si el token ha expirado, intentar usar el refresh token
    if (err.name === 'TokenExpiredError' && refreshToken) {
      try {
        // Verificar el refresh token
        const userData = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        
        // Generar un nuevo access token
        const newToken = jwt.sign({ id: userData.id, role: userData.role }, process.env.JWT_SECRET, {
          expiresIn: '1h'
        });
        
        // Enviar el nuevo token en la cookie
        res.cookie('token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 3600000 // 1 hora
        });
        
        req.user = userData; // Usuario autenticado
        next(); // Continuar con la solicitud
      } catch (refreshError) {
        return res.status(403).json({ error: 'Token de refresco inválido o expirado.' });
      }
    } else {
      return res.status(403).json({ error: 'Sesión inválida o expirada. Inicia sesión nuevamente.' });
    }
  }
};
