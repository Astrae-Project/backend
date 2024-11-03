import express from 'express';
import { darPuntuacion, saveContact } from '../controllers/profileControllers.mjs';

const router = express.Router();

// Ruta para buscar startups
router.put('/cambiar-datos', saveContact );

router.post('/resena', darPuntuacion );

export default router;