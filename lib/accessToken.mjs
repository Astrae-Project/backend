import jwt from 'jsonwebtoken';

export const generateAccessToken = (user) => {
  console.log('Generando access token para el usuario:', user);
  
  const token = jwt.sign(
    { userId: user.id, role: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log('Access token generado:', token);
  return token;
};
