import prisma from "./prismaClient.mjs";

const calcularValoracion = async (startupId) => {
    // Obtener la última oferta aceptada para la startup
    const ultimaOferta = await prisma.oferta.findFirst({
      where: {
        id_startup: startupId,
        estado: 'aceptada',
      },
      orderBy: {
        fecha_creacion: 'desc', // Asumiendo que 'createdAt' es el campo de fecha
      },
    });
  
    if (!ultimaOferta) {
      return null; // O manejarlo como desees
    }
  
    const montoInvertido = parseFloat(ultimaOferta.monto_ofrecido);
    const porcentajeAdquirido = parseFloat(ultimaOferta.porcentaje_ofrecido);
  
    // Calcular la valoración total usando la regla de tres
    const valoracionTotal = (montoInvertido / (porcentajeAdquirido / 100));
  
    // Actualizar la valoración en la base de datos
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
