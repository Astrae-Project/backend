import jwt from 'jsonwebtoken';
import prisma from '../lib/prismaClient.mjs';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15',
});

// Lista de países soportados por tu plataforma/Stripe
const SUPPORTED_COUNTRIES = ['ES', 'FR', 'DE', 'IT', 'NL', 'BE', 'PT'];

export const createConnectedAccount = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado.' });
    }
    const { userId, role } = jwt.verify(token, process.env.JWT_SECRET);
    if (!userId) {
      return res.status(401).json({ error: 'ID de usuario no encontrado en el token.' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (!SUPPORTED_COUNTRIES.includes(usuario.pais || '')) {
      return res.status(400).json({ error: 'País no soportado por Stripe.' });
    }

    const exists = await prisma.stripeAccount.findUnique({ where: { userId } });
    if (exists) {
      return res.status(400).json({ error: 'El usuario ya tiene una cuenta de Stripe conectada.' });
    }

    let businessType = 'individual';
    if (role === 'startup') businessType = 'company';
    else if (role !== 'inversor') {
      return res.status(400).json({ error: 'Rol de usuario inválido para crear cuenta Stripe.' });
    }

    const account = await stripe.accounts.create({
      type: 'express',
      email: usuario.email,
      country: usuario.pais,
      business_type: businessType,
      capabilities: { transfers: { requested: true } },
    });

    await prisma.stripeAccount.create({
      data: {
        userId,
        stripeAccountId: account.id,
        accountStatus: 'pending',
      },
    });

    return res.status(200).json({
      message: 'Cuenta de Stripe creada correctamente.',
      accountId: account.id,
    });
  } catch (err) {
    console.error('Error creando cuenta Stripe:', err.message);
    return res.status(500).json({ error: 'Error creando cuenta Stripe.', details: err.message });
  }
};

export const createAccountLink = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado.' });
    }
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    if (!userId) {
      return res.status(401).json({ error: 'ID de usuario no encontrado en el token.' });
    }

    const sa = await prisma.stripeAccount.findUnique({ where: { userId } });
    if (!sa) {
      return res.status(404).json({ error: 'Cuenta Stripe no encontrada para este usuario.' });
    }

    const link = await stripe.accountLinks.create({
      account: sa.stripeAccountId,
      refresh_url: process.env.STRIPE_REFRESH_URL,
      return_url: process.env.STRIPE_RETURN_URL,
      type: 'account_onboarding',
    });

    return res.status(200).json({ url: link.url });
  } catch (err) {
    console.error('Error creando enlace de onboarding Stripe:', err.message);
    return res.status(500).json({ error: 'Error creando enlace de onboarding de Stripe.', details: err.message });
  }
};

export const updateStripeAccountStatus = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado.' });
    }
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    if (!userId) {
      return res.status(401).json({ error: 'ID de usuario no encontrado en el token.' });
    }

    const sa = await prisma.stripeAccount.findUnique({ where: { userId } });
    if (!sa) {
      return res.status(404).json({ error: 'Cuenta Stripe no encontrada para este usuario.' });
    }

    const acct = await stripe.accounts.retrieve(sa.stripeAccountId);
    let status = 'pending';
    if (acct.charges_enabled && acct.payouts_enabled) status = 'active';
    else if (acct.details_submitted) status = 'under_review';

    await prisma.stripeAccount.update({
      where: { userId },
      data: { accountStatus: status },
    });

    return res.status(200).json({
      message: 'Estado de la cuenta Stripe actualizado correctamente.',
      accountStatus: status,
    });
  } catch (err) {
    console.error('Error actualizando estado de cuenta Stripe:', err.message);
    return res.status(500).json({ error: 'Error actualizando estado de la cuenta Stripe.', details: err.message });
  }
};

export const addPaymentMethod = async (req, res) => {
  try {
    const token = req.cookies.token;
    const { paymentMethodId } = req.body;
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });
    if (!paymentMethodId) return res.status(400).json({ message: 'El ID del método de pago es obligatorio' });

    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // Crear Customer si no existe
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username,
      });
      customerId = customer.id;
      await prisma.usuario.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Adjuntar el método de pago
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Definir como predeterminado
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethod.id },
    });

    await prisma.usuario.update({
      where: { id: userId },
      data: { payment_method_id: paymentMethod.id },
    });

    // Verificar CVC
    if (paymentMethod.card?.checks?.cvc_check === 'fail') {
      return res.status(400).json({ message: 'CVC no válido' });
    }

    // Autenticación adicional si necesita 3D Secure
    if (paymentMethod.card?.checks?.cvc_check !== 'pass') {
      const pi = await stripe.paymentIntents.create({
        amount: 0,
        currency: 'eur',
        customer: customerId,
        payment_method: paymentMethod.id,
        confirm: true,
      });
      if (pi.status === 'requires_action') {
        return res.status(200).json({
          requiresAction: true,
          clientSecret: pi.client_secret,
        });
      }
    }

    return res.status(200).json({
      message: 'Método de pago agregado correctamente',
      paymentMethodId: paymentMethod.id,
    });
  } catch (err) {
    console.error('Error al agregar método de pago:', err.message);
    return res.status(500).json({ message: 'Error al agregar el método de pago', details: err.message });
  }
};
