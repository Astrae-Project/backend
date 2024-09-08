import express from 'express';
import { registerUser, loginUser } from '../controllers/authController.mjs';

const router = express.Router();

// Ruta para registrar un usuario
app.post('/register', registerUser);

// Ruta para iniciar sesión
app.post('/login', loginUser);

export default router;
