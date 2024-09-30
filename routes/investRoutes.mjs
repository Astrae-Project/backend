import express from 'express';
import { offer, offerAccepted, offerRejected, counteroffer, acceptCounteroffer, rejectCounteroffer } from '../controllers/investController.mjs';
//import { authorizeRole } from '../middlewares/rolMiddleware.mjs';

const router = express.Router();

router.post('/oferta/:id', offer)

router.post('/oferta/:id/aceptar', offerAccepted)

router.post('/oferta/:id/rechazar', offerRejected)

router.post('/contraoferta/:id', counteroffer)

router.post('/contraoferta/:id/aceptar', acceptCounteroffer)

router.post('/contraoferta/:id/rechazar', rejectCounteroffer)

export default router;
