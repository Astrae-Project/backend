import express from 'express';
import { changeEvent, createEvent, dataEvent, dropEvent } from '../controllers/eventControllers.mjs';

const router = express.Router();

// Crear Grupo
router.post('/crear', createEvent);

// Salir de Grupo
router.delete('/eliminar', dropEvent);

// Cambiar Datos del Grupo
router.put('/datos/:eventoId', changeEvent);

// Obtener Información de un Grupo
router.get('/data/:eventoId', dataEvent);

export default router;
