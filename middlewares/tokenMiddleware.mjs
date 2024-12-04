import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const { token, refreshToken } = req.cookies || {};

  // Verificar si el token de acceso está presente
  if (!token) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión para continuar.' });
  }

  try {
    // Verificar el token de acceso
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Guardar datos del usuario en req.user
    return next(); // Continuar con la solicitud
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      // Si el token de acceso ha expirado, verificar el refresh token
      if (!refreshToken) {
        return res.status(403).json({ error: 'Sesión expirada. Inicia sesión nuevamente.' });
      }

      try {
        // Renovar el access token usando el refresh token
        const userData = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Generar un nuevo access token
        const newToken = jwt.sign(
          { id: userData.id, role: userData.role },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        // Enviar el nuevo token en una cookie
        res.cookie('token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 3600000, // 1 hora
          sameSite: 'Lax',
        });

        req.user = userData; // Actualizar los datos del usuario autenticado
        return next(); // Continuar con la solicitud
      } catch (refreshError) {
        // Si el refresh token es inválido o ha expirado
        console.error('Error al procesar el refresh token:', refreshError);
        return res.status(403).json({ error: 'Sesión inválida. Inicia sesión nuevamente.' });
      }
    } else {
      // Otros errores con el token de acceso
      console.error('Error al verificar el token:', err);
      return res.status(403).json({ error: 'Token inválido. Inicia sesión nuevamente.' });
    }
  }
};
