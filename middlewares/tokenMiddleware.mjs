import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado. No se proporcionó un token.' });
  }

  try {
    // Verificar el token con la clave secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Guardar los datos del token decodificado en el request
    next(); // Continuar con la siguiente función en la ruta
  } catch (err) {
    return res.status(403).json({ message: 'Token inválido o expirado.' });
  }
};
