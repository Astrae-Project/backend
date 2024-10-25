import prisma from "./prismaClient.mjs";

// Función para calcular si una inversión es exitosa
const calcularInversionExitosas = async (idInversion) => {
    const inversion = await prisma.inversion.findUnique({
        where: { id: idInversion },
        include: { startup: true } // Incluye datos de la startup
    });

    if (inversion) {
        const ingresos = await obtenerIngresosPorInversion(idInversion); // Implementa esta función para obtener ingresos
        return ingresos > inversion.monto_invertido; // Retorna si es exitosa
    }
    return false;
};

// Función para calcular el retorno promedio de un inversor
const calcularRetornoPromedio = async (idInversor) => {
    const inversiones = await prisma.inversion.findMany({
        where: { id_inversor: idInversor }
    });

    const totalRetorno = await inversiones.reduce(async (totalPromise, inv) => {
        const total = await totalPromise; // Asegúrate de esperar la promesa
        const ingresos = await obtenerIngresosPorInversion(inv.id); // Implementa esta función
        return total + (ingresos - inv.monto_invertido);
    }, Promise.resolve(0)); // Inicia con 0

    return totalRetorno / inversiones.length; // Retorna el promedio
};

// Función para calcular el sector favorito de un inversor
const calcularSectorFavorito = async (idInversor) => {
    const inversiones = await prisma.inversion.findMany({
        where: { id_inversor: idInversor },
        include: { startup: true } // Para obtener el sector de cada startup
    });

    const sectores = inversiones.reduce((acc, inv) => {
        acc[inv.startup.sector] = (acc[inv.startup.sector] || 0) + 1; // Cuenta las inversiones por sector
        return acc;
    }, {});

    return Object.keys(sectores).reduce((a, b) => sectores[a] > sectores[b] ? a : b); // Retorna el sector más repetido
};

// Función para obtener ingresos por inversión (ejemplo básico)
const obtenerIngresosPorInversion = async (idInversion) => {
    const ingresos = await prisma.ingreso.findMany({
        where: { id_inversion: idInversion }
    });

    // Sumar todos los montos de los ingresos
    const totalIngresos = ingresos.reduce((total, ingreso) => total + ingreso.monto, 0);
    
    return totalIngresos; // Retorna la suma total de ingresos
};

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
      console.log(`No hay ofertas aceptadas para la startup (ID: ${startupId}).`);
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
  
    console.log(`Valoración total de (ID: ${startupId}): ${valoracionTotal}`);
    
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

    console.log('Valores de las inversiones actualizados');
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
  
    console.log(`Valor total del portfolio para el inversor (ID: ${idInversor}): ${totalValor}`);
  };

export {
    calcularInversionExitosas,
    calcularRetornoPromedio,
    calcularSectorFavorito,
    obtenerIngresosPorInversion,
    calcularValoracion,
    calcularValorTotalPortfolio,
    actualizarValoresInversiones
};
