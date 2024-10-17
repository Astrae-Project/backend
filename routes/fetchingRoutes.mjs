import express from 'express';
import { datosInversor, datosPortfolio, datosStartup, gruposUsuario, movimientosRecientes, obtenerContacto, obtenerEventos } from '../controllers/fetchController.mjs';

const router = express.Router();

router.get('/inversor', datosInversor);

router.get('/portfolio', datosPortfolio);

router.get('/startup', datosStartup);

router.get('/grupos', gruposUsuario);

router.get('/movimientos-recientes', movimientosRecientes)

router.get('/contacto', obtenerContacto)

router.get('/eventos', obtenerEventos)

export default router;
