import prisma from '../lib/prismaClient.mjs';
import jwt from 'jsonwebtoken';

export const createEvent = async (req, res) => {
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

    const { titulo, descripcion, tipo, fecha_evento } = req.body;

    // Verificación de campos obligatorios
    if (!titulo || !tipo || !descripcion || !fecha_evento) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    // Crear el evento
    const evento = await prisma.evento.create({
      data: {
        id_usuario: userId,
        titulo,
        descripcion,
        tipo,
        fecha_evento: new Date(fecha_evento), // Convierte a Date
      },
    });

    res.status(201).json(evento);
  } catch (error) {
    console.error('Error al crear el evento:', error);
    res.status(500).json({ message: 'Error al crear el evento' });
  }
};

export const dropEvent = async (req, res) => {
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

    const { eventoId } = req.params;
    const parsedEventoId = parseInt(eventoId, 10);

    if (isNaN(parsedEventoId)) {
      return res.status(400).json({ message: 'ID de evento inválido' });
    }

    // Obtener el evento y sus participantes
    const evento = await prisma.evento.findUnique({
      where: { id: parsedEventoId },
      include: {
        creador: true,
        participantes: {
          select: { id_usuario: true }, // Obtenemos solo los IDs de los participantes
        },
      },
    });

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    if (evento.creador.id !== userId) {
      return res.status(403).json({ message: 'No tienes permisos para eliminar este evento' });
    }

    // Extraer IDs de los participantes
    const usuariosIds = evento.participantes.map(p => p.id_usuario);

    // Eliminar el evento (esto eliminará automáticamente a los participantes por CASCADE)
    await prisma.evento.delete({
      where: { id: parsedEventoId },
    });

    // Obtener a los participantes del evento
    const participantes = await prisma.participante.findMany({
      where: { id_evento: parsedEventoId },
      select: { id_usuario: true },
    });
      
    // Crear notificaciones para los participantes
    await prisma.notificacion.createMany({
      data: participantes.map((p) => ({
        id_usuario: p.id_usuario,
        contenido: `El evento "${evento.titulo}" ha sido eliminado`,
        tipo: 'evento',
      })),
    });

    res.status(200).json({ message: 'Evento eliminado con éxito' });
  } catch (error) {
    console.error('Error al eliminar el evento:', error);
    res.status(500).json({ message: 'Error al eliminar el evento' });
  }
};

export const dataEvent = async (req, res) => {
    try {
      const { eventoId } = req.params;
  
      if (!eventoId) {
        return res.status(400).json({ message: 'ID del evento no proporcionado' });
      }
  
      const parsedEventoId = parseInt(eventoId, 10);
  
      // Verifica si el ID del evento es un número válido
      if (isNaN(parsedEventoId)) {
        return res.status(400).json({ message: 'ID de evento inválido' });
      }
  
      // Consulta el evento con sus participantes y el creador
      const evento = await prisma.evento.findUnique({
        where: { id: parsedEventoId },
        include: {
          participantes: {
            include: {
              usuario: true,
            },
          },
          creador: {
            include: {
              startups: true, // Incluimos startups para el caso de creador
              inversores: true, // Incluimos inversores para el caso de creador
            },
          },
        },
      });
  
      if (!evento) {
        return res.status(404).json({ message: 'Evento no encontrado' });
      }
  
      // Formateamos la información de los participantes
      const participantes = evento.participantes.map((eventoParticipante) => ({
        id: eventoParticipante.usuario.id,
        username: eventoParticipante.usuario.username,
      }));
  
      // Determinamos el tipo y el username del creador basado en su rol
      let creadorUsername = evento.creador.username; // Asumiendo que hay solo un username
  
      // Respuesta con la información del evento y sus participantes
      return res.status(200).json({
        id: evento.id,
        titulo: evento.titulo,
        descripcion: evento.descripcion,
        tipo: evento.tipo,
        fecha_evento: evento.fecha_evento,
        creador: {
          id: evento.creador.id,
          username: creadorUsername,
          tipo_creador: evento.creador.rol, // Asegúrate de que este campo esté presente
        },
        participantes,
      });
    } catch (error) {
      console.error('Error al obtener la información del evento:', error);
      return res.status(500).json({ message: 'Error al obtener la información del evento' });
    }
  };  

  export const changeEvent = async (req, res) => {
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
  
      const { eventoId } = req.params;
      const { titulo, descripcion, tipo, fecha_evento } = req.body;
  
      // Verificar si el evento existe y obtener su creador
      const evento = await prisma.evento.findUnique({
        where: { id: parseInt(eventoId, 10) },
        include: { creador: true },
      });
  
      if (!evento) {
        return res.status(404).json({ message: 'Evento no encontrado' });
      }
  
      // Verifica si el usuario es el creador del evento
      if (evento.creador.id !== userId) {
        return res.status(403).json({ message: 'No tienes permisos para realizar esta acción' });
      }
  
      // Determinar qué cambios se realizaron
      const cambios = [];
      if (titulo && titulo !== evento.titulo) cambios.push(`Título: "${evento.titulo}" → "${titulo}"`);
      if (descripcion && descripcion !== evento.descripcion) cambios.push(`Descripción actualizada`);
      if (tipo && tipo !== evento.tipo) cambios.push(`Tipo cambiado a "${tipo}"`);
      if (fecha_evento && new Date(fecha_evento).toISOString() !== evento.fecha_evento.toISOString()) {
        cambios.push(`Fecha del evento: "${evento.fecha_evento.toISOString()}" → "${new Date(fecha_evento).toISOString()}"`);
      }
  
      // Si no hay cambios, no actualizar ni notificar
      if (cambios.length === 0) {
        return res.status(200).json({ message: 'No se realizaron cambios en el evento' });
      }
  
      // Actualizar los detalles del evento
      const updatedEvento = await prisma.evento.update({
        where: { id: parseInt(eventoId, 10) },
        data: { titulo, descripcion, tipo, fecha_evento: fecha_evento ? new Date(fecha_evento) : undefined },
      });
  
      // Obtener a los participantes del evento
      const participantes = await prisma.participante.findMany({
        where: { id_evento: parseInt(eventoId, 10) },
        select: { id_usuario: true },
      });
  
      // Crear notificaciones para los participantes
      await prisma.notificacion.createMany({
        data: participantes.map((p) => ({
          id_usuario: p.id_usuario,
          contenido: `El evento "${evento.titulo}" ha cambiado: ${cambios.join(', ')}`,
          tipo: 'evento',
        })),
      });
  
      return res.status(200).json({ message: 'Evento actualizado y notificaciones enviadas', evento: updatedEvento });
    } catch (error) {
      console.error('Error al cambiar la información del evento:', error);
      return res.status(500).json({ message: 'Error al cambiar la información del evento' });
    }
  };  

export const inscribirEvento = async (req, res) => {
    try {
      const { eventoId } = req.params;
      const token = req.cookies.token;
  
      if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
      }
  
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decodedToken.userId;
  
      if (!eventoId || !userId) {
        return res.status(402).json({ message: 'ID del evento y ID del usuario son requeridos' });
      }
  
      const parsedEventoId = parseInt(eventoId, 10);
      const parsedUsuarioId = parseInt(userId, 10);
  
      // Verifica si los IDs son números válidos
      if (isNaN(parsedEventoId) || isNaN(parsedUsuarioId)) {
        return res.status(403).json({ message: 'ID de evento o usuario inválido' });
      }
  
      // Verifica si el evento existe
      const evento = await prisma.evento.findUnique({
        where: { id: parsedEventoId },
      });
  
      if (!evento) {
        return res.status(404).json({ message: 'Evento no encontrado' });
      }
  
      // Verifica si el usuario ya está inscrito en el evento
      const yaInscrito = await prisma.participante.findUnique({
        where: {
          id_evento_id_usuario: {
            id_evento: parsedEventoId, // Asegúrate de que estos nombres coincidan
            id_usuario: parsedUsuarioId,
          },
        },
      });
  
      if (yaInscrito) {
        return res.status(405).json({ message: 'El usuario ya está inscrito en este evento' });
      }
  
      // Agregar el usuario como participante del evento
      await prisma.participante.create({
        data: {
          id_evento: parsedEventoId,
          id_usuario: parsedUsuarioId,
        },
      });

      // Crear notificaciones para todos los participantes
      await prisma.notificacion.create({
        data: {
          id_usuario: evento.id_usuario,
          contenido: `Alguien se ha inscrito en el evento: "${evento.titulo}"`,            
          tipo: 'evento',
        },
      });
  
      return res.status(201).json({ message: 'Usuario inscrito en el evento con éxito' });
    } catch (error) {
      console.error('Error al inscribir usuario en el evento:', error);
      return res.status(500).json({ message: 'Error al inscribir usuario en el evento' });
    }
  };  

  // Función para desapuntarse de un evento
export const desapuntarseEvento = async (req, res) => {
    try {
      const { eventoId } = req.params;
      const token = req.cookies.token;
  
      if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
      }
  
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decodedToken.userId;

      if (!eventoId || !userId) {
        return res.status(400).json({ message: 'ID del evento o ID del usuario no proporcionados' });
      }
  
      const parsedEventoId = parseInt(eventoId, 10);
  
      // Verifica si el ID del evento es un número válido
      if (isNaN(parsedEventoId)) {
        return res.status(400).json({ message: 'ID de evento inválido' });
      }

      // Verifica si el evento existe
      const evento = await prisma.evento.findUnique({
        where: { id: parsedEventoId },
      });
  
      if (!evento) {
        return res.status(404).json({ message: 'Evento no encontrado' });
      }
        
  
      // Verifica si existe la relación para eliminar
      const participante = await prisma.participante.findUnique({
        where: {
          id_evento_id_usuario: {
            id_evento: parsedEventoId,
            id_usuario: userId,
          },
        },
      });
  
      if (!participante) {
        return res.status(404).json({ message: 'El usuario no está inscrito en este evento' });
      }
  
      // Elimina la relación entre el usuario y el evento
      await prisma.participante.delete({
        where: {
          id_evento_id_usuario: {
            id_evento: parsedEventoId,
            id_usuario: userId,
          },
        },
      });

      await prisma.notificacion.create({
        data: {
          id_usuario: evento.id_usuario,
          contenido: `Alguien se ha desinscrito en el evento: "${evento.titulo}"`,            
          tipo: 'evento',
        },
      });
  
      return res.status(200).json({ message: 'Desapuntado del evento con éxito' });
    } catch (error) {
      console.error('Error al desapuntarse del evento:', error);
      return res.status(500).json({ message: 'Error al desapuntarse del evento' });
    }
  };

  export const buscarEventos = async (req, res) => {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }
  
    try {
      // Decodificar el token
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decodedToken.userId;
  
      // Obtener eventos y sus creadores
      const eventos = await prisma.evento.findMany({
        include: {
          creador: true,
        },
      });
  
      // Agregar propiedad `esCreador` para cada evento
      const eventosConPropiedad = eventos.map(evento => ({
        ...evento,
        esCreador: evento.creador.id === userId, // Verificar si el usuario es el creador
      }));
  
      // Enviar los eventos modificados
      res.status(200).json(eventosConPropiedad);
    } catch (error) {
      console.error('Error al buscar eventos:', error);
      res.status(500).json({ message: 'Error al buscar eventos' });
    }
  };
  
  