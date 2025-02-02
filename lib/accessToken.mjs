import jwt from 'jsonwebtoken';

export const generateAccessToken = (user) => {
  
  const token = jwt.sign(
    { userId: user.id, role: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  return token;
};
