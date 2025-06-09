import express from 'express';
import { addPaymentMethod, createAccountLink, createConnectedAccount, updateStripeAccountStatus } from '../controllers/stripeController.mjs';

const router = express.Router();

router.post('/crear-cuenta', createConnectedAccount);

router.post('/crear-link', createAccountLink)

router.post('/metodo-pago', addPaymentMethod);

router.get('/status', updateStripeAccountStatus)

export default router;
