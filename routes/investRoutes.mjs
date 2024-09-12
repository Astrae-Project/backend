import express from 'express';
import { investorOffer, offerAccepted, offerRejected, counteroffer, acceptCounteroffer, rejectCounteroffer } from '../controllers/investController.mjs';

const router = express.Router();

router.post('/inversor/oferta', investorOffer)

router.post('/oferta/:id/aceptar', offerAccepted)

router.post('/oferta/:id/rechazar', offerRejected)

router.post('/oferta/:id/aceptar', counteroffer)

router.post('/oferta/:id/aceptar', acceptCounteroffer)

router.post('/oferta/:id/aceptar', rejectCounteroffer)

export default router;
