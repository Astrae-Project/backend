import express from 'express';
import { saveContact } from '../controllers/profileControllers.mjs';

const router = express.Router();

// Ruta para buscar startups
router.put('/cambiar-datos', saveContact );

export default router;