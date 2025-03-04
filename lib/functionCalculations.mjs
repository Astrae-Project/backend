import prisma from "./prismaClient.mjs";
const calcularValoracion = async (startupId) => {
  // Obtener la última oferta aceptada para la startup
  const ultimaOferta = await prisma.oferta.findFirst({
    where: {
      id_startup: startupId,
      estado: 'Aceptada', // Asegúrate de que el estado "aceptada" sea correcto
    },
    orderBy: {
      fecha_creacion: 'desc', // Si el campo correcto es otro, cámbialo aquí.
    },
  });

  if (!ultimaOferta) {
    console.error('No se encontró una oferta aceptada para la startup:', startupId);
    return 0; // Retorna 0 si no se encuentra oferta aceptada
  }

  const montoInvertido = parseFloat(ultimaOferta.monto_ofrecido.toString()); // Asegúrate de que es un número válido
  const porcentajeAdquirido = parseFloat(ultimaOferta.porcentaje_ofrecido.toString()); // Asegúrate de que es un número válido

  // Validar si los valores son correctos
  if (isNaN(montoInvertido) || isNaN(porcentajeAdquirido)) {
    console.error('Datos inválidos en la oferta:', ultimaOferta);
    return 0;
  }

  // Evitar división por 0
  if (porcentajeAdquirido === 0) {
    console.error('El porcentaje adquirido es 0 para la oferta:', ultimaOferta.id);
    return 0;
  }

  // Calcular la valoración total:
  const valoracionTotal = montoInvertido / (porcentajeAdquirido / 100);

  // Validar que la valoración total tenga sentido
  if (isNaN(valoracionTotal) || valoracionTotal <= 0) {
    console.error('La valoración calculada no es válida:', valoracionTotal);
    return 0;
  }

  // Actualizar la valoración en la base de datos para la startup
  await prisma.startup.update({
    where: { id: startupId },
    data: { valoracion: valoracionTotal },
  });

  return valoracionTotal;
};

  // Actualización de múltiples inversiones de una vez
const actualizarValoresInversiones = async (idStartup, nuevaValoracion) => {
  try {
    // Obtener todas las inversiones de la startup
    const inversiones = await prisma.inversion.findMany({
      where: { id_startup: idStartup },
    });

    // Crear un array de promesas para actualizar todas las inversiones
    const updates = inversiones.map((inversion) => {
      const nuevoValor = (nuevaValoracion * (inversion.porcentaje_adquirido / 100));

      return prisma.inversion.update({
        where: { id: inversion.id },
        data: { valor: nuevoValor },
      });
    });

    // Ejecutar todas las actualizaciones en paralelo
    await Promise.all(updates);

  } catch (err) {
    console.error('Error al actualizar los valores de las inversiones:', err);
  }
};


  const calcularValorTotalPortfolio = async (idInversor) => {
    const inversiones = await prisma.inversion.findMany({
      where: { id_inversor: idInversor },
      select: { valor: true },
    });
  
    // Sumar los valores de todas las inversiones
    const totalValor = inversiones.reduce((acc, inv) => acc + parseFloat(inv.valor), 0);
  
    // Actualizar el valor total del portfolio
    await prisma.portfolio.update({
      where: { id_inversor: idInversor },
      data: { valor_total: totalValor },
    });
  
    return totalValor;
  };

  // utils.js
const calcularROI = (montoInvertido, valorActual) => {
  if (montoInvertido <= 0) return 0; // Evitar división por cero
  return ((valorActual - montoInvertido) / montoInvertido) * 100;
};


export {
    calcularValoracion,
    calcularValorTotalPortfolio,
    actualizarValoresInversiones,
    calcularROI
};
