import prisma from "../lib/prismaClient.mjs";

export const searchAll = async (req, res) => {
  const { query } = req.query; // Obtén el término de búsqueda

  if (!query) {
    return res.status(400).json({ error: 'Faltan parámetros de búsqueda' });
  }

  try {
    const [startups, inversores] = await Promise.all([
      prisma.startup.findMany({
        where: {
          OR: [
            { nombre: { contains: query, mode: 'insensitive' } },
            { sector: { contains: query, mode: 'insensitive' } },
            { fase_desarrollo: { contains: query, mode: 'insensitive' } },
            { estado_financiacion: { contains: query, mode: 'insensitive' } }
          ]
        }
      }),
      prisma.inversor.findMany({
        where: {
          OR: [
            { nombre: { contains: query, mode: 'insensitive' } },
            { perfil_inversion: { contains: query, mode: 'insensitive' } }
          ]
        }
      })
    ]);

    const results = {
      startups,
      inversores
    };

    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al realizar la búsqueda' });
  }
};
