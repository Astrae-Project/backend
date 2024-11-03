import prisma from '../lib/prismaClient.mjs';
import jwt from 'jsonwebtoken'

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
  
      const { titulo, descripcion, tipo, fecha_evento } = req.body; // Asegúrate de incluir fecha_evento aquí
  
      // Verificación de campos obligatorios
      if (!titulo || !tipo || !descripcion || !fecha_evento) {
        return res.status(400).json({ message: 'Faltan campos requeridos' });
      }
  
      // Crear el evento
      const evento = await prisma.evento.create({
        data: {
          id_usuario: userId, // Aquí se asigna el id del creador
          titulo,
          descripcion,
          tipo,
          fecha_evento: new Date(fecha_evento), // Asegúrate de convertirlo a un objeto Date si es necesario
        }
      });
  
      // Responder con el evento creado
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
  
      // Verifica si el eventoId es un número válido
      if (isNaN(parsedEventoId)) {
        return res.status(400).json({ message: 'ID de evento inválido' });
      }
  
      // Busca el evento en la base de datos
      const evento = await prisma.evento.findUnique({
        where: {
          id: parsedEventoId,
        },
        include: {
          creador: true, // Incluye el creador para verificar si el usuario es el creador
        },
      });
  
      // Si el evento no existe, responde con un error 404
      if (!evento) {
        return res.status(404).json({ message: 'Evento no encontrado' });
      }
  
      // Verifica si el usuario que hace la solicitud es el creador del evento
      if (evento.creador.id !== userId) {
        return res.status(403).json({ message: 'No tienes permisos para eliminar este evento' });
      }
  
      // Elimina el evento y todas las relaciones asociadas
      await prisma.evento.delete({
        where: {
          id: parsedEventoId,
        },
      });
  
      // Responde con éxito
      res.status(200).json({ message: 'Evento eliminado con éxito' });
    } catch (error) {
      // Manejo de errores: registra el error y responde con un mensaje de error
      console.error('Error al eliminar el evento:', error);
      res.status(500).json({ message: 'Error al eliminar el evento' });
    }
  };
  
  export const dataEvent = async (req, res) => {
    try {
      const { eventoId } = req.params; // Suponiendo que pasas el ID del evento en los parámetros de la URL
  
      if (!eventoId) {
        return res.status(400).json({ message: 'ID del evento no proporcionado' });
      }
  
      const parsedEventoId = parseInt(eventoId, 10);
  
      // Verifica si el ID del evento es un número válido
      if (isNaN(parsedEventoId)) {
        return res.status(400).json({ message: 'ID de evento inválido' });
      }
  
      // Consulta el evento con sus usuarios
      const evento = await prisma.evento.findUnique({
        where: { id: parsedEventoId }, // Busca por el ID del evento
        include: {
          usuarios: {
            include: {
              usuario: true, // Incluye los datos del usuario relacionados
            },
          },
          creador: true, // Incluye el creador del evento
        },
      });
  
      if (!evento) {
        return res.status(404).json({ message: 'Evento no encontrado' });
      }
  
      // Formateamos la información de los miembros
      const miembros = evento.usuarios.map((eventoUsuario) => ({
        id: eventoUsuario.usuario.id,
        username: eventoUsuario.usuario.username,
      }));
  
      // Respuesta con la información del evento y sus miembros
      return res.status(200).json({
        id: evento.id,
        nombre: evento.nombre,
        descripcion: evento.descripcion,
        tipo: evento.tipo,
        creador: {
          id: evento.creador.id,
          username: evento.creador.username,
        },
        miembros, // Lista de miembros
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
      const userId = decodedToken.userId;
  
      if (!userId) {
        return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
      }
  
      const { eventoId } = req.params; // Asegúrate de que estás pasando el eventoId en los parámetros de la URL
      const { titulo, descripcion, tipo } = req.body;
  
      // Verificar si el evento existe y obtener su creador
      const evento = await prisma.evento.findUnique({
        where: { id: parseInt(eventoId, 10) },
        include: { creador: true }, // Asegúrate de incluir al creador en la consulta
      });
  
      if (!evento) {
        return res.status(404).json({ message: 'Evento no encontrado' });
      }
  
      // Verifica si el usuario es el creador del evento
      if (evento.creador.id !== userId) {
        return res.status(403).json({ message: 'No tienes permisos para realizar esta acción' });
      }
  
      // Actualizar los detalles del evento
      const updatedFields = {};
      if (titulo) updatedFields.titulo = titulo;
      if (descripcion) updatedFields.descripcion = descripcion;
      if (tipo) updatedFields.tipo = tipo;
  
      const updatedEvento = await prisma.evento.update({
        where: { id: parseInt(eventoId, 10) },
        data: updatedFields,
      });
  
      res.status(200).json(updatedEvento);
    } catch (error) {
      console.error('Error al cambiar la información del evento:', error);
      res.status(500).json({ message: 'Error al cambiar la información del evento' });
    }
  };
  