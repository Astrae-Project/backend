import express from 'express';
import { investorOffer, offerAccepted, offerRejected, counteroffer, acceptCounteroffer, rejectCounteroffer } from '../controllers/investController.mjs';
import { verifyToken } from '../middlewares/tokenMiddleware.mjs';
import { authorizeRole } from '../middlewares/authMiddleware.mjs';

const router = express.Router();

router.post('/oferta/:id', verifyToken, authorizeRole('inversor'), investorOffer)

router.post('/oferta/:id/aceptar', verifyToken, authorizeRole('startup'), offerAccepted)

router.post('/oferta/:id/rechazar', verifyToken, authorizeRole('startup'), offerRejected)

router.post('/contraoferta/:id', verifyToken, counteroffer)

router.post('/contraoferta/:id/aceptar', verifyToken, acceptCounteroffer)

router.post('/contraoferta/:id/rechazar', verifyToken, rejectCounteroffer)

export default router;
