import express from 'express';
import { 
    datosUsuario, 
    datosPortfolio, 
    gruposUsuario, 
    movimientosRecientes, 
    obtenerContacto, 
    obtenerEventos, 
    startupsRecomendadas, 
    startupEspecifica 
} from '../controllers/fetchController.mjs';

const router = express.Router();

// Ruta general para obtener datos de usuario, dependiendo del rol (inversor o startup)
router.get('/usuario', datosUsuario);

// Ruta para obtener el portfolio de un usuario (inversor o startup)
router.get('/portfolio', datosPortfolio);

// Ruta fija para startups aleatorias
router.get('/startup/recomendadas', startupsRecomendadas);

// Ruta dinámica para obtener una startup específica
router.get('/startup/:startupId', startupEspecifica);

// Rutas adicionales
router.get('/grupos', gruposUsuario);
router.get('/movimientos-recientes', movimientosRecientes);
router.get('/contacto', obtenerContacto);
router.get('/eventos', obtenerEventos);

export default router;
