import express from 'express';
import { createGroup, dropGroup, dataGroup, changeData, addMember, dropMember, sendMessage, seeMessage, changeRole, joinGroup, fueraGrupo } from '../controllers/groupControllers.mjs';

const router = express.Router();

// Crear Grupo
router.post('/crear', createGroup);

// Crear Grupo
router.post('/unir/:grupoId', joinGroup);

// Salir de Grupo
router.delete('/salir/:grupoId', dropGroup);

// Cambiar Datos del Grupo
router.put('/datos/:grupoId', changeData);

// Obtener Información de un Grupo
router.get('/data/:grupoId', dataGroup);

router.get('/disponible/:grupoId', fueraGrupo);

// Añadir Miembro a un Grupo
router.post('/anadir/:groupId/miembro/:memberId', addMember);

// Quitar Miembro de un Grupo
router.delete('/eliminar/:groupId/miembro/:memberId', dropMember);

// Enviar Mensaje en el Grupo
router.post('/enviar/:groupId/mensajes', sendMessage);

// Ver Mensajes de un Grupo
router.get('/ver/:groupId/mensajes', seeMessage);

// Cambiar Rol de un Miembro
router.put('/cambio-rol/:grupoId/miembros/:memberId', changeRole);

export default router;
