import express from 'express';
import { darPuntuacion, marcarComoLeido, saveContact, changeData } from '../controllers/profileControllers.mjs';

const router = express.Router();

// Ruta para buscar startups
router.put('/cambiar-datos', saveContact );

router.post('/resena', darPuntuacion );

router.put('/leido', marcarComoLeido );

router.put('/editar-perfil', changeData );

export default router;