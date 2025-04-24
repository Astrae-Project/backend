import express from 'express';
import { addToWaitlist, getWaitlistUsers, removeFromWaitlist } from '../controllers/waitlistController.mjs';

const router = express.Router();

// Ruta pública para añadir usuarios a la lista de espera
router.post('/', addToWaitlist);

// Rutas protegidas para administradores
router.get('/', getWaitlistUsers);
router.delete('/:id', removeFromWaitlist);

export default router; 