import express from 'express';
import { darPuntuacion, marcarComoLeido, saveContact, changeData, subirDocumento } from '../controllers/profileControllers.mjs';
import upload from '../middlewares/multer.config.mjs';

const router = express.Router();

// Ruta para buscar startups
router.put('/cambiar-datos', saveContact );

router.post('/resena', darPuntuacion );

router.put('/leido', marcarComoLeido );

router.put('/editar-perfil', changeData );

router.post('/subir-documento', upload.single('archivo') ,subirDocumento)

export default router;