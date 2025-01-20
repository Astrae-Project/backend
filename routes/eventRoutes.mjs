import express from 'express';
import { changeEvent, createEvent, dataEvent, desapuntarseEvento, dropEvent, inscribirEvento, buscarEventos } from '../controllers/eventControllers.mjs';

const router = express.Router();

router.get('/todos', buscarEventos);

router.post('/crear', createEvent);

router.delete('/eliminar/:eventoId', dropEvent);

router.put('/datos/:eventoId', changeEvent);

router.get('/data/:eventoId', dataEvent);

router.post('/entrar/:eventoId', inscribirEvento);

router.delete('/salir/:eventoId', desapuntarseEvento);

export default router;
