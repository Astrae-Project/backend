import prisma from '../lib/prismaClient.mjs';
import jwt from 'jsonwebtoken';
import {
  actualizarValoresInversiones,
  calcularValoracion,
  calcularValorTotalPortfolio,
} from '../lib/functionCalculations.mjs';
 
import stripe from '../lib/stripeClient.mjs';

// Helper: chequea si Stripe está habilitado
const stripeEnabled = Boolean(stripe);

/**
 * 1) Crear oferta
 */
export const offer = async (req, res) => {
  const token = req.cookies.token;
  const {
    id_startup,
    monto_ofrecido,
    porcentaje_ofrecido,
    /*paymentMethodId,*/
    termsAccepted,
  } = req.body;

  if (!token) return res.status(401).json({ message: 'Token no proporcionado' });
  if (!id_startup || !monto_ofrecido || !porcentaje_ofrecido /*|| !paymentMethodId*/) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }
  if (!termsAccepted) {
    return res.status(400).json({ message: 'Debes aceptar los términos y condiciones.' });
  }

  const { userId } = jwt.verify(token, process.env.JWT_SECRET);
  const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!usuario.payment_method_id) {
    return res.status(402).json({
      message: 'Debes registrar un método de pago antes de invertir.',
      redirect: '/ajustes',
    });
  }

  const inversor = await prisma.inversor.findFirst({ where: { id_usuario: userId } });
  const startup = await prisma.startup.findUnique({ where: { id: id_startup } });
  if (!inversor || !startup) {
    return res.status(404).json({ message: 'Inversor o Startup no encontrados' });
  }

  const comisionPlataforma = monto_ofrecido * 0.03;
  const montoTotalCents = Math.round(monto_ofrecido * 100);

  // Pre-autorización Stripe si está habilitado
  let intent = null;
  if (stripeEnabled) {
    intent = await stripe.paymentIntents.create({
      amount: montoTotalCents,
      currency: 'eur',
      payment_method: paymentMethodId,
      customer: usuario.stripeCustomerId,
      confirm: true,
      capture_method: 'manual',
      payment_method_types: ['card', 'link'],
      setup_future_usage: 'off_session',
      transfer_data: { destination: startup.stripeAccountId },
      application_fee_amount: 0,
    });
  }

  // Crear oferta y escrow
  const oferta = await prisma.oferta.create({
    data: {
      id_inversor: inversor.id,
      id_startup,
      monto_ofrecido,
      porcentaje_ofrecido,
      estado: 'Pendiente',
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    },
  });

  const escrow = await prisma.escrow.create({
    data: {
      id_oferta: oferta.id,
      monto: monto_ofrecido,
      estado: 'Pendiente',
      stripePaymentIntentId: intent?.id ?? null,
    },
  });

  await prisma.oferta.update({
    where: { id: oferta.id },
    data: { escrow_id: escrow.id },
  });

  res.status(201).json({
    message: 'Oferta registrada. Espera a que la startup la acepte para capturar fondos.',
    oferta,
    clientSecret: intent?.client_secret ?? null,
  });
};

/**
 * 2) Aceptar oferta
 */
export const offerAccepted = async (req, res) => {
  const ofertaId = Number(req.params.id_oferta);
  const userId = Number(req.params.id_usuario);
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
      return res.status(403).json({ message: 'Sin permisos para aceptar esta oferta' });
    }
    if (['Aceptada', 'Rechazada'].includes(oferta.estado)) {
      return res.status(400).json({ message: 'Esta oferta ya fue procesada' });
    }

    const pctOff = Number(oferta.porcentaje_ofrecido);
    const availablePct = Number(oferta.startup.porcentaje_disponible);
    if (isNaN(pctOff) || pctOff <= 0 || pctOff > availablePct) {
      return res.status(400).json({ message: 'Porcentaje inválido en la oferta' });
    }

    const montoOff = Number(oferta.monto_ofrecido);
    const comisionPlataforma = montoOff * 0.03;
    const escrow = oferta.escrow[0];

    // Captura Stripe si habilitado
    if (stripeEnabled && escrow.stripePaymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(escrow.stripePaymentIntentId);
      if (pi.status === 'requires_capture') {
        await stripe.paymentIntents.capture(escrow.stripePaymentIntentId, {
          application_fee_amount: Math.round(comisionPlataforma * 100),
        });
      }
    }

    // Transacción DB
    await prisma.$transaction(async (trx) => {
      await trx.oferta.update({ where: { id: ofertaId }, data: { estado: 'Aceptada' } });
      await trx.escrow.update({ where: { id: escrow.id }, data: { estado: 'Fondos capturados' } });

      const existing = await trx.inversion.findUnique({
        where: {
          inversor_startup_unique: {
            id_inversor: oferta.id_inversor,
            id_startup: oferta.id_startup,
          },
        },
      });

      if (existing) {
        await trx.inversion.update({
          where: { id: existing.id },
          data: {
            monto_invertido: { increment: montoOff },
            porcentaje_adquirido: { increment: pctOff },
            fecha: new Date(),
          },
        });
      } else {
        const inv = await trx.inversion.create({
          data: {
            id_inversor: oferta.id_inversor,
            id_startup: oferta.id_startup,
            monto_invertido: montoOff,
            porcentaje_adquirido: pctOff,
            valor: 0,
          },
        });
        await trx.portfolio.update({
          where: { id_inversor: oferta.id_inversor },
          data: { inversiones: { connect: { id: inv.id } } },
        });
      }

      await trx.startup.update({
        where: { id: oferta.id_startup },
        data: { porcentaje_disponible: { decrement: pctOff } },
      });
    });

    // Recalcular valoraciones e histórico
    const valoracion = await calcularValoracion(oferta.id_startup);
    await actualizarValoresInversiones(oferta.id_startup, valoracion);
    const valorPortfolio = await calcularValorTotalPortfolio(oferta.id_inversor);

    await prisma.valoracionHistorica.create({
      data: {
        startup: { connect: { id: oferta.id_startup } },
        valoracion,
        fecha: new Date(),
      },
    });
    await prisma.portfolioHistorico.create({
      data: {
        inversorId: oferta.id_inversor,
        valoracion: valorPortfolio,
        fecha: new Date(),
      },
    });

    // Notificar inversor
    const inversor = await prisma.inversor.findUnique({ where: { id: oferta.id_inversor } });
    if (inversor) {
      const montoFmt = montoOff.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + '€';
      await prisma.notificacion.create({
        data: {
          id_usuario: inversor.id_usuario,
          contenido: `Tu oferta de ${montoFmt} por el ${pctOff}% ha sido aceptada.`,
          tipo: 'inversion',
        },
      });
    }

    res.status(200).json({ message: 'Oferta aceptada correctamente' });
  } catch (err) {
    console.error('Error en offerAccepted:', err);
    res.status(500).json({ message: 'Error interno al aceptar oferta' });
  }
};

export const offerRejected = async (req, res) => {
  const ofertaId = parseInt(req.params.id_oferta, 10);
  const userId = parseInt(req.params.id_usuario, 10);
  if (!userId) return res.status(401).json({ message: 'Usuario no autenticado' });

  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { startup: true, escrow: true },
    });
    if (!oferta) return res.status(404).json({ message: 'Oferta no encontrada' });
    if (oferta.startup.id_usuario !== userId) return res.status(403).json({ message: 'No tienes permiso' });
    if (['Aceptada', 'Rechazada'].includes(oferta.estado)) return res.status(400).json({ message: 'Ya procesada' });

    const escrow = oferta.escrow[0];
    if (stripeEnabled && escrow.stripePaymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(escrow.stripePaymentIntentId);
      } catch (cancelError) {
        console.error('Error cancelando PaymentIntent Stripe:', cancelError);
      }
    }

    await prisma.$transaction([
      prisma.oferta.update({ where: { id: ofertaId }, data: { estado: 'Rechazada' } }),
      prisma.escrow.update({ where: { id: escrow.id }, data: { estado: 'Rechazado' } }),
    ]);

    // Notificación al inversor
    const formatMonto = m => m.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + '€';
    const montoFmt = formatMonto(oferta.monto_ofrecido);
    await prisma.notificacion.create({
      data: {
        id_usuario: oferta.id_inversor,
        contenido: `Tu oferta de ${montoFmt} ha sido rechazada.`,
        tipo: 'inversion',
      },
    });

    res.status(200).json({ message: 'Oferta rechazada con éxito' });
  } catch (err) {
    console.error('Error en offerRejected:', err);
    res.status(500).json({ message: 'Error interno al rechazar oferta' });
  }
};

/**
 * 4) Crear contraoferta
 */
export const counteroffer = async (req, res) => {
  const ofertaId = parseInt(req.params.id_oferta, 10);
  const userId = parseInt(req.params.id_usuario, 10);
  const { contraoferta_monto, contraoferta_porcentaje } = req.body;

  if (!userId) return res.status(401).json({ message: 'Usuario no autenticado' });
  if (!contraoferta_monto || !contraoferta_porcentaje) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { startup: true, inversor: true, escrow: true },
    });
    if (!oferta) return res.status(404).json({ message: 'Oferta no encontrada' });
    if (oferta.startup.id_usuario !== userId) return res.status(403).json({ message: 'No autorizado' });
    if (oferta.estado !== 'Pendiente' || oferta.contraoferta_monto != null) {
      return res.status(400).json({ message: 'No disponible para contraoferta' });
    }

    // Cancelar PaymentIntent original si Stripe habilitado
    const originalEscrow = oferta.escrow[0];
    if (stripeEnabled && originalEscrow.stripePaymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(originalEscrow.stripePaymentIntentId);
      } catch (err) {
        console.error('Error cancelando PaymentIntent original:', err);
      }
    }

    // Transacción: rechazar escrow, actualizar oferta y crear nuevo escrow
    await prisma.$transaction([
      prisma.escrow.update({ where: { id: originalEscrow.id }, data: { estado: 'Rechazado' } }),
      prisma.oferta.update({
        where: { id: ofertaId },
        data: {
          contraoferta_monto,
          contraoferta_porcentaje,
          estado: 'Contraoferta',
        },
      }),
      prisma.escrow.create({
        data: {
          id_oferta: ofertaId,
          monto: contraoferta_monto,
          estado: 'Pendiente',
          stripePaymentIntentId: null,
        },
      }),
    ]);

    // Notificar al inversor sobre contraoferta
    const montoFmt = contraoferta_monto.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + '€';
    await prisma.notificacion.create({
      data: {
        id_usuario: oferta.inversor.id_usuario,
        contenido: `Nueva contraoferta de ${oferta.startup.nombre}: ${montoFmt} (${contraoferta_porcentaje}%)`,
        tipo: 'contraoferta',
      },
    });

    res.status(200).json({ message: 'Contraoferta registrada exitosamente' });
  } catch (err) {
    console.error('Error en counteroffer:', err);
    res.status(500).json({ message: 'Error interno al crear contraoferta' });
  }
};

export const acceptCounteroffer = async (req, res) => {
  const ofertaId = parseInt(req.params.id_oferta, 10);
  const userId = parseInt(req.params.id_usuario, 10);
  const { paymentMethodId } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  if (stripeEnabled) {
    if (!paymentMethodId) {
      return res.status(400).json({ message: 'paymentMethodId es obligatorio' });
    }
  }

  try {
    // Obtener oferta con la última contraoferta y escrow
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: {
        inversor: { include: { usuario: true } },
        startup: true,
        escrow: { orderBy: { id: 'desc' }, take: 1 },
      },
    });
    if (!oferta) {
      return res.status(404).json({ message: 'Contraoferta no encontrada' });
    }
    if (oferta.inversor.id_usuario !== userId) {
      return res.status(403).json({ message: 'Sin permisos para aceptar esta contraoferta' });
    }
    if (oferta.estado !== 'Contraoferta' || oferta.contraoferta_monto == null) {
      return res.status(400).json({ message: 'Contraoferta no disponible para aceptar' });
    }

    // Validar porcentaje disponible
    const pctContra = Number(oferta.contraoferta_porcentaje);
    const available = await prisma.startup.findUnique({
      where: { id: oferta.id_startup },
      select: { porcentaje_disponible: true },
    });
    if (!available) {
      return res.status(404).json({ message: 'Startup no encontrada' });
    }
    if (isNaN(available.porcentaje_disponible)) {
      return res.status(500).json({ message: 'Porcentaje disponible no válido' });
    }
    if (available.porcentaje_disponible <= 0) {
      return res.status(400).json({ message: 'Startup sin porcentaje disponible' });
    }
    if (isNaN(pctContra) || pctContra <= 0 || pctContra > available) {
      return res.status(400).json({ message: 'Porcentaje contraoferta inválido' });
    }

    const montoContra = Number(oferta.contraoferta_monto);
    const comPlataforma = montoContra * 0.03;
    const escrow = oferta.escrow[0];

    let intent = null;
    if (stripeEnabled) {
      // Crear y capturar en un solo paso
      intent = await stripe.paymentIntents.create({
        amount: Math.round(montoContra * 100),
        currency: 'eur',
        payment_method: paymentMethodId,
        customer: oferta.inversor.usuario.stripeCustomerId,
        confirm: true,
        transfer_data: { destination: oferta.startup.stripeAccountId },
        application_fee_amount: Math.round(comPlataforma * 100),
      });
    }

    // Transacción DB: actualizar oferta, escrow, inversión, startup
    await prisma.$transaction(async (trx) => {
      await trx.oferta.update({
        where: { id: ofertaId },
        data: {
          estado: 'Aceptada',
          monto_ofrecido: montoContra,
          porcentaje_ofrecido: pctContra,
          contraoferta_monto: null,
          contraoferta_porcentaje: null,
        },
      });
      await trx.escrow.update({
        where: { id: escrow.id },
        data: {
          estado: 'Aceptado',
          stripePaymentIntentId: intent?.id ?? null,
        },
      });

      // Insertar o actualizar inversión
      const existing = await trx.inversion.findUnique({
        where: { inversor_startup_unique: { id_inversor: oferta.id_inversor, id_startup: oferta.id_startup } },
      });
      if (existing) {
        await trx.inversion.update({
          where: { id: existing.id },
          data: {
            monto_invertido: { increment: montoContra },
            porcentaje_adquirido: { increment: pctContra },
            fecha: new Date(),
          },
        });
      } else {
        const inv = await trx.inversion.create({
          data: {
            id_inversor: oferta.id_inversor,
            id_startup: oferta.id_startup,
            monto_invertido: montoContra,
            porcentaje_adquirido: pctContra,
            valor: 0,
          },
        });
        await trx.portfolio.update({ where: { id_inversor: oferta.id_inversor }, data: { inversiones: { connect: { id: inv.id } } } });
      }
      await trx.startup.update({ where: { id: oferta.id_startup }, data: { porcentaje_disponible: { decrement: pctContra } } });
    });

    const valoracion = await calcularValoracion(oferta.id_startup);
    await actualizarValoresInversiones(oferta.id_startup, valoracion);
    const valorPortfolio = await calcularValorTotalPortfolio(oferta.id_inversor);

    await prisma.valoracionHistorica.create({
      data: {
        startup: { connect: { id: oferta.id_startup } },
        valoracion,
        fecha: new Date(),
      },
    });
    await prisma.portfolioHistorico.create({
      data: {
        inversorId: oferta.id_inversor,
        valoracion: valorPortfolio,
        fecha: new Date(),
      },
    });

    // Notificar inversor
    const montoFmt = montoContra.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + '€';
    await prisma.notificacion.create({
      data: {
        id_usuario: oferta.inversor.usuario.id,
        contenido: `Tu contraoferta de ${montoFmt} por el ${pctContra}% ha sido aceptada y pagada.`,
        tipo: 'inversion',
      },
    });

    res.status(200).json({ message: 'Contraoferta aceptada y fondos capturados correctamente' });
  } catch (err) {
    console.error('Error en acceptCounteroffer:', err);
    res.status(500).json({ message: 'Error interno al aceptar contraoferta' });
  }
};

/**
 * 6) Rechazar contraoferta
 */
export const rejectCounteroffer = async (req, res) => {
  const ofertaId = parseInt(req.params.id_oferta, 10);
  const userId = parseInt(req.params.id_usuario, 10);
  if (!userId) return res.status(401).json({ message: 'Usuario no autenticado' });

  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { inversor: true, escrow: { orderBy: { id: 'desc' }, take: 1 } },
    });
    if (!oferta) return res.status(404).json({ message: 'Contraoferta no encontrada' });
    if (oferta.inversor.id_usuario !== userId) return res.status(403).json({ message: 'No tienes permiso' });
    if (!['Contraoferta'].includes(oferta.estado)) return res.status(400).json({ message: 'Estado no válido' });

    const escrow = oferta.escrow[0];
    if (stripeEnabled && escrow.stripePaymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(escrow.stripePaymentIntentId);
      } catch (cancelErr) {
        console.error('Error cancelando PaymentIntent contraoferta:', cancelErr);
      }
    }

    await prisma.$transaction([
      prisma.oferta.update({
        where: { id: ofertaId },
        data: { estado: 'Rechazada', contraoferta_monto: null, contraoferta_porcentaje: null },
      }),
      prisma.escrow.update({ where: { id: escrow.id }, data: { estado: 'Rechazado' } }),
    ]);

    // Notificar inversor
    const montoFmt = escrow.monto.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + '€';
    await prisma.notificacion.create({
      data: {
        id_usuario: oferta.inversor.id_usuario,
        contenido: `Tu contraoferta de ${montoFmt} por el ${oferta.contraoferta_porcentaje}% ha sido rechazada.`,
        tipo: 'inversion',
      },
    });

    res.status(200).json({ message: 'Contraoferta rechazada con éxito' });
  } catch (err) {
    console.error('Error en rejectCounteroffer:', err);
    res.status(500).json({ message: 'Error interno al rechazar contraoferta' });
  }
};