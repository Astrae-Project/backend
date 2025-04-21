import prisma from "./prismaClient.mjs";

export const calcularValoracion = async (startupId) => {
  // 1) Traer todas las inversiones de esa startup
  const inversiones = await prisma.inversion.findMany({
    where: { id_startup: startupId },
    select: { monto_invertido: true, porcentaje_adquirido: true },
  });

  if (inversiones.length === 0) {
    console.error(`No hay inversiones para la startup ${startupId}`);
    return 0;
  }

  // 2) Acumular montos y porcentajes
  const totalMonto = inversiones.reduce((sum, inv) => sum + Number(inv.monto_invertido), 0);
  const totalPct   = inversiones.reduce((sum, inv) => sum + Number(inv.porcentaje_adquirido), 0);

  if (totalPct <= 0) {
    console.error(`Porcentaje total cero o inválido para startup ${startupId}`);
    return 0;
  }

  // 3) Calcular valoración global
  const rawVal = totalMonto * 100 / totalPct;
  const valoracion = Number(rawVal.toFixed(2));
  if (!isFinite(valoracion) || valoracion <= 0) {
    console.error('Valoración no válida:', valoracion);
    return 0;
  }

  // 4) Guardar en la startup
  await prisma.startup.update({
    where: { id: startupId },
    data: { valoracion },
  });

  return valoracion;
};

export const actualizarValoresInversiones = async (startupId, valoracion) => {
  if (!valoracion || valoracion <= 0) return;
  const inversiones = await prisma.inversion.findMany({
    where: { id_startup: startupId },
    select: { id: true, porcentaje_adquirido: true },
  });

  await prisma.$transaction(
    inversiones.map(({ id, porcentaje_adquirido }) => {
      const pct = Number(porcentaje_adquirido);
      const nuevoValor = Number((valoracion * pct / 100).toFixed(2));
      return prisma.inversion.update({
        where: { id },
        data: { valor: nuevoValor },
      });
    })
  );
};

export const calcularValorTotalPortfolio = async (idInversor) => {
  const inversiones = await prisma.inversion.findMany({
    where: { id_inversor: idInversor },
    select: { valor: true },
  });
  const totalValor = inversiones.reduce((sum, inv) => sum + Number(inv.valor), 0);
  await prisma.portfolio.update({
    where: { id_inversor: idInversor },
    data: { valor_total: totalValor },
  });
  return totalValor;
};

export const calcularROI = (montoInvertido, valorActual) => {
  if (montoInvertido <= 0) return 0; // Evitar división por cero
  return ((valorActual - montoInvertido) / montoInvertido) * 100;
};
