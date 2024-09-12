
export const investorOffer = async (req, res) => {
    const { id_inversor, id_startup, monto, porcentaje } = req.body;
  
    try {
      // Crear el PaymentIntent con captura manual
      const paymentIntent = await stripe.paymentIntents.create({
        amount: monto * 100, // En centavos
        currency: 'usd',
        payment_method_types: ['card'],
        capture_method: 'manual', // Retener el pago
      });
  
      // Guardar la oferta en la base de datos
      const nuevaOferta = await oferta.create({
        id_inversor,
        id_startup,
        monto_ofrecido: monto,
        porcentaje_ofrecido: porcentaje,
        payment_intent_id: paymentIntent.id,
        estado: 'en espera',
      });
  
      res.status(201).json({ message: 'Oferta creada y pago retenido', oferta: nuevaOferta });
    } catch (error) {
      console.error('Error creando oferta:', error);
      res.status(500).send('Error al crear la oferta');
    }
  };

  // Aceptar oferta
export const offerAccepted = async (req, res) => {
    const { id } = req.params;
    const oferta = await oferta.findById(id);
  
    if (!oferta || oferta.estado !== 'en espera') {
      return res.status(404).json({ message: 'Oferta no válida' });
    }
  
    try {
      // Capturar el pago
      await stripe.paymentIntents.capture(oferta.payment_intent_id);
  
      oferta.estado = 'aceptada';
      await oferta.save();
  
      // Actualizar el portafolio del inversor
      await portfolios.create({
        id_inversor: oferta.id_inversor,
        monto_invertido: oferta.monto_ofrecido,
        id_startup: oferta.id_startup,
        porcentaje_adquirido: oferta.porcentaje_ofrecido,
      });
  
      res.status(200).json({ message: 'Oferta aceptada y pago completado' });
    } catch (error) {
      console.error('Error al aceptar la oferta:', error);
      res.status(500).send('Error al capturar el pago');
    }
  };
  
  // Rechazar oferta
  export const offerRejected = async (req, res) => {
    const { id } = req.params;
    const oferta = await oferta.findById(id);
  
    if (!oferta || oferta.estado !== 'en espera') {
      return res.status(404).json({ message: 'Oferta no válida' });
    }
  
    try {
      // Cancelar el PaymentIntent
      await stripe.paymentIntents.cancel(oferta.payment_intent_id);
  
      oferta.estado = 'rechazada';
      await oferta.save();
  
      res.status(200).json({ message: 'Oferta rechazada y pago devuelto' });
    } catch (error) {
      console.error('Error al rechazar la oferta:', error);
      res.status(500).send('Error al cancelar el pago');
    }
  };
  
  // Contraoferta
  export const counteroffer = async (req, res) => {
    const { id } = req.params;
    const { nuevoMonto, nuevoPorcentaje } = req.body;
    const oferta = await Oferta.findById(id);
  
    if (!oferta || oferta.estado !== 'en espera') {
      return res.status(404).json({ message: 'Oferta no válida' });
    }
  
    try {
      oferta.monto_ofrecido = nuevoMonto;
      oferta.porcentaje_ofrecido = nuevoPorcentaje;
      oferta.estado = 'contraoferta';
      await oferta.save();
  
      res.status(200).json({ message: 'Contraoferta enviada al inversor', oferta });
    } catch (error) {
      console.error('Error al enviar contraoferta:', error);
      res.status(500).send('Error al realizar la contraoferta');
    }
  };

  // Aceptar contraoferta
  export const acceptCounteroffer = async (req, res) => {
    const { id } = req.params;
    const oferta = await Oferta.findById(id);
  
    if (!oferta || oferta.estado !== 'contraoferta') {
      return res.status(404).json({ message: 'Contraoferta no válida' });
    }
  
    try {
      // Capturar el pago
      await stripe.paymentIntents.capture(oferta.payment_intent_id);
  
      oferta.estado = 'aceptada';
      await oferta.save();
  
      // Actualizar el portafolio del inversor
      await portfolios.create({
        id_inversor: oferta.id_inversor,
        monto_invertido: oferta.monto_ofrecido,
        id_startup: oferta.id_startup,
        porcentaje_adquirido: oferta.porcentaje_ofrecido,
      });
  
      res.status(200).json({ message: 'Contraoferta aceptada y pago completado' });
    } catch (error) {
      console.error('Error al aceptar la contraoferta:', error);
      res.status(500).send('Error al capturar el pago');
    }
  };
  
  // Rechazar contraoferta
  export const rejectCounteroffer = async (req, res) => {
    const { id } = req.params;
    const oferta = await Oferta.findById(id);
  
    if (!oferta || oferta.estado !== 'contraoferta') {
      return res.status(404).json({ message: 'Contraoferta no válida' });
    }
  
    try {
      // Cancelar el PaymentIntent
      await stripe.paymentIntents.cancel(oferta.payment_intent_id);
  
      oferta.estado = 'rechazada';
      await oferta.save();
  
      res.status(200).json({ message: 'Contraoferta rechazada y pago devuelto' });
    } catch (error) {
      console.error('Error al rechazar la contraoferta:', error);
      res.status(500).send('Error al cancelar el pago');
    }
};
  
