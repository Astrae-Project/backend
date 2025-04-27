import jwt from 'jsonwebtoken';
import prisma from '../lib/prismaClient.mjs';

export const requirePaymentMethod = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Token no proporcionado.' });

    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.usuario.findUnique({ where: { id: userId } });
 
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (!user.payment_method_id) {
      return res.status(402).json({ 
        error: 'Debes registrar un método de pago antes de invertir.',
        redirect: '/ajustes' 
      });
    }

    req.userId = userId;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error autenticando método de pago.' });
  }
};
