import express from 'express';
import { investorOffer, offerAccepted, offerRejected, counteroffer, acceptCounteroffer, rejectCounteroffer } from '../controllers/investController.mjs';
import { authorizeRole } from '../middlewares/rolMiddleware.mjs';

const router = express.Router();

router.post('/oferta/:id', authorizeRole('inversor'), investorOffer)

router.post('/oferta/:id/aceptar', authorizeRole('startup'), offerAccepted)

router.post('/oferta/:id/rechazar', authorizeRole('startup'), offerRejected)

router.post('/contraoferta/:id', counteroffer)

router.post('/contraoferta/:id/aceptar', acceptCounteroffer)

router.post('/contraoferta/:id/rechazar', rejectCounteroffer)

export default router;
