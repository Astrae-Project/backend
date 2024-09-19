import express from 'express';
import { getProfile, updateProfile } from '../controllers/profileController.mjs';

const router = express.Router();

// Ruta protegida: obtener perfil (solo accesible para usuarios autenticados)
router.get('/perfil', getProfile);

// Ruta protegida: actualizar perfil (solo accesible para usuarios autenticados)
router.put('/perfil', updateProfile);

export default router;
