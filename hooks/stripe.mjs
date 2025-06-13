import { buffer } from 'micro';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { prisma } from '../../../lib/prisma';

dotenv.config();

const stripeEnabled = process.env.STRIPE_ENABLED === 'true';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

let stripe = null;
if (stripeEnabled && stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export const stripeWebhook = async (req, res) => {
  if (!stripe) {
    return res.status(503).send('Stripe deshabilitado');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Método no permitido');
  }

  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error('⚠️  Error verificando el webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'account.updated':
        const account = event.data.object;
        const stripeAccountId = account.id;

        let newStatus = 'pending';
        if (account.charges_enabled && account.payouts_enabled) {
          newStatus = 'active';
        } else if (account.details_submitted) {
          newStatus = 'under_review';
        }

        await prisma.stripeAccount.update({
          where: { stripeAccountId },
          data: { accountStatus: newStatus },
        });

        console.log(`Cuenta actualizada: ${stripeAccountId} -> ${newStatus}`);
        break;

      default:
        console.log(`Evento no manejado: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error procesando evento Stripe:', error);
    res.status(500).send('Internal Server Error');
  }
};
