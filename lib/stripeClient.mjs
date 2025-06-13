import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

let stripe = null;

if (process.env.STRIPE_ENABLED === 'true') {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
}

export default stripe;
