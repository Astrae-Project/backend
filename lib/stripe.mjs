const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY); // Asegúrate de usar variables de entorno

module.exports = stripe;
