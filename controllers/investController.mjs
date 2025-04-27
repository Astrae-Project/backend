import prisma from '../lib/prismaClient.mjs';
import jwt from 'jsonwebtoken';
import { actualizarValoresInversiones, calcularValoracion, calcularValorTotalPortfolio } from '../lib/functionCalculations.mjs';
import stripe from '../lib/stripeClient.mjs';

export const offer = async (req, res) => {
  const token = req.cookies.token;
  const {
    id_startup,
    monto_ofrecido,
    porcentaje_ofrecido,
    paymentMethodId,
    termsAccepted
  } = req.body;

  if (!token) return res.status(401).json({ message: 'Token no proporcionado' });
  if (!id_startup || !monto_ofrecido || !porcentaje_ofrecido || !paymentMethodId) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }
  if (!termsAccepted) {
    return res.status(400).json({ message: 'Debes aceptar los términos y condiciones.' });
  }

  const { userId } = jwt.verify(token, process.env.JWT_SECRET);
  // Comprueba que el usuario tiene un método de pago
  const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!usuario.payment_method_id) {
    return res.status(402).json({
      message: 'Debes registrar un método de pago antes de invertir.',
      redirect: '/ajustes'
    });
  }

  const inversor = await prisma.inversor.findFirst({ where: { id_usuario: userId } });
  const startup  = await prisma.startup.findUnique({ where: { id: id_startup } });
  if (!inversor || !startup) return res.status(404).json({ message: 'Inversor o Startup no encontrados' });

  // Comisión del 3% y monto a la startup
  const comisionPlataforma = monto_ofrecido * 0.03;
  const montoTotalCents    = Math.round(monto_ofrecido * 100);

  // Pre-autorización (retención)
  const intent = await stripe.paymentIntents.create({
    amount: montoTotalCents,
    currency: 'eur',
    payment_method: paymentMethodId,
    customer: usuario.stripeCustomerId,
    confirm: true,
    capture_method: 'manual',
    transfer_data: { destination: startup.stripeAccountId },
    application_fee_amount: 0  // comisión pendiente
  });

  // Crear oferta + escrow
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
      stripePaymentIntentId: intent.id,
    },
  });
  await prisma.oferta.update({
    where: { id: oferta.id },
    data: { escrow_id: escrow.id },
  });

  res.status(201).json({
    message: 'Oferta registrada. Espera a que la startup la acepte para capturar fondos.',
    oferta,
    clientSecret: intent.client_secret
  });
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
    // 1) Obtener oferta con startup y escrow
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: {
        startup: true,
        escrow: true,
      },
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

    // 2) Validar expiración (oferta válida X días)
    const expirationDays = parseInt(process.env.OFFER_EXPIRATION_DAYS || '7', 10);
    const expirationDate = new Date(oferta.fecha_creacion);
    expirationDate.setDate(expirationDate.getDate() + expirationDays);
    if (new Date() > expirationDate) {
      return res.status(400).json({ message: 'La oferta ha expirado' });
    }

    // 3) Validar porcentaje disponible
    const pctOff = Number(oferta.porcentaje_ofrecido);
    const availablePct = Number(oferta.startup.porcentaje_disponible);
    if (isNaN(pctOff) || pctOff <= 0) {
      return res.status(400).json({ message: 'Porcentaje inválido en la oferta' });
    }
    if (pctOff > availablePct) {
      return res.status(400).json({ message: 'Porcentaje ofrecido mayor al disponible' });
    }

    // 4) Preparar montos y comisión
    const montoOff = Number(oferta.monto_ofrecido);
    const comisionPlataforma = montoOff * 0.03;

    // 5) Obtener escrow y verificar PaymentIntent
    const escrow = oferta.escrow[0];
    if (!escrow?.stripePaymentIntentId) {
      return res.status(400).json({ message: 'No hay escrow asociado a esta oferta' });
    }
    const pi = await stripe.paymentIntents.retrieve(escrow.stripePaymentIntentId);
    if (pi.status !== 'requires_capture') {
      return res.status(400).json({ message: 'El pago no está disponible para capturar' });
    }

    // 6) Capturar fondos con comisión
    try {
      await stripe.paymentIntents.capture(escrow.stripePaymentIntentId, {
        application_fee_amount: Math.round(comisionPlataforma * 100),
      });
    } catch (captureError) {
      // Marca error de cobro y notifica al inversor
      await prisma.escrow.update({
        where: { id: escrow.id },
        data: { estado: 'ErrorCobro' },
      });
      await prisma.notificacion.create({
        data: {
          id_usuario: oferta.id_inversor,
          contenido: `Falló el cobro de tu inversión de ${montoOff}€. Actualiza tu método de pago.`,
          tipo: 'inversion',
        },
      });
      return res.status(402).json({ message: 'Cobro fallido, actualiza tu método de pago.' });
    }

    // 7) Ejecutar transacción en BD: actualizar oferta, escrow, inversión, startup
    try {
      await prisma.$transaction(async (trx) => {
        await trx.oferta.update({
          where: { id: ofertaId },
          data: { estado: 'Aceptada' },
        });
        await trx.escrow.update({
          where: { id: escrow.id },
          data: { estado: 'Fondos capturados' },
        });

        const existing = await trx.inversion.findUnique({
          where: {
            inversor_startup_unique: {
              id_inversor: oferta.id_inversor,
              id_startup: oferta.id_startup,
            },
          },
        });

        let inversionRecord;
        if (existing) {
          inversionRecord = await trx.inversion.update({
            where: { id: existing.id },
            data: {
              monto_invertido: { increment: montoOff },
              porcentaje_adquirido: { increment: pctOff },
              fecha: new Date(),
            },
          });
        } else {
          inversionRecord = await trx.inversion.create({
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
            data: {
              inversiones: { connect: { id: inversionRecord.id } },
            },
          });
        }

        await trx.startup.update({
          where: { id: oferta.id_startup },
          data: { porcentaje_disponible: { decrement: pctOff } },
        });
      });
    } catch (dbError) {
      // Si falla la BD tras captura, reembolsar automáticamente
      await stripe.refunds.create({
        payment_intent: escrow.stripePaymentIntentId,
      });
      console.error('DB transaction failed, payment refunded:', dbError);
      return res.status(500).json({ message: 'Error interno. Pago revertido.' });
    }

    // 8) Recalcular valoraciones e inversiones
    const valoracion = await calcularValoracion(oferta.id_startup);
    await actualizarValoresInversiones(oferta.id_startup, valoracion);

    // 9) Registrar historial de valoraciones
    await prisma.valoracionHistorica.create({
      data: {
        startup: { connect: { id: oferta.id_startup } },
        valoracion,
        fecha: new Date(),
      },
    });

    // 10) Actualizar portfolio histórico
    const valorPortfolio = await calcularValorTotalPortfolio(oferta.id_inversor);
    await prisma.portfolioHistorico.create({
      data: {
        inversorId: oferta.id_inversor,
        valoracion: valorPortfolio,
        fecha: new Date(),
      },
    });

    // 11) Notificar al inversor del éxito
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

    return res.status(200).json({
      message: 'Oferta aceptada, inversión creada y fondos capturados correctamente',
    });
  } catch (err) {
    console.error('Error en offerAccepted:', err);
    return res.status(500).json({ message: 'Error interno al aceptar oferta' });
  }
};

// Función para rechazar una oferta
export const offerRejected = async (req, res) => {
  const ofertaId = parseInt(req.params.id_oferta);
  const userId = parseInt(req.params.id_usuario);

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

    if (oferta.estado === 'Aceptada' || oferta.estado === 'Rechazada') {
      return res.status(400).json({ message: 'Esta oferta ya ha sido aceptada o rechazada' });
    }

    // Cancelar el PaymentIntent de Stripe si existe
    const escrow = oferta.escrow[0];
    if (escrow?.stripePaymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(escrow.stripePaymentIntentId);
      } catch (cancelError) {
        console.error('Error al cancelar PaymentIntent en Stripe:', cancelError);
        // Aquí decides: puedes continuar o lanzar error. Yo recomiendo continuar y solo loguearlo.
      }
    }

    await prisma.$transaction([
      prisma.oferta.update({
        where: { id: ofertaId },
        data: { estado: 'Rechazada' },
      }),
      prisma.escrow.update({
        where: { id: oferta.escrow_id },
        data: { estado: 'Rechazado' },
      }),
    ]);

    const inversor = await prisma.inversor.findUnique({
      where: { id: oferta.id_inversor },
    });

    if (!inversor) {
      return res.status(404).json({ message: 'Usuario inversor no encontrado' });
    }

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

    const montoFormateado = formatMonto(oferta.monto_ofrecido) + "€";

    await prisma.notificacion.create({
      data: {
        id_usuario: inversor.id_usuario,
        contenido: `Tu oferta de ${montoFormateado} por el ${oferta.porcentaje_ofrecido}% ha sido rechazada.`,
        tipo: 'inversion',
      },
    });

    res.status(200).json({ message: 'Oferta rechazada y PaymentIntent cancelado' });
  } catch (err) {
    console.error('Error al rechazar la oferta:', err);
    res.status(500).json({ message: 'Error al rechazar la oferta' });
  }
};

// 1) Crear contraoferta: cancela el escrow original y crea un nuevo escrow “vacío”
export const counteroffer = async (req, res) => {
  const ofertaId = parseInt(req.params.id_oferta, 10);
  const userId   = parseInt(req.params.id_usuario, 10);
  const { contraoferta_monto, contraoferta_porcentaje } = req.body;

  if (!userId) return res.status(401).json({ message: 'Usuario no autenticado' });
  if (!contraoferta_monto || !contraoferta_porcentaje) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: {
        startup: { include: { usuario: true } },
        inversor: { include: { usuario: true } },
        escrow: true,
      },
    });
    if (!oferta) return res.status(404).json({ message: 'Oferta no encontrada' });
    if (oferta.startup.usuario.id !== userId) {
      return res.status(403).json({ message: 'No autorizado para contraofertar' });
    }
    if (oferta.estado !== 'Pendiente' || oferta.contraoferta_monto !== null) {
      return res.status(400).json({ message: 'Oferta no disponible para contraoferta' });
    }

    // Cancelar el PaymentIntent del escrow original
    const originalEscrow = oferta.escrow[0];
    if (originalEscrow?.stripePaymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(originalEscrow.stripePaymentIntentId);
      } catch (err) {
        console.error('Error cancelando PaymentIntent original:', err);
      }
    }

    // Transacción: marcar original escrow como rechazado, actualizar oferta y crear nuevo escrow
    await prisma.$transaction([
      prisma.escrow.update({
        where: { id: originalEscrow.id },
        data: { estado: 'Rechazado' },
      }),
      prisma.oferta.update({
        where: { id: ofertaId },
        data: {
          contraoferta_monto,
          contraoferta_porcentaje,
          estado: 'Pendiente',
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

    // Notificación al inversor
    const formatMonto = (m) => m >= 1e6
      ? `${(m/1e6).toFixed(m%1===0?0:1)}M`
      : m >= 1e3
        ? `${(m/1e3).toFixed(m%1===0?0:1)}K`
        : m.toString();
    const montoFmt = formatMonto(contraoferta_monto) + '€';

    await prisma.notificacion.create({
      data: {
        id_usuario: oferta.inversor.usuario.id,
        contenido: `Nueva contraoferta de ${oferta.startup.nombre}: ${montoFmt} (${contraoferta_porcentaje}%)`,
        tipo: 'contraoferta',
      },
    });

    res.status(200).json({ message: 'Contraoferta registrada exitosamente' });
  } catch (err) {
    console.error('counteroffer error:', err);
    res.status(500).json({ message: 'Error interno al registrar contraoferta' });
  }
};

// 2) Aceptar contraoferta: crea y captura el PaymentIntent, luego actualiza oferta, escrow e inversión
export const acceptCounteroffer = async (req, res) => {
  const ofertaId       = parseInt(req.params.id_oferta, 10);
  const userId         = parseInt(req.params.id_usuario, 10);
  const { paymentMethodId } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }
  if (!paymentMethodId) {
    return res.status(400).json({ message: 'paymentMethodId es obligatorio' });
  }

  try {
    // Obtener oferta con la última contraoferta y el nuevo escrow
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: {
        inversor: true,
        startup: true,
        escrow: { orderBy: { id: 'desc' }, take: 1 } // Solo el último escrow
      }
    });
    if (!oferta) return res.status(404).json({ message: 'Oferta no encontrada' });
    if (oferta.inversor.id_usuario !== userId) {
      return res.status(403).json({ message: 'Sin permisos para aceptar esta contraoferta' });
    }
    if (oferta.estado !== 'Pendiente' || oferta.contraoferta_monto == null) {
      return res.status(400).json({ message: 'Contraoferta no disponible para aceptar' });
    }

    // Validar porcentaje disponible
    const pctContra = Number(oferta.contraoferta_porcentaje);
    const available = await getPorcentajeDisponible(oferta.id_startup);
    if (isNaN(pctContra) || pctContra <= 0 || pctContra > available) {
      return res.status(400).json({ message: 'Porcentaje contraoferta inválido' });
    }

    // Prepara montos y comisión
    const montoContra = Number(oferta.contraoferta_monto);
    const comPlataforma = montoContra * 0.03;
    const startupAcc = oferta.startup.stripeAccountId;
    const customerId = oferta.inversor.usuario.stripeCustomerId;

    // 1) Crear PaymentIntent y capturar al vuelo
    let intent;
    try {
      intent = await stripe.paymentIntents.create({
        amount: Math.round(montoContra * 100),
        currency: 'eur',
        payment_method: paymentMethodId,
        customer: customerId,
        confirm: true,
        transfer_data: { destination: startupAcc },
        application_fee_amount: Math.round(comPlataforma * 100),
      });
    } catch (stripeErr) {
      console.error('Error creando o capturando PaymentIntent:', stripeErr);
      return res.status(402).json({ message: 'Cobro fallido, actualiza tu método de pago.' });
    }

    // 2) Actualizar BD: oferta, escrow, inversión, startup
    await prisma.$transaction(async (trx) => {
      // Actualiza oferta con los nuevos valores
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
      // Actualiza escrow: añade stripePaymentIntentId y marca como capturado
      const esc = oferta.escrow[0];
      await trx.escrow.update({
        where: { id: esc.id },
        data: {
          estado: 'Aceptado',
          stripePaymentIntentId: intent.id,
        },
      });

      // Insertar o actualizar inversión
      const existing = await trx.inversion.findUnique({
        where: {
          inversor_startup_unique: {
            id_inversor: oferta.id_inversor,
            id_startup: oferta.id_startup,
          }
        }
      });
      let invRec;
      if (existing) {
        invRec = await trx.inversion.update({
          where: { id: existing.id },
          data: {
            monto_invertido: { increment: montoContra },
            porcentaje_adquirido: { increment: pctContra },
            fecha: new Date(),
          }
        });
      } else {
        invRec = await trx.inversion.create({
          data: {
            id_inversor: oferta.id_inversor,
            id_startup: oferta.id_startup,
            monto_invertido: montoContra,
            porcentaje_adquirido: pctContra,
            valor: 0,
          }
        });
        await trx.portfolio.update({
          where: { id_inversor: oferta.id_inversor },
          data: { inversiones: { connect: { id: invRec.id } } }
        });
      }
      // Actualiza porcentaje disponible de la startup
      await trx.startup.update({
        where: { id: oferta.id_startup },
        data: { porcentaje_disponible: { decrement: pctContra } }
      });
    });

    // 3) Notificar al inversor
    const montoFmt = montoContra.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + '€';
    await prisma.notificacion.create({
      data: {
        id_usuario: oferta.inversor.usuario.id,
        contenido: `Tu contraoferta de ${montoFmt} por el ${pctContra}% ha sido aceptada y pagada.`,
        tipo: 'inversion',
      }
    });

    res.status(200).json({ message: 'Contraoferta aceptada y fondos capturados correctamente' });
  } catch (err) {
    console.error('acceptCounteroffer error:', err);
    res.status(500).json({ message: 'Error interno al aceptar contraoferta' });
  }
};

// 3) Rechazar contraoferta: cancela el PaymentIntent de la contraoferta y marca estados
export const rejectCounteroffer = async (req, res) => {
  const ofertaId = parseInt(req.params.id_oferta, 10);
  const userId   = parseInt(req.params.id_usuario, 10);

  if (!userId) return res.status(401).json({ message: 'Usuario no autenticado' });

  try {
    const oferta = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { inversor: true, escrow: { orderBy: { id: 'desc' }, take: 1 } },
    });
    if (!oferta) return res.status(404).json({ message: 'Contraoferta no encontrada' });
    if (oferta.inversor.id_usuario !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para rechazar esta contraoferta' });
    }
    if (oferta.estado === 'Aceptada' || oferta.estado === 'Rechazada') {
      return res.status(400).json({ message: 'Esta contraoferta ya ha sido procesada' });
    }

    // Cancelar el PaymentIntent si existe
    const esc = oferta.escrow[0];
    if (esc?.stripePaymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(esc.stripePaymentIntentId);
      } catch (cancelErr) {
        console.error('Error cancelando PaymentIntent contraoferta:', cancelErr);
      }
    }

    // Marcar oferta y escrow
    await prisma.$transaction([
      prisma.oferta.update({
        where: { id: ofertaId },
        data: { estado: 'Rechazada', contraoferta_monto: null, contraoferta_porcentaje: null },
      }),
      prisma.escrow.update({
        where: { id: esc.id },
        data: { estado: 'Rechazado' },
      }),
    ]);

    // Notificar al inversor
    const montoFmt = esc.monto.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + '€';
    await prisma.notificacion.create({
      data: {
        id_usuario: oferta.inversor.id_usuario,
        contenido: `Tu contraoferta de ${montoFmt} por el ${oferta.contraoferta_porcentaje}% ha sido rechazada.`,
        tipo: 'inversion',
      },
    });

    res.status(200).json({ message: 'Contraoferta rechazada con éxito' });
  } catch (err) {
    console.error('rejectCounteroffer error:', err);
    res.status(500).json({ message: 'Error interno al rechazar contraoferta' });
  }
};
