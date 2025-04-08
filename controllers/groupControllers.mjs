import prisma from '../lib/prismaClient.mjs';
import jwt from 'jsonwebtoken'

export const createGroup = async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    if (!userId) {
      return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
    }

    const { nombre, descripcion, tipo } = req.body;

    // Crear el grupo
    const grupo = await prisma.grupo.create({
      data: {
        id_usuario: userId, // Aquí se asigna el id del creador
        nombre,
        descripcion,
        tipo,
        usuarios: {
          create: {
            id_usuario: userId,   // Agregar el usuario creador con rol de administrador
            rol: 'administrador'  // Asignar al creador como administrador del grupo
          }
        }
      }
    });

    // Responder con el grupo creado
    res.status(201).json(grupo);
  } catch (error) {
    console.error('Error al crear el grupo:', error);
    res.status(500).json({ message: 'Error al crear el grupo' });
  }
};

export const joinGroup = async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    if (!userId) {
      return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
    }

    const { grupoId } = req.params;
    const parsedGroupId = parseInt(grupoId, 10);

    if (isNaN(parsedGroupId)) {
      return res.status(400).json({ message: 'ID de grupo inválido' });
    }

    const grupo = await prisma.grupo.findUnique({
      where: { id: parsedGroupId },
    });

    if (!grupo) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }

    const relacionExistente = await prisma.grupoUsuario.findUnique({
      where: {
        id_grupo_id_usuario: {
          id_grupo: parsedGroupId,
          id_usuario: userId,
        },
      },
    });

    if (relacionExistente) {
      return res.status(400).json({ message: 'Ya eres miembro de este grupo' });
    }

    if (grupo.tipo === 'privado') {
      return res.status(406).json({ message: 'Este grupo es privado, necesitas una invitación para unirte' });
    }

    // Obtener el nombre de usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Crear la relación entre el usuario y el grupo
    await prisma.grupoUsuario.create({
      data: {
        id_grupo: parsedGroupId,
        id_usuario: userId,
        rol: 'miembro',
      },
    });

    // Obtener a los participantes del grupo
    const participantes = await prisma.grupoUsuario.findMany({
      where: { id_grupo: parsedGroupId },
      select: { id_usuario: true },
    });

    // Crear notificaciones para los participantes con el username del usuario que se unió
    await prisma.notificacion.createMany({
      data: participantes.map((p) => ({
        id_usuario: p.id_usuario,
        contenido: `@${usuario.username} se ha unido al grupo ${grupo.nombre}`,
        tipo: 'grupo',
      })),
    });

    res.status(201).json({ message: 'Te has unido al grupo con éxito' });
  } catch (error) {
    console.error('Error al unirse al grupo:', error);
    res.status(500).json({ message: 'Error al unirse al grupo' });
  }
};

export const dropGroup = async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    if (!userId) {
      return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
    }

    const { groupId } = req.params;
    const parsedGroupId = parseInt(groupId, 10);

    if (isNaN(parsedGroupId)) {
      return res.status(400).json({ message: 'ID de grupo inválido' });
    }

    // Verificar si el grupo existe
    const grupo = await prisma.grupo.findUnique({
      where: { id: parsedGroupId },
      include: {
        usuarios: true, // Obtener todos los miembros del grupo
      },
    });

    if (!grupo) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }

    // Verificar si el usuario está en el grupo
    const relacion = await prisma.grupoUsuario.findUnique({
      where: {
        id_grupo_id_usuario: {
          id_grupo: parsedGroupId,
          id_usuario: userId,
        },
      },
    });

    if (!relacion) {
      return res.status(403).json({ message: 'No estás en este grupo' });
    }

    // Verificar si el usuario es el único administrador del grupo
    const administradores = await prisma.grupoUsuario.findMany({
      where: {
        id_grupo: parsedGroupId,
        rol: 'administrador', // Asumiendo que el campo 'rol' indica si es administrador
      },
    });

    if (administradores.length === 1 && administradores[0].id_usuario === userId) {
      return res.status(403).json({
        message: 'Eres el único administrador. Debes asignar otro administrador antes de salir.',
      });
    }

    // Eliminar la relación del usuario con el grupo
    await prisma.grupoUsuario.delete({
      where: {
        id_grupo_id_usuario: {
          id_grupo: parsedGroupId,
          id_usuario: userId,
        },
      },
    });

    res.status(200).json({ message: 'Has salido del grupo con éxito' });
  } catch (error) {
    console.error('Error al salir del grupo:', error);
    res.status(500).json({ message: 'Error al salir del grupo' });
  }
};


export const dataGroup = async (req, res) => {
  try {
    const { grupoId } = req.params;
    if (!grupoId) {
      return res.status(400).json({ message: 'ID del grupo no proporcionado' });
    }

    // Busca el grupo, incluye los usuarios, el creador y la configuración de permisos
    const grupo = await prisma.grupo.findUnique({
      where: { id: parseInt(grupoId) },
      include: {
        usuarios: { include: { usuario: true } },
        creador: true,
        ConfiguracionPermiso: true, // Asegúrate de que esta relación exista en el modelo Grupo
      },
    });

    if (!grupo) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }

    // Formatear los miembros
    const miembros = grupo.usuarios.map((grupoUsuario) => ({
      id: grupoUsuario.usuario.id,
      username: grupoUsuario.usuario.username,
      rol: grupoUsuario.rol,
      avatar: grupoUsuario.usuario.avatar,
    }));

    // Formatear los permisos (configuración de permisos para este grupo)
    const permisos = grupo.ConfiguracionPermiso.map((cp) => ({
      permiso: cp.permiso,
      abierto: cp.abierto,
    }));

    // Responder con todos los datos
    return res.status(200).json({
      id: grupo.id,
      nombre: grupo.nombre,
      descripcion: grupo.descripcion,
      tipo: grupo.tipo,
      fecha_creacion: grupo.fecha_creacion,
      foto_grupo: grupo.foto_grupo,
      creador: {
        id: grupo.creador.id,
        username: grupo.creador.username,
        avatar: grupo.creador.avatar,
      },
      miembros,
      permisos, // Agregamos la configuración de permisos
    });
  } catch (error) {
    console.error('Error al obtener la información del grupo:', error);
    return res.status(500).json({ message: 'Error al obtener la información del grupo' });
  }
};

export const fueraGrupo = async (req, res) => {
  try {
    const { grupoId } = req.params;

    if (!grupoId) {
      return res.status(400).json({ message: 'ID del grupo no proporcionado' });
    }

    const parsedGroupId = parseInt(grupoId, 10);

    // Verificar que el grupo existe
    const grupo = await prisma.grupo.findUnique({
      where: { id: parsedGroupId },
    });

    if (!grupo) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    // Obtener IDs de usuarios que ya son miembros del grupo
    const miembrosGrupo = await prisma.grupoUsuario.findMany({
      where: { id_grupo: parsedGroupId },
      select: { id_usuario: true },
    });

    // Filtrar valores undefined y obtener solo los ID válidos
    const usuariosIdsEnGrupo = miembrosGrupo
      .map(miembro => miembro.id_usuario)
      .filter(id => id !== undefined && id !== null); // Asegurar que no haya valores inválidos

    // Obtener usuarios que NO están en el grupo
    const usuariosDisponibles = await prisma.usuario.findMany({
      where: {
        id: {
          notIn: usuariosIdsEnGrupo.length > 0 ? usuariosIdsEnGrupo : [-1], // Evitar error si está vacío
        },
      },
      select: {
        id: true,
        username: true,
        avatar: true,
      },
    });

    return res.status(200).json(usuariosDisponibles);
  } catch (error) {
    console.error('Error al obtener usuarios disponibles:', error);
    return res.status(500).json({ error: 'Error al obtener usuarios disponibles' });
  }
};

export const changeData = async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = parseInt(decodedToken.userId, 10);

    if (!userId) {
      return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
    }

    const { grupoId } = req.params;
    const { nombre, descripcion, tipo } = req.body;

    // Verificar si el usuario es administrador del grupo
    const grupoUsuario = await prisma.grupoUsuario.findUnique({
      where: {
        id_grupo_id_usuario: {
          id_grupo: parseInt(grupoId, 10),
          id_usuario: userId,
        },
      },
    });

    if (!grupoUsuario || grupoUsuario.rol !== 'administrador') {
      return res.status(403).json({ message: 'No tienes permisos para realizar esta acción' });
    }

    // Obtener los datos actuales del grupo
    const grupoActual = await prisma.grupo.findUnique({
      where: { id: parseInt(grupoId, 10) },
    });

    if (!grupoActual) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }

    // Determinar qué cambios se realizaron
    const cambios = [];
    if (nombre && nombre !== grupoActual.nombre) cambios.push(`Nombre: "${grupoActual.nombre}" → "${nombre}"`);
    if (descripcion && descripcion !== grupoActual.descripcion) cambios.push('Descripción actualizada');
    if (tipo && tipo !== grupoActual.tipo) cambios.push(`Tipo cambiado a "${tipo}"`);

    // Si no hay cambios reales, no actualizar ni notificar
    if (cambios.length === 0) {
      return res.status(200).json({ message: 'No se realizaron cambios en el grupo' });
    }

    // Actualizar el grupo
    const grupoActualizado = await prisma.grupo.update({
      where: { id: parseInt(grupoId, 10) },
      data: { nombre, descripcion, tipo },
    });

    // Obtener los miembros del grupo
    const miembros = await prisma.grupoUsuario.findMany({
      where: { id_grupo: parseInt(grupoId, 10) },
      select: { id_usuario: true },
    });

    // Crear notificaciones para los miembros
    await prisma.notificacion.createMany({
      data: miembros.map((m) => ({
        id_usuario: m.id_usuario,
        contenido: `El grupo "${grupoActual.nombre}" ha sido modificado: ${cambios.join(', ')}`,
        tipo: 'grupo',
      })),
    });

    return res.status(200).json({ message: 'Grupo actualizado y notificaciones enviadas', grupo: grupoActualizado });
  } catch (error) {
    console.error('Error al cambiar la información del grupo:', error);
    return res.status(500).json({ message: 'Error al cambiar la información del grupo' });
  }
};

export const addMember = async (req, res) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    if (!userId) {
      return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
    }

    const { groupId, memberId } = req.params; // ID del grupo y del nuevo miembro a añadir

    // Verificar que el grupo existe
    const grupo = await prisma.grupo.findUnique({
      where: {
        id: parseInt(groupId, 10),
      },
      include: {
        usuarios: true, // Incluye los usuarios actuales para verificar el rol del admin
      },
    });

    if (!grupo) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }

    // Verificar que el usuario que hace la solicitud es un administrador
    const admin = await prisma.grupoUsuario.findFirst({
      where: {
        id_usuario: userId,
        id_grupo: parseInt(groupId, 10),
        rol: 'administrador',
      },
    });

    if (!admin) {
      return res.status(403).json({ message: 'No tienes permisos para añadir miembros a este grupo' });
    }

    // Verificar si el nuevo miembro ya está en el grupo
    const existingMember = await prisma.grupoUsuario.findFirst({
      where: {
        id_usuario: parseInt(memberId, 10),
        id_grupo: parseInt(groupId, 10),
      },
    });

    if (existingMember) {
      return res.status(400).json({ message: 'El miembro ya está en el grupo' });
    }

    // Añadir el nuevo miembro al grupo
    const nuevoMiembro = await prisma.grupoUsuario.create({
      data: {
        id_usuario: parseInt(memberId, 10),
        id_grupo: parseInt(groupId, 10),
        rol: 'miembro', // Rol por defecto para el nuevo miembro
      },
    });

    // Crear notificación para el nuevo miembro
    await prisma.notificacion.create({
      data: {
        id_usuario: nuevoMiembro.id_usuario,
        contenido: `Te has unido al grupo ${grupo.nombre}`,
        tipo: 'grupo',
      },
    });

    res.status(201).json({ message: 'Miembro añadido exitosamente', nuevoMiembro });
  } catch (error) {
    console.error('Error al añadir miembro al grupo:', error);
    res.status(500).json({ message: 'Error al añadir miembro al grupo' });
  }
};

export const dropMember = async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = parseInt(decodedToken.userId, 10);

    if (!userId) {
      return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
    }

    const { groupId, memberId } = req.params; // Cambié "newMemberId" a "memberId" porque estamos eliminando

    // Verificar que el grupo existe
    const grupo = await prisma.grupo.findUnique({
      where: {
        id: parseInt(groupId, 10),
      },
    });

    if (!grupo) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }

    // Verificar que el usuario que hace la solicitud es un administrador
    const admin = await prisma.grupoUsuario.findFirst({
      where: {
        id_usuario: userId,
        id_grupo: parseInt(groupId, 10),
        rol: 'administrador',
      },
    });

    if (!admin) {
      return res.status(403).json({ message: 'No tienes permisos para expulsar miembros de este grupo' });
    }

    // Verificar si el miembro está en el grupo
    const existingMember = await prisma.grupoUsuario.findFirst({
      where: {
        id_usuario: parseInt(memberId, 10),
        id_grupo: parseInt(groupId, 10),
      },
    });

    if (!existingMember) {
      return res.status(400).json({ message: 'El usuario no es miembro del grupo' });
    }

    // Expulsar al miembro del grupo
    await prisma.grupoUsuario.delete({
      where: {
        id_grupo_id_usuario: {
          id_grupo: parseInt(groupId, 10),
          id_usuario: parseInt(memberId, 10),
        },
      },
    });

    // Crear notificación para el miembro expulsado
    await prisma.notificacion.create({
      data: {
        id_usuario: parseInt(memberId, 10),
        contenido: `Has sido expulsado del grupo "${grupo.nombre}".`,
        tipo: 'grupo',
      },
    });

    return res.status(200).json({ message: 'Miembro expulsado exitosamente' });
  } catch (error) {
    console.error('Error al expulsar miembro del grupo:', error);
    return res.status(500).json({ message: 'Error al expulsar miembro del grupo' });
  }
};
  
export const sendMessage = async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    const userId = parseInt(decodedToken.userId, 10);
    if (!userId) {
      return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
    }
    
    const { groupId } = req.params; 

    const { contenido } = req.body;

    if (!contenido || contenido.trim() === '') {
      return res.status(400).json({ message: 'El mensaje no puede estar vacío' });
    }

    const parsedGroupId = parseInt(String(groupId).trim(), 10);

    if (isNaN(parsedGroupId)) {
      return res.status(400).json({ message: 'groupId no es un número válido' });
    }

    const miembro = await prisma.grupoUsuario.findFirst({
      where: {
        id_usuario: userId,
        id_grupo: parsedGroupId,
      },
    });

    if (!miembro) {
      return res.status(403).json({ message: 'No eres miembro de este grupo' });
    }

    const mensaje = await prisma.mensaje.create({
      data: {
        id_grupo: parsedGroupId,
        id_emisor: userId,
        id_receptor: userId,
        contenido: contenido.trim(),
      },
    });

    res.status(201).json({ message: 'Mensaje enviado con éxito', mensaje });
  } catch (error) {
    console.error("❌ Error al enviar mensaje:", error);
    res.status(500).json({ message: 'Error al enviar mensaje', error: error.message });
  }
};

export const seeMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const parsedGroupId = parseInt(String(groupId).trim(), 10);
    if (isNaN(parsedGroupId)) {
      return res.status(400).json({ message: 'groupId no es un número válido' });
    }

    // Verificar que el grupo existe
    const grupo = await prisma.grupo.findUnique({
      where: { id: parsedGroupId },
    });
    if (!grupo) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }

    const mensajes = await prisma.mensaje.findMany({
      where: { id_grupo: parsedGroupId },
      orderBy: { fecha_envio: 'asc' },
      include: {
        emisor: {
          select: { id: true, username: true },
        },
      },
    });

    const ultimoMensaje = mensajes.length > 0 ? mensajes[mensajes.length - 1] : null;

    res.status(200).json({ mensajes, ultimoMensaje });
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ message: 'Error al obtener mensajes', error: error.message });
  }
};

export const changeRole = async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = parseInt(decodedToken.userId, 10);

    if (!userId) {
      return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
    }

    const { groupId, memberId } = req.params;
    const { newRole } = req.body;

    // Verificar si el grupo existe
    const grupo = await prisma.grupo.findUnique({
      where: { id: parseInt(groupId, 10) },
    });

    if (!grupo) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }

    // Verificar que el usuario que hace la solicitud es un administrador
    const admin = await prisma.grupoUsuario.findFirst({
      where: {
        id_usuario: userId,
        id_grupo: parseInt(groupId, 10),
        rol: 'administrador',
      },
    });

    if (!admin) {
      return res.status(403).json({ message: 'No tienes permisos para cambiar roles en este grupo' });
    }

    // Verificar que el miembro al que se quiere cambiar el rol existe en el grupo
    const miembro = await prisma.grupoUsuario.findFirst({
      where: {
        id_usuario: parseInt(memberId, 10),
        id_grupo: parseInt(groupId, 10),
      },
    });

    if (!miembro) {
      return res.status(404).json({ message: 'El usuario no es miembro del grupo' });
    }

    // Validar el nuevo rol
    const rolesPermitidos = ["miembro", "administrador"];
    if (!rolesPermitidos.includes(newRole)) {
      return res.status(400).json({ message: 'Rol no válido. Los roles permitidos son "miembro" y "administrador".' });
    }

    // Evitar que un administrador se degrade a sí mismo
    if (userId === parseInt(memberId, 10) && newRole !== 'administrador') {
      return res.status(400).json({ message: 'No puedes cambiar tu propio rol.' });
    }

    // Actualizar el rol del miembro
    await prisma.grupoUsuario.update({
      where: {
        id_grupo_id_usuario: {
          id_grupo: parseInt(groupId, 10),
          id_usuario: parseInt(memberId, 10),
        },
      },
      data: {
        rol: newRole,
      },
    });

    // Crear notificación para el usuario afectado
    await prisma.notificacion.create({
      data: {
        id_usuario: parseInt(memberId, 10),
        contenido: `Tu rol en el grupo "${grupo.nombre}" ha sido cambiado a "${newRole}".`,
        tipo: 'grupo',
      },
    });

    return res.status(200).json({ message: `Rol cambiado exitosamente a "${newRole}".` });
  } catch (error) {
    console.error('Error al cambiar el rol del usuario:', error);
    return res.status(500).json({ message: 'Error al cambiar el rol del usuario' });
  }
};
