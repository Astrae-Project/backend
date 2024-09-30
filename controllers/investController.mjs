import prisma from '../lib/prismaClient.mjs';

export const offer = async (req, res) => {
  req.user ={
    id: 10
  }

  const { id_startup, monto_ofrecido, porcentaje_ofrecido } = req.body;

  if (!id_startup || !monto_ofrecido || !porcentaje_ofrecido) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  try {
    const inversor = await prisma.inversor.findFirst({
      where: { id_usuario: req.user.id },
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
        // Aquí asignamos el escrow_id
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



// Función para aceptar una oferta
export const offerAccepted = async (req, res) => {
  const ofertaId = parseInt(req.params.id);
  const { userId } = req.user;

  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { startup: true },
    });

    if (!oferta) {
      return res.status(404).json({ message: 'Oferta no encontrada' });
    }

    if (oferta.startup.id_usuario !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para aceptar esta oferta' });
    }

    await prisma.oferta.update({
      where: { id: ofertaId },
      data: { estado: 'aceptada' },
    });

    // Aquí deberías redirigir o responder con una URL adecuada
    res.status(200).json({ message: 'Oferta aceptada con éxito' });
  } catch (err) {
    console.error('Error al aceptar la oferta:', err);
    res.status(500).json({ message: 'Error al aceptar la oferta' });
  }
};

// Función para rechazar una oferta
export const offerRejected = async (req, res) => {
  const ofertaId = parseInt(req.params.id);
  const { userId } = req.user;

  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { startup: true },
    });

    if (!oferta) {
      return res.status(404).json({ message: 'Oferta no encontrada' });
    }

    if (oferta.startup.id_usuario !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para rechazar esta oferta' });
    }

    await prisma.oferta.update({
      where: { id: ofertaId },
      data: { estado: 'rechazada' },
    });

    // Aquí deberías redirigir o responder con una URL adecuada
    res.status(200).json({ message: 'Oferta rechazada con éxito' });
  } catch (err) {
    console.error('Error al rechazar la oferta:', err);
    res.status(500).json({ message: 'Error al rechazar la oferta' });
  }
};

// Función para hacer una contraoferta
export const counteroffer = async (req, res) => {
  const ofertaId = parseInt(req.params.id);
  const { monto_ofrecido, porcentaje_ofrecido } = req.body;
  const { userId } = req.user;

  if (!monto_ofrecido || !porcentaje_ofrecido) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
    });

    if (!oferta) {
      return res.status(404).json({ message: 'Oferta no encontrada' });
    }

    if (oferta.id_inversor !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para hacer una contraoferta' });
    }

    await prisma.oferta.update({
      where: { id: ofertaId },
      data: {
        contraoferta_monto: monto_ofrecido,
        contraoferta_porcentaje: porcentaje_ofrecido,
      },
    });

    // Aquí deberías redirigir o responder con una URL adecuada
    res.status(200).json({ message: 'Contraoferta realizada con éxito' });
  } catch (err) {
    console.error('Error al hacer la contraoferta:', err);
    res.status(500).json({ message: 'Error al hacer la contraoferta' });
  }
};

// Función para aceptar una contraoferta
export const acceptCounteroffer = async (req, res) => {
  const ofertaId = parseInt(req.params.id);
  const { userId } = req.user;

  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
    });

    if (!oferta) {
      return res.status(404).json({ message: 'Oferta no encontrada' });
    }

    if (oferta.startup.id_usuario !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para aceptar esta contraoferta' });
    }

    await prisma.oferta.update({
      where: { id: ofertaId },
      data: {
        estado: 'aceptada',
        monto_ofrecido: oferta.contraoferta_monto,
        porcentaje_ofrecido: oferta.contraoferta_porcentaje,
      },
    });

    // Aquí deberías redirigir o responder con una URL adecuada
    res.status(200).json({ message: 'Contraoferta aceptada con éxito' });
  } catch (err) {
    console.error('Error al aceptar la contraoferta:', err);
    res.status(500).json({ message: 'Error al aceptar la contraoferta' });
  }
};

export const rejectCounteroffer = async (req, res) => {
  const { id } = req.params;
  const id_startup = req.user.userId; // ID de la startup extraído del token

  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id },
      include: { startup: true }
    });

    if (!oferta) return res.status(404).json({ message: 'Contraoferta no encontrada' });
    if (oferta.startup.id_usuario !== id_startup) return res.status(403).json({ message: 'No tienes permiso para rechazar esta contraoferta' });

    await prisma.oferta.update({
      where: { id },
      data: { estado: 'rechazada' }
    });

    res.status(200).json({ message: 'Contraoferta rechazada con éxito' });
  } catch (err) {
    console.error('Error al rechazar la contraoferta:', err);
    res.status(500).json({ message: 'Error al rechazar la contraoferta'})
  };
};





