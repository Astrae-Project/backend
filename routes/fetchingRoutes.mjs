import express from 'express';
import { datosInversor, datosPortfolio, datosStartup, gruposUsuario } from '../controllers/fetchController.mjs';

const router = express.Router();

router.get('/inversor', datosInversor);

router.get('/portfolio', datosPortfolio);

router.get('/startup', datosStartup);

router.get('/grupos', gruposUsuario);

export default router;
