import express from 'express';
import { datosUsuario, datosPortfolio, gruposUsuario, movimientosRecientes, obtenerContacto, obtenerEventos, startupsRecomendadas, usuarioEspecifico, obtenerHistoricos, todasStartups, todosGrupos, movimientosSinEventos, movimientosSeguidos, todosUsuarios, obtenerNotificaciones } from '../controllers/fetchController.mjs';

const router = express.Router();

// Ruta general para obtener datos de usuario, dependiendo del rol (inversor o startup)
router.get('/usuario', datosUsuario);

// Ruta dinámica para obtener un usuario específico por username
router.get('/usuario/:username', usuarioEspecifico)

// Ruta para obtener el portfolio de un usuario (inversor o startup)
router.get('/portfolio', datosPortfolio);

router.get('/startup', todasStartups);

// Ruta fija para startups aleatorias
router.get('/startup/recomendadas', startupsRecomendadas);

// Rutas adicionales
router.get('/grupos', gruposUsuario);
router.get('/todos-grupos', todosGrupos);
router.get('/todos-usuarios', todosUsuarios);
router.get('/movimientos-recientes', movimientosRecientes);
router.get('/movimientos-sin-eventos', movimientosSinEventos);
router.get('/movimientos-seguidos', movimientosSeguidos);
router.get('/contacto', obtenerContacto);
router.get('/eventos', obtenerEventos);
router.get('/historicos', obtenerHistoricos);
router.get('/notificaciones', obtenerNotificaciones);
 
export default router;
