import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next, err) => {
  // Cambia esto para acceder al nombre específico de la cookie que contiene el token
  const token = req.cookies.token; // Asumiendo que la cookie se llama 'token'

  try {
    if (!token) {
      // Si no hay token, devuelve un error de autorización
      return res.status(403).json({ message: "User not authorized" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        // Si la verificación del token falla (por ejemplo, expiró), devuelve un error de verificación
        return res.status(403).json({ message: "Verification failed" });
      }
      // Si el token es válido, adjunta el usuario decodificado a la solicitud
      req.user = user;
      next(); // Continúa con el siguiente middleware o ruta
    });
  } catch (error) {
    // Si ocurre un error en cualquier parte del proceso, lo manejamos aquí
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
