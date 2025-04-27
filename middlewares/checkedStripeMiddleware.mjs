import prisma from '../lib/prismaClient.mjs';

export const checkStripeAccount = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No autorizado. Token faltante.' });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    const user = await prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (!user.stripeChargesEnabled) {
      return res.status(403).json({ message: 'Tu cuenta Stripe no está habilitada para operar.' });
    }

    next();
  } catch (error) {
    console.error('Error verificando cuenta Stripe:', error.message);
    res.status(500).json({ message: 'Error verificando cuenta Stripe' });
  }
};
