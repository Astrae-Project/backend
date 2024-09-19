import express from 'express';
import { searchAll } from '../controllers/searchingController.mjs';

const router = express.Router();

// Ruta para buscar startups
router.get('/search', searchAll);

export default router;
