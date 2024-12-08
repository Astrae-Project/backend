import prisma from '../lib/prismaClient.mjs';
import jwt from 'jsonwebtoken';

export const follow = async (req, res) => {
  const { id_seguido } = req.body;

  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decodedToken.userId;

  if (!userId) {
    return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
  }

  const id_seguidor = userId;

  // Validar que el ID del seguidor se obtuvo correctamente
  if (!id_seguidor) {
    return res.status(400).json({ message: 'ID de usuario no encontrado en el token.' });
  }

  // Validar que no se intente seguir a sí mismo
  if (id_seguidor === id_seguido) {
    return res.status(400).json({ error: 'No puedes seguirte a ti mismo.' });
  }

  try {
    // Verificar si ya existe un seguimiento activo
    const existingFollow = await prisma.seguimiento.findUnique({
      where: {
        id_seguidor_id_seguido: { id_seguidor, id_seguido },
      },
    });

    if (existingFollow) {
      return res.status(400).json({ error: 'Ya sigues a este usuario.' });
    }

    // Crear el seguimiento
    const newFollow = await prisma.seguimiento.create({
      data: { id_seguidor, id_seguido },
    });

    return res.status(201).json({
      message: 'Has comenzado a seguir al usuario.',
      seguimiento: newFollow,
    });
  } catch (error) {
    console.error('Error al seguir al usuario:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

export const unfollow = async (req, res) => {
  const { id_seguido } = req.body;

  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decodedToken.userId;

  if (!userId) {
    return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
  }

  const id_seguidor = userId;

  // Validar que el ID del seguidor se obtuvo correctamente
  if (!id_seguidor) {
    return res.status(400).json({ message: 'ID de usuario no encontrado en el token.' });
  }

  // Validar que no se intente seguir a sí mismo
  if (id_seguidor === id_seguido) {
    return res.status(400).json({ error: 'No puedes seguirte a ti mismo.' });
  }

  try {
    // Verificar si ya existe un seguimiento activo
    const existingFollow = await prisma.seguimiento.findUnique({
      where: {
        id_seguidor_id_seguido: { id_seguidor, id_seguido },
      },
    });

    if (!existingFollow) {
      return res.status(400).json({ error: 'No sigues a este usuario.' });
    }

    await prisma.seguimiento.delete({
      where: {
        id_seguidor_id_seguido: { id_seguidor, id_seguido },
      },
    });

    return res.status(200).json({
      message: 'Has dejado de seguir al usuario.',
    });
  } catch (error) {
    console.error('Error al dejar de seguir al usuario:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

export const suscribe = async (req, res) => {
  const { id_servicio } = req.body;  // El servicio que el usuario quiere suscribirse
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decodedToken.userId;

  if (!userId) {
    return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
  }

  try {
    // Obtener el servicio seleccionado
    const servicio = await prisma.servicio.findUnique({
      where: { id: id_servicio },
    });

    if (!servicio) {
      return res.status(404).json({ message: 'Servicio no encontrado.' });
    }

    // Llamar a un proceso de pago (por ejemplo, Stripe)
    const paymentSuccess = await processPayment(servicio.precio, id_usuario);
    
    if (!paymentSuccess) {
      return res.status(400).json({ message: 'Pago fallido. Intenta nuevamente.' });
    }

    // Calcular la fecha de expiración (por ejemplo, 1 mes a partir de hoy)
    const fecha_expiracion = new Date();
    fecha_expiracion.setMonth(fecha_expiracion.getMonth() + 1); // La suscripción es válida por un mes

    // Obtener el método de pago usado (esto puede variar dependiendo de cómo estés gestionando los pagos)
    const metodoPago = 'TARJETA'; // O 'PAYPAL' dependiendo del pago realizado, lo deberías extraer de tu proceso de pago

    // Crear la suscripción
    const nuevaSuscripcion = await prisma.suscripcion.create({
      data: {
        id_suscriptor: userId, // El usuario que se suscribe
        id_suscrito: servicio.id_usuario, // El usuario dueño del servicio (supuesto)
        fecha_inicio: new Date(),
        fecha_expiracion,
        estado: 'ACTIVA', // Estado de la suscripción
        auto_renovacion: false, // Aquí podrías poner lógica de renovación automática
        metodo_pago: metodoPago, // Método de pago
      },
    });

    return res.status(201).json({
      message: 'Suscripción activada con éxito.',
      suscripcion: nuevaSuscripcion,
    });
  } catch (error) {
    console.error('Error al suscribir al servicio:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};


export const unsuscribe = async (req, res) => {
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

    // Actualizar los detalles del evento
    const updatedFields = {};
    if (titulo) updatedFields.titulo = titulo;
    if (descripcion) updatedFields.descripcion = descripcion;
    if (tipo) updatedFields.tipo = tipo;
    if (fecha_evento) updatedFields.fecha_evento = new Date(fecha_evento);

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