import express from 'express';
import { offer, offerAccepted, offerRejected, counteroffer, acceptCounteroffer, rejectCounteroffer } from '../controllers/investController.mjs';
//import { authorizeRole } from '../middlewares/rolMiddleware.mjs';

const router = express.Router();

router.post('/oferta/:id', offer)

router.put('/oferta/:id_oferta/aceptar/:id_usuario', offerAccepted)

router.put('/oferta/:id_oferta/rechazar/:id_usuario', offerRejected)

router.post('/contraoferta/:id_oferta/:id_usuario', counteroffer)

router.put('/contraoferta/:id_oferta/aceptar/:id_usuario', acceptCounteroffer)

router.put('/contraoferta/:id_oferta/rechazar/:id_usuario', rejectCounteroffer)

export default router;
