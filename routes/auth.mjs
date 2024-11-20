import express from 'express';
import { registerUser, loginUser,loginOut } from '../controllers/authController.mjs';
import { selectRole, investorRole, startupRole } from '../controllers/rolController.mjs';

const router = express.Router();

// Ruta para registrar un usuario
router.post('/registrar', registerUser);

// Ruta para iniciar sesión
router.post('/iniciar-sesion', loginUser);

router.post('/cerrar-sesion', loginOut);

router.post('/seleccionar-rol', selectRole);

router.post('/crear-inversor/:id', investorRole);

router.post('/crear-startup/:id', startupRole)

export default router;
