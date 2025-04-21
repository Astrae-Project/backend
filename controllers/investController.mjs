import prisma from '../lib/prismaClient.mjs';
import jwt from 'jsonwebtoken';
import { actualizarValoresInversiones, calcularValoracion, calcularValorTotalPortfolio } from '../lib/functionCalculations.mjs';

export const offer = async (req, res) => {
  const token = req.cookies.token;
  const { id_startup, monto_ofrecido, porcentaje_ofrecido } = req.body;

  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decodedToken.userId;

  if (!userId) {
    return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
  }

  if (!id_startup || !monto_ofrecido || !porcentaje_ofrecido) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  // Validaciones adicionales
  if (typeof monto_ofrecido !== 'number' || typeof porcentaje_ofrecido !== 'number') {
    return res.status(400).json({ message: 'Los montos deben ser números válidos' });
  }

  try {
    // Buscar el inversor asociado al usuario autenticado
    const inversor = await prisma.inversor.findFirst({
      where: { id_usuario: userId },
    });

    if (!inversor) {
      return res.status(404).json({ message: 'Inversor no encontrado' });
    }

    // Buscar la startup a la que se le enviará la oferta
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
        estado: 'Pendiente',
        escrow_id: null, // Inicialmente se deja en null
      },
    });

    // Crear el registro de escrow relacionado a la oferta
    const escrow = await prisma.escrow.create({
      data: {
        id_oferta: oferta.id,
        monto: monto_ofrecido,
        estado: 'Pendiente',
      },
    });

    // Actualizar la oferta para asignarle el escrow_id
    const updatedOferta = await prisma.oferta.update({
      where: { id: oferta.id },
      data: {
        escrow_id: escrow.id,
      },
    });

    // Función para formatear el monto (en K o M)
    const formatMonto = (monto) => {
      if (monto >= 1e6) {
        const millones = monto / 1e6;
        return `${millones % 1 === 0 ? millones.toFixed(0) : millones.toFixed(1)}M`;
      } else if (monto >= 1e3) {
        const miles = monto / 1e3;
        return `${miles % 1 === 0 ? miles.toFixed(0) : miles.toFixed(1)}K`;
      } else {
        return monto.toString();
      }
    };

    const montoFormateado = formatMonto(monto_ofrecido) + "€";

    // Crear la notificación e incluir el ID de la oferta en el mensaje para que el frontend pueda interactuar con ella
    await prisma.notificacion.create({
      data: {
        id_usuario: startup.id_usuario, // Notifica al dueño de la startup
        contenido: `Has recibido una oferta de ${inversor.nombre} de ${montoFormateado} por el ${porcentaje_ofrecido}%`,
        tipo: 'oferta',
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

  return porcentajeDisponible;
};

export const offerAccepted = async (req, res) => {
  const ofertaId = Number(req.params.id_oferta);
  const userId   = Number(req.params.id_usuario);

  if (!userId) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  try {
    // 1) Obtener oferta + startup + escrow
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { startup: true, escrow: true },
    });
    if (!oferta) {
      return res.status(404).json({ message: 'Oferta no encontrada' });
    }
    if (oferta.startup.id_usuario !== userId) {
      return res.status(403).json({ message: 'Sin permisos para aceptar esta oferta' });
    }

    // 2) Validar porcentaje
    const pctDisp = await getPorcentajeDisponible(oferta.id_startup);
    const pctOff  = Number(oferta.porcentaje_ofrecido);
    if (isNaN(pctOff) || pctOff <= 0) {
      return res.status(400).json({ message: 'Porcentaje inválido en la oferta' });
    }
    if (pctOff > pctDisp) {
      return res.status(400).json({ message: 'Porcentaje ofrecido > disponible' });
    }

    // 3) Verificar estado
    if (['Aceptada','Rechazada'].includes(oferta.estado)) {
      return res.status(400).json({ message: 'Esta oferta ya fue procesada' });
    }

    let inversionRecord;

    // 4) Transacción: actualizar oferta, escrow, merge inversión y decrementar %
    await prisma.$transaction(async (trx) => {
      await trx.oferta.update({
        where: { id: ofertaId },
        data: { estado: 'Aceptada' },
      });
      await trx.escrow.update({
        where: { id: oferta.escrow_id },
        data: { estado: 'Aceptado' },
      });

      const existing = await trx.inversion.findUnique({
        where: {
          inversor_startup_unique: {
            id_inversor: oferta.id_inversor,
            id_startup: oferta.id_startup
          }
        }
      });

      const montoOff = Number(oferta.monto_ofrecido);

      if (existing) {
        inversionRecord = await trx.inversion.update({
          where: { id: existing.id },
          data: {
            monto_invertido: { increment: montoOff },
            porcentaje_adquirido: { increment: pctOff },
            fecha: new Date()
          }
        });
      } else {
        inversionRecord = await trx.inversion.create({
          data: {
            id_inversor: oferta.id_inversor,
            id_startup: oferta.id_startup,
            monto_invertido: montoOff,
            porcentaje_adquirido: pctOff,
            valor: 0
          }
        });
        await trx.portfolio.update({
          where: { id_inversor: oferta.id_inversor },
          data: {
            inversiones: { connect: { id: inversionRecord.id } }
          }
        });
      }

      await trx.startup.update({
        where: { id: oferta.id_startup },
        data: { porcentaje_disponible: { decrement: pctOff } }
      });
    });

    // 5) Recalcular valoraciones e inversiones
    const valoracion = await calcularValoracion(oferta.id_startup);
    await actualizarValoresInversiones(oferta.id_startup, valoracion);

    // 6) Notificar historial de valoraciones
    await prisma.valoracionHistorica.create({
      data: {
        startup: { connect: { id: oferta.id_startup } },
        valoracion,
        fecha: new Date()
      }
    });

    // 7) Actualizar portfolio histórico
    const valorPortfolio = await calcularValorTotalPortfolio(oferta.id_inversor);
    await prisma.portfolioHistorico.create({
      data: {
        inversorId: oferta.id_inversor,
        valoracion: valorPortfolio,
        fecha: new Date()
      }
    });

    // 8) Notificación al inversor
    const inversor = await prisma.inversor.findUnique({ where: { id: oferta.id_inversor } });
    if (inversor) {
      const montoFmt = Number(oferta.monto_ofrecido)
        .toLocaleString('es-ES', { maximumFractionDigits: 0 }) + '€';
      await prisma.notificacion.create({
        data: {
          id_usuario: inversor.id_usuario,
          contenido: `Tu oferta de ${montoFmt} por el ${pctOff}% ha sido aceptada.`,
          tipo: 'inversion'
        }
      });
    }

    return res.json({ message: 'Oferta aceptada y portfolio actualizado' });

  } catch (err) {
    console.error('offerAccepted error:', err);
    return res.status(500).json({ message: 'Error interno al aceptar oferta' });
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
    if (oferta.estado === 'Aceptada' || oferta.estado === 'Rechazada') {
      return res.status(400).json({ message: 'Esta oferta ya ha sido aceptada o rechazada' });
    }

    await prisma.oferta.update({
      where: { id: ofertaId },
      data: { estado: 'Rechazada' },
    });

    await prisma.escrow.update({
      where: { id: oferta.escrow_id },
      data: { estado: 'Rechazado' },
    });

        // Verificar que el usuario inversor exista
    const inversor = await prisma.inversor.findUnique({
      where: { id: oferta.id_inversor },
    });

    if (!inversor) {
      return res.status(404).json({ message: 'Usuario inversor no encontrado' });
    }

    const formatMonto = (monto) => {
      if (monto >= 1e6) {
        const millones = monto / 1e6;
        // Si es entero, sin decimales; si no, con 1 decimal.
        return `${millones % 1 === 0 ? millones.toFixed(0) : millones.toFixed(1)}M`;
      } else if (monto >= 1e3) {
        const miles = monto / 1e3;
        return `${miles % 1 === 0 ? miles.toFixed(0) : miles.toFixed(1)}K`;
      } else {
        return monto.toString();
      }
    };

    const montoFormateado = formatMonto(oferta.monto_ofrecido) + "€";

    // Crear la notificación para el inversor
    await prisma.notificacion.create({
      data: {
        id_usuario: inversor.id_usuario,
        contenido: `Tu oferta de ${montoFormateado} por el ${oferta.porcentaje_ofrecido}% ha sido rechazada.`,
        tipo: 'inversion',
      },
    });

    res.status(200).json({ message: 'Oferta rechazada con éxito' });
  } catch (err) {
    console.error('Error al rechazar la oferta:', err);
    res.status(500).json({ message: 'Error al rechazar la oferta' });
  }
};

// Función para hacer una contraoferta
export const counteroffer = async (req, res) => {
  const ofertaId = parseInt(req.params.id_oferta);
  const userId = parseInt(req.params.id_usuario);
  const { contraoferta_monto, contraoferta_porcentaje } = req.body;

  if (!contraoferta_monto || !contraoferta_porcentaje) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { 
        startup: {
          include: { usuario: true }
        },
        inversor: {
          include: { usuario: true }
        },
        escrow: true  // Incluir escrow sin intentar acceder a sus campos
      },
    });

    if (!oferta) {
      return res.status(404).json({ message: 'Oferta no encontrada' });
    }

    // Verificar que el usuario es dueño de la startup
    if (oferta.startup.usuario.id !== userId) {
      return res.status(403).json({ message: 'No autorizado para contraofertar' });
    }

    // Validar estado actual de la oferta
    if (oferta.estado !== 'Pendiente' || oferta.contraoferta_monto !== null) {
      return res.status(400).json({ message: 'Oferta no disponible para contraoferta' });
    }

    // Transacción para actualizar oferta y rechazar escrow si existe
    await prisma.$transaction(async (prisma) => {
      // Actualizar oferta con contraoferta
      await prisma.oferta.update({
        where: { id: ofertaId },
        data: {
          contraoferta_monto,
          contraoferta_porcentaje,
          estado: 'Pendiente'
        }
      });

      // Si hay un escrow, rechazarlo
      if (oferta.escrow) {
        await prisma.escrow.update({
          where: { id: oferta.escrow[0]?.id },  // Acceder al primer escrow disponible
          data: { estado: 'Rechazado' }
        });
      }

      // Función para formatear montos
      const formatMonto = (monto) => {
        if (monto >= 1e6) {
          return `${(monto / 1e6).toFixed(monto % 1 === 0 ? 0 : 1)}M`;
        } else if (monto >= 1e3) {
          return `${(monto / 1e3).toFixed(monto % 1 === 0 ? 0 : 1)}K`;
        } else {
          return monto.toString();
        }
      };

      const montoFormateado = formatMonto(contraoferta_monto) + "€";

      // Crear notificación
      await prisma.notificacion.create({
        data: {
          id_usuario: oferta.inversor.usuario.id,  // Acceder correctamente al usuario del inversor
          contenido: `Nueva contraoferta de ${oferta.startup.nombre}: ${montoFormateado} (${contraoferta_porcentaje}%)`,
          tipo: 'contraoferta'
        }
      });
    });

    res.status(200).json({ message: 'Contraoferta registrada exitosamente' });
  } catch (err) {
    console.error('Error en contraoferta:', err);
    res.status(500).json({ message: err.message || 'Error interno del servidor' });
  }
};

export const acceptCounteroffer = async (req, res) => {
  const ofertaId = Number(req.params.id_oferta);
  const userId   = Number(req.params.id_usuario);

  if (!userId) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  try {
    // 1) Obtener oferta
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { inversor: true, startup: true }
    });
    if (!oferta) {
      return res.status(404).json({ message: 'Oferta no encontrada' });
    }
    if (oferta.inversor.id_usuario !== userId) {
      return res.status(403).json({ message: 'Sin permisos para aceptar esta contraoferta' });
    }
    if (['Aceptada','Rechazada'].includes(oferta.estado)) {
      return res.status(400).json({ message: 'Esta contraoferta ya fue procesada' });
    }

    // 2) Validar porcentaje
    const pctDisp = await getPorcentajeDisponible(oferta.id_startup);
    const pctContra = Number(oferta.contraoferta_porcentaje);
    if (isNaN(pctContra) || pctContra <= 0) {
      return res.status(400).json({ message: 'Porcentaje inválido en la contraoferta' });
    }
    if (pctContra > pctDisp) {
      return res.status(400).json({ message: 'Porcentaje contraoferta > disponible' });
    }

    let inversionRecord;

    // 3) Transacción: actualizar oferta + merge inversión + decrementar %
    await prisma.$transaction(async (trx) => {
      await trx.oferta.update({
        where: { id: ofertaId },
        data: {
          estado: 'Aceptada',
          monto_ofrecido: oferta.contraoferta_monto,
          porcentaje_ofrecido: pctContra
        }
      });

      const existing = await trx.inversion.findUnique({
        where: {
          inversor_startup_unique: {
            id_inversor: oferta.id_inversor,
            id_startup: oferta.id_startup
          }
        }
      });

      const montoContra = Number(oferta.contraoferta_monto);

      if (existing) {
        inversionRecord = await trx.inversion.update({
          where: { id: existing.id },
          data: {
            monto_invertido: { increment: montoContra },
            porcentaje_adquirido: { increment: pctContra },
            fecha: new Date()
          }
        });
      } else {
        inversionRecord = await trx.inversion.create({
          data: {
            id_inversor: oferta.id_inversor,
            id_startup: oferta.id_startup,
            monto_invertido: montoContra,
            porcentaje_adquirido: pctContra,
            valor: 0
          }
        });
        await trx.portfolio.update({
          where: { id_inversor: oferta.id_inversor },
          data: {
            inversiones: { connect: { id: inversionRecord.id } }
          }
        });
      }

      await trx.startup.update({
        where: { id: oferta.id_startup },
        data: { porcentaje_disponible: { decrement: pctContra } }
      });
    });

    // 4) Recalcular y actualizar valoraciones e inversiones
    const valoracion = await calcularValoracion(oferta.id_startup);
    await actualizarValoresInversiones(oferta.id_startup, valoracion);

    // 5) Historial y portfolio histórico
    await prisma.valoracionHistorica.create({
      data: {
        startup: { connect: { id: oferta.id_startup } },
        valoracion,
        fecha: new Date()
      }
    });
    const valorPortfolio = await calcularValorTotalPortfolio(oferta.id_inversor);
    await prisma.portfolioHistorico.create({
      data: {
        inversorId: oferta.id_inversor,
        valoracion: valorPortfolio,
        fecha: new Date()
      }
    });

    // 6) Notificación al inversor
    const montoFmt = Number(oferta.contraoferta_monto)
      .toLocaleString('es-ES', { maximumFractionDigits: 0 }) + '€';
    await prisma.notificacion.create({
      data: {
        id_usuario: oferta.inversor.id_usuario,
        contenido: `Tu contraoferta de ${montoFmt} por el ${pctContra}% ha sido aceptada.`,
        tipo: 'inversion'
      }
    });

    return res.json({ message: 'Contraoferta aceptada y portfolio actualizado' });

  } catch (err) {
    console.error('acceptCounteroffer error:', err);
    return res.status(500).json({ message: 'Error interno al aceptar contraoferta' });
  }
};

export const rejectCounteroffer = async (req, res) => {
  const ofertaId = parseInt(req.params.id_oferta, 10); // ID de la oferta
  const userId = parseInt(req.params.id_usuario, 10);    // ID del usuario

  if (!userId) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { inversor: true }, // Incluir inversor para verificar permisos
    });

    if (!oferta) {
      return res.status(404).json({ message: 'Contraoferta no encontrada' });
    }

    // Verificar que el usuario sea el inversor correspondiente
    if (oferta.inversor.id_usuario !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para rechazar esta contraoferta' });
    }

    // Verificar si la contraoferta ya ha sido aceptada o rechazada
    if (oferta.estado === 'Aceptada' || oferta.estado === 'Rechazada') {
      return res.status(400).json({ message: 'Esta contraoferta ya ha sido aceptada o rechazada' });
    }

    // Actualizar la oferta a rechazada
    await prisma.oferta.update({
      where: { id: ofertaId },
      data: { estado: 'Rechazada' },
    });

    const formatMonto = (monto) => {
      if (monto >= 1e6) {
        const millones = monto / 1e6;
        // Si es entero, sin decimales; si no, con 1 decimal.
        return `${millones % 1 === 0 ? millones.toFixed(0) : millones.toFixed(1)}M`;
      } else if (monto >= 1e3) {
        const miles = monto / 1e3;
        return `${miles % 1 === 0 ? miles.toFixed(0) : miles.toFixed(1)}K`;
      } else {
        return monto.toString();
      }
    };

    const montoFormateado = formatMonto(oferta.contraoferta_monto) + "€";

    // Crear la notificación para el inversor
    await prisma.notificacion.create({
      data: {
        id_usuario: oferta.inversor.id_usuario,
        contenido: `Tu contraoferta de ${montoFormateado} por el ${oferta.contraoferta_porcentaje}% ha sido rechazada.`,
        tipo: 'inversion',
      },
    });

    res.status(200).json({ message: 'Contraoferta rechazada con éxito' });
  } catch (err) {
    console.error('Error al rechazar la contraoferta:', err);
    res.status(500).json({ message: 'Error al rechazar la contraoferta' });
  }
};

