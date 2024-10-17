import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  const refreshToken = req.cookies.refreshToken; // Obtener el refresh token

  // Verificar si existe el token de acceso
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Por favor, inicia sesión.' });
  }

  try {
    // Verificar el token de acceso
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Guardar los datos del usuario en req.user
    return next(); // Continuar con la solicitud

  } catch (err) {
    // Si el token ha expirado
    if (err.name === 'TokenExpiredError') {
      // Verificar si existe el refresh token
      if (!refreshToken) {
        return res.status(403).json({ error: 'Sesión expirada. Inicia sesión nuevamente.' });
      }

      try {
        // Verificar el refresh token
        const userData = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Generar un nuevo token de acceso
        const newToken = jwt.sign({ id: userData.id, role: userData.role }, process.env.JWT_SECRET, {
          expiresIn: '1h'
        });

        // Enviar el nuevo token en la cookie
        res.cookie('token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // Solo usar secure en producción
          maxAge: 3600000, // 1 hora
          sameSite: 'Lax' // Mejora la seguridad de la cookie
        });

        req.user = userData; // Actualizar los datos del usuario autenticado
        return next(); // Continuar con la solicitud

      } catch (refreshError) {
        // Si el refresh token es inválido o ha expirado
        return res.status(403).json({ error: 'Sesión inválida. Inicia sesión nuevamente.' });
      }
    } else {
      // Otro error con el token de acceso
      return res.status(403).json({ error: 'Token inválido. Inicia sesión nuevamente.' });
    }
  }
};
