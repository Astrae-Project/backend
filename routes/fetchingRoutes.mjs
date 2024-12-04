import express from 'express';
import { datosInversor, datosPortfolio, datosStartup, gruposUsuario, movimientosRecientes, obtenerContacto, obtenerEventos, startupsRecomendadas, startupEspecifica } from '../controllers/fetchController.mjs';

const router = express.Router();

router.get('/inversor', datosInversor);

router.get('/portfolio', datosPortfolio);

router.get('/startup', datosStartup);

router.get('/startup/recomendadas', startupsRecomendadas); // Ruta fija para startups aleatorias

router.get('/startup/:startupId', startupEspecifica);  // Ruta dinámica para una startup específica

router.get('/grupos', gruposUsuario);

router.get('/movimientos-recientes', movimientosRecientes)

router.get('/contacto', obtenerContacto)

router.get('/eventos', obtenerEventos)

export default router;
