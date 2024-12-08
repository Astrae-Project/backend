import express from 'express';
import { follow, unfollow, suscribe, unsuscribe } from '../controllers/followControllers.mjs';

const router = express.Router();

router.post('/seguir', follow);

router.delete('/seguir', unfollow);

router.post('/suscribir', suscribe);

router.delete('/suscribir', unsuscribe);

export default router;
