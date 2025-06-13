import express from 'express';
import { darPuntuacion, marcarComoLeido, saveContact, changeData, subirDocumento, verDocumento } from '../controllers/profileControllers.mjs';
import multer from 'multer';

const router = express.Router();

// Ruta para buscar startups
router.put('/cambiar-datos', saveContact );

router.post('/resena', darPuntuacion );

router.put('/leido', marcarComoLeido );

router.put('/editar-perfil', changeData );

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');           // carpeta donde se guardan los archivos
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random()*1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ storage });

router.post('/subir-documento/:id_startup', upload.single('archivo'), subirDocumento);

router.get('/documento/:id_startup', verDocumento);

export default router;