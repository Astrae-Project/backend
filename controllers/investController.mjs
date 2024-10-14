import prisma from '../lib/prismaClient.mjs';
import { calcularValoracion, calcularValorTotalPortfolio } from '../lib/functionCalculations.mjs';

// Función para crear una oferta
export const offer = async (req, res) => {
  const { userId } = req.user || {};
  const { id_startup, monto_ofrecido, porcentaje_ofrecido } = req.body;

  if (!id_startup || !monto_ofrecido || !porcentaje_ofrecido) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  // Validaciones adicionales
  if (typeof monto_ofrecido !== 'number' || typeof porcentaje_ofrecido !== 'number') {
    return res.status(400).json({ message: 'Los montos deben ser números válidos' });
  }

  try {
    const inversor = await prisma.inversor.findFirst({
      where: { id_usuario: userId },
    });

    if (!inversor) {
      return res.status(404).json({ message: 'Inversor no encontrado' });
    }

    const startup = await prisma.startup.findUnique({
      where: { id: id_startup },
    });

    if (!startup) {
      return res.status(404).json({ message: 'Startup no encontrada' });
    }

    // Crear la oferta
    const oferta = await prisma.oferta.create({
      data: {
        id_inversor: inversor.id,
        id_startup,
        monto_ofrecido,
        porcentaje_ofrecido,
        estado: 'pendiente',
        escrow_id: null, // Inicialmente lo dejamos en null
      },
    });

    // Crear el registro de escrow
    const escrow = await prisma.escrow.create({
      data: {
        id_oferta: oferta.id,
        monto: monto_ofrecido,
        estado: 'pendiente',
      },
    });

    // Actualizar la oferta para incluir el escrow_id
    const updatedOferta = await prisma.oferta.update({
      where: { id: oferta.id },
      data: {
        escrow_id: escrow.id,
      },
    });

    res.status(201).json({ message: 'Oferta enviada con éxito', oferta: updatedOferta, escrow });
  } catch (err) {
    console.error('Error al enviar la oferta:', err);
    res.status(500).json({ message: 'Error al enviar la oferta' });
  }
};

const getPorcentajeDisponible = async (startupId) => {
  // Obtener todas las inversiones relacionadas con la startup
  const inversiones = await prisma.inversion.findMany({
    where: {
      id_startup: startupId,
    },
  });

  // Sumar todos los porcentajes adquiridos
  const porcentajeTotalAdquirido = inversiones.reduce((total, inversion) => {
    return total + parseFloat(inversion.porcentaje_adquirido);
  }, 0);

  // Calcular el porcentaje disponible
  const porcentajeDisponible = 100 - porcentajeTotalAdquirido;

  console.log(`Porcentaje total adquirido: ${porcentajeTotalAdquirido}, Porcentaje disponible: ${porcentajeDisponible}`);

  return porcentajeDisponible;
};


export const offerAccepted = async (req, res) => {
  const ofertaId = parseInt(req.params.id_oferta); // ID de la oferta
  const userId = parseInt(req.params.id_usuario); // ID del usuario

  if (!userId) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { startup: true, escrow: true }, // Incluir escrow aquí
    });

    if (!oferta) {
      console.log("Oferta no encontrada");
      return res.status(404).json({ message: 'Oferta no encontrada' });
    }

    if (oferta.startup.id_usuario !== userId) {
      console.log("Permiso denegado para aceptar la oferta");
      return res.status(403).json({ message: 'No tienes permiso para aceptar esta oferta' });
    }

    // Obtener el porcentaje disponible de la startup
    const porcentajeDisponible = await getPorcentajeDisponible(oferta.id_startup);
    const porcentajeOfrecido = parseFloat(oferta.porcentaje_ofrecido);

    console.log(`Porcentaje ofrecido: ${porcentajeOfrecido}, Porcentaje disponible: ${porcentajeDisponible}`);

    if (porcentajeOfrecido > porcentajeDisponible) {
      console.log("El porcentaje ofrecido es mayor que el porcentaje disponible");
      return res.status(400).json({ message: 'El porcentaje ofrecido es mayor que el porcentaje disponible' });
    }

    if (oferta.estado === 'aceptada' || oferta.estado === 'rechazada') {
      console.log("Esta oferta ya ha sido aceptada o rechazada");
      return res.status(400).json({ message: 'Esta oferta ya ha sido aceptada o rechazada' });
    }

    let nuevaInversion; // Declarar aquí para acceder después

    // Actualizar la oferta y el estado de escrow
    await prisma.$transaction(async (prisma) => {
      // Actualizar estado de la oferta a "aceptada"
      await prisma.oferta.update({
        where: { id: ofertaId },
        data: { estado: 'aceptada' },
      });

      // Actualizar estado de escrow
      await prisma.escrow.update({
        where: { id: oferta.escrow_id },
        data: { estado: 'aceptado' },
      });

      // Crear la inversión
      nuevaInversion = await prisma.inversion.create({
        data: {
          id_inversor: oferta.id_inversor,
          id_startup: oferta.id_startup,
          monto_invertido: oferta.monto_ofrecido,
          porcentaje_adquirido: oferta.porcentaje_ofrecido,
          valor: 0, // Valor a calcular posteriormente
        },
      });

      console.log(`Nueva inversión creada: ${JSON.stringify(nuevaInversion)}`);

      // Asociar la inversión al portfolio del inversor
      await prisma.portfolio.update({
        where: { id_inversor: oferta.id_inversor },
        data: {
          inversiones: {
            connect: { id: nuevaInversion.id },
          },
        },
      });

      // Actualizar el porcentaje disponible de la startup
      await prisma.startup.update({
        where: { id: oferta.id_startup },
        data: {
          porcentaje_disponible: {
            decrement: oferta.porcentaje_ofrecido,
          },
        },
      });
    });

    // Mover el cálculo y la actualización del valor de la inversión fuera de la transacción
    const valoracion = await calcularValoracion(oferta.id_startup);
    const valor = (valoracion * (oferta.porcentaje_ofrecido / 100)); // Calcular el valor de la inversión

    console.log(`Valoración calculada: ${valoracion}, Valor de la inversión: ${valor}`);

    await prisma.inversion.update({
      where: { id: nuevaInversion.id }, // Asegúrate de que esta ID sea accesible aquí
      data: {
        valor: valor, // Actualizar el valor calculado
      },
    });

    const valorPortfolio = await calcularValorTotalPortfolio(oferta.id_inversor)

    res.status(200).json({ message: 'Oferta aceptada y guardada en el portfolio con éxito' });
  } catch (err) {
    console.error('Error al aceptar la oferta:', err);
    res.status(500).json({ message: 'Error al aceptar la oferta' });
  }
};


// Función para rechazar una oferta
export const offerRejected = async (req, res) => {
  const ofertaId = parseInt(req.params.id_oferta); // ID de la oferta
  const userId = parseInt(req.params.id_usuario); // ID del usuario

  if (!userId) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { startup: true, escrow: true },
    });

    if (!oferta) {
      return res.status(404).json({ message: 'Oferta no encontrada' });
    }

    if (oferta.startup.id_usuario !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para rechazar esta oferta' });
    }

    // Verificar si la oferta ya ha sido aceptada o rechazada
    if (oferta.estado === 'aceptada' || oferta.estado === 'rechazada') {
      return res.status(400).json({ message: 'Esta oferta ya ha sido aceptada o rechazada' });
    }

    await prisma.oferta.update({
      where: { id: ofertaId },
      data: { estado: 'rechazada' },
    });

    await prisma.escrow.update({
      where: { id: oferta.escrow_id },
      data: { estado: 'rechazado' },
    });

    res.status(200).json({ message: 'Oferta rechazada con éxito' });
  } catch (err) {
    console.error('Error al rechazar la oferta:', err);
    res.status(500).json({ message: 'Error al rechazar la oferta' });
  }
};

// Función para hacer una contraoferta
export const counteroffer = async (req, res) => {
  const ofertaId = parseInt(req.params.id_oferta); // ID de la oferta
  const userId = parseInt(req.params.id_usuario); // ID del usuario
  const { monto_ofrecido, porcentaje_ofrecido } = req.body;

  if (!monto_ofrecido || !porcentaje_ofrecido) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { startup: true, escrow: true }, // Incluir escrow para rechazar
    });

    if (!oferta) {
      return res.status(404).json({ message: 'Oferta no encontrada' });
    }

    // Verificar que el usuario que hace la contraoferta es la startup
    if (oferta.startup.id_usuario !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para hacer una contraoferta' });
    }

    // Actualizar la oferta con la contraoferta
    await prisma.$transaction(async (prisma) => {
      await prisma.oferta.update({
        where: { id: ofertaId },
        data: {
          contraoferta_monto: monto_ofrecido,
          contraoferta_porcentaje: porcentaje_ofrecido,
          estado: 'pendiente', // Cambiar el estado a 'pendiente' para que el inversor lo revise
        },
      });

      // Rechazar el escrow relacionado con la oferta
      await prisma.escrow.update({
        where: { id: oferta.escrow_id },
        data: { estado: 'rechazado' }, // Cambiar el estado del escrow a 'rechazado'
      });
    });

    res.status(200).json({ message: 'Contraoferta realizada con éxito, escrow rechazado' });
  } catch (err) {
    console.error('Error al hacer la contraoferta:', err);
    res.status(500).json({ message: 'Error al hacer la contraoferta' });
  }
};


// Función para aceptar una contraoferta
export const acceptCounteroffer = async (req, res) => {
  const ofertaId = parseInt(req.params.id_oferta); // ID de la oferta
  const userId = parseInt(req.params.id_usuario); // ID del usuario

  if (!userId) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { inversor: true, startup: true }, // Incluir inversor y startup
    });

    if (!oferta) {
      return res.status(404).json({ message: 'Oferta no encontrada' });
    }

    if (oferta.inversor.id_usuario !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para aceptar esta contraoferta' });
    }

    // Verificar si la contraoferta ya ha sido aceptada o rechazada
    if (oferta.estado === 'aceptada' || oferta.estado === 'rechazada') {
      return res.status(400).json({ message: 'Esta contraoferta ya ha sido aceptada o rechazada' });
    }

    // Obtener el porcentaje disponible de la startup
    const porcentajeDisponible = await getPorcentajeDisponible(oferta.id_startup);
    const porcentajeContraofrecido = parseFloat(oferta.contraoferta_porcentaje);

    if (porcentajeContraofrecido > porcentajeDisponible) {
      return res.status(400).json({ message: 'El porcentaje ofrecido es mayor que el porcentaje disponible' });
    }

    let nuevaInversion; // Declarar aquí para acceder después
    let escrow; // Declarar variable para el escrow

    // Actualizar la contraoferta y el estado de escrow
    await prisma.$transaction(async (prisma) => {
      await prisma.oferta.update({
        where: { id: ofertaId },
        data: {
          estado: 'aceptada',
          monto_ofrecido: oferta.contraoferta_monto,
          porcentaje_ofrecido: porcentajeContraofrecido,
        },
      });

      // Crear la inversión
      nuevaInversion = await prisma.inversion.create({
        data: {
          id_inversor: oferta.id_inversor,
          id_startup: oferta.id_startup,
          monto_invertido: oferta.contraoferta_monto,
          porcentaje_adquirido: porcentajeContraofrecido,
          valor: 0, // Valor a calcular posteriormente
        },
      });

      // Asociar la inversión al portfolio del inversor
      await prisma.portfolio.update({
        where: { id_inversor: oferta.id_inversor },
        data: {
          inversiones: {
            connect: { id: nuevaInversion.id },
          },
        },
      });

      // Actualizar el porcentaje disponible de la startup
      await prisma.startup.update({
        where: { id: oferta.id_startup },
        data: {
          porcentaje_disponible: {
            decrement: porcentajeContraofrecido,
          },
        },
      });
    });

    // Mover el cálculo y la actualización del valor de la inversión fuera de la transacción
    const valoracion = await calcularValoracion(oferta.id_startup);
    const valor = (valoracion / porcentajeContraofrecido); // Calcular el valor de la inversión

    await prisma.inversion.update({
      where: { id: nuevaInversion.id }, // Asegúrate de que esta ID sea accesible aquí
      data: {
        valor: valor, // Actualizar el valor calculado
      },
    });

    const valorPortfolio = await calcularValorTotalPortfolio(oferta.id_inversor);

    res.status(200).json({ message: 'Contraoferta aceptada y guardada en el portfolio con éxito' });
  } catch (err) {
    console.error('Error al aceptar la contraoferta:', err);
    res.status(500).json({ message: 'Error al aceptar la contraoferta' });
  }
};


// Función para rechazar una contraoferta
export const rejectCounteroffer = async (req, res) => {
  const ofertaId = parseInt(req.params.id_oferta); // ID de la oferta
  const userId = parseInt(req.params.id_usuario); // ID del usuario

  if (!userId) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { inversor: true },
    });

    if (!oferta) {
      return res.status(404).json({ message: 'Contraoferta no encontrada' });
    }

    if (oferta.inversor.id_usuario !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para rechazar esta contraoferta' });
    }

    // Verificar si la contraoferta ya ha sido aceptada o rechazada
    if (oferta.estado === 'aceptada' || oferta.estado === 'rechazada') {
      return res.status(400).json({ message: 'Esta contraoferta ya ha sido aceptada o rechazada' });
    }

    // Actualizar la contraoferta a rechazada
    await prisma.oferta.update({
      where: { id: ofertaId },
      data: { estado: 'rechazada' },
    });

    res.status(200).json({ message: 'Contraoferta rechazada con éxito' });
  } catch (err) {
    console.error('Error al rechazar la contraoferta:', err);
    res.status(500).json({ message: 'Error al rechazar la contraoferta' });
  }
};
