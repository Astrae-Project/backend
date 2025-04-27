import { buffer } from 'micro';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Función para manejar el webhook
export const stripeWebhook = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Método no permitido');
  }

  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('⚠️  Error verificando el webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Procesar los diferentes tipos de evento
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
          where: { stripeAccountId: stripeAccountId },
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
