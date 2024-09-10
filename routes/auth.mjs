import express from 'express';
import { registerUser, loginUser } from '../controllers/authController.mjs';

const router = express.Router();

// Ruta para registrar un usuario
router.post('/registrar', registerUser);

// Ruta para iniciar sesión
router.post('/iniciar-sesion', loginUser);

export default router;
