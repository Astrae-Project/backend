import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.mjs';
import { getProfile, updateProfile } from '../controllers/profileController.js';

const router = express.Router();

// Ruta protegida: obtener perfil (solo accesible para usuarios autenticados)
router.get('/perfil', verifyToken, getProfile);

// Ruta protegida: actualizar perfil (solo accesible para usuarios autenticados)
router.put('/perfil', verifyToken, updateProfile);

export default router;
