import prisma from "../lib/prismaClient.mjs"; 
import jwt from 'jsonwebtoken';
import { calcularROI } from "../lib/functionCalculations.mjs";

// Controlador para obtener datos del inversor
export const datosInversor = async (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(402).json({ message: 'Token no proporcionado' });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;
        const role = decodedToken.role;

        if (!userId) {
            return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
        }

        // Verificar el rol del usuario
        if (role !== 'inversor') {
            return res.status(401).json({ message: 'El usuario no es un inversor' });
        }

        // Recuperar datos del inversor
        const inversor = await prisma.inversor.findFirst({
            where: { id_usuario: userId },
            include: {
                usuario: {
                    select: {
                        username: true,
                        seguidores: true,
                        suscriptores: true,
                        fecha_creacion: true,
                        avatar: true,
                        pais: true,
                        ciudad: true,
                    },
                },
                inversiones: {
                    include: {
                        startup: true, // Para obtener el sector y valor de cada startup
                    },
                },
                portfolio: true,
                resenas: true
            },
        });

        if (!inversor) {
            return res.status(404).json({ message: 'Inversor no encontrado' });
        }

        // Calcular el sector favorito basado en las inversiones
        const sectores = inversor.inversiones.reduce((acc, inv) => {
            const sector = inv.startup.sector;
            acc[sector] = (acc[sector] || 0) + 1;
            return acc;
        }, {});

        // Obtener el sector con más inversiones
        const sectorFavorito = Object.keys(sectores).reduce((a, b) => (sectores[a] > sectores[b] ? a : b), "Desconocido");

        // Añadir el sector favorito al objeto inversor
        inversor.sector_favorito = sectorFavorito;

        // Inicializar variables para el cálculo del ROI
        let totalROI = 0;
        let countROI = 0;

        // Calcular si cada inversión es exitosa y el ROI
        inversor.inversiones = inversor.inversiones.map((inversion) => {
            // Asegurarse de que estos valores sean numéricos
            const montoInvertido = Number(inversion.monto_invertido);
            const valorInversion = Number(inversion.valor);

            // Comprobar si los valores se han convertido correctamente
            if (isNaN(montoInvertido) || isNaN(valorInversion)) {
                console.error(`Inversión ID ${inversion.id}: Monto Invertido (${inversion.monto_invertido}), Valor (${inversion.valor}) no son números.`);
                return {
                    ...inversion,
                    esExitosa: false,
                    roi: null, // O puedes usar 0 o algún valor por defecto
                };
            }

            // Verificar si la inversión es exitosa
            const esExitosa = montoInvertido < valorInversion;

            // Calcular el ROI usando la función externa
            const roi = calcularROI(montoInvertido, valorInversion);

            // Sumar al total del ROI y aumentar el conteo solo si se ha invertido dinero
            if (montoInvertido > 0) {
                totalROI += roi;
                countROI++;
            }

            return {
                ...inversion,
                esExitosa,
                roi, // Añadir el ROI a la inversión
            };
        });

        // Calcular puntuación media
        const totalPuntuacion = inversor.resenas.reduce((acc, resena) => acc + parseFloat(resena.puntuacion), 0);
        const puntuacionMedia = inversor.resenas.length > 0 ? totalPuntuacion / inversor.resenas.length : 0;
        
        // Calcular el ROI promedio
        const roiPromedio = countROI > 0 ? totalROI / countROI : 0;

        // Enviar los datos al cliente
        res.json({
            inversor,
            seguidores: inversor.usuario.seguidores.length,
            suscriptores: inversor.usuario.suscriptores.length,
            inversionesRealizadas: inversor.inversiones.length,
            roiPromedio: roiPromedio.toFixed(2), // Incluye el ROI promedio
            puntuacionMedia: puntuacionMedia.toFixed(2),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al recuperar datos del inversor' });
    }
};

export const datosStartup = async (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(402).json({ message: 'Token no proporcionado' });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;
        const role = decodedToken.role;

        if (!userId) {
            return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
        }

        // Verificar el rol del usuario
        if (role !== 'startup') {
            return res.status(401).json({ message: 'El usuario no es una startup' });
        }

        // Recuperar datos de la startup incluyendo seguidores, inversores y recaudación total
        const startup = await prisma.startup.findFirst({
            where: { id_usuario: userId },
            include: {
                usuario: {
                    select: {
                        seguidores: true, // Incluye seguidores
                        username: true
                    },
                },
                inversiones: {
                    include: {
                        inversor: true, // Incluir datos de los inversores
                    },
                },
            },
        });

        if (!startup) {
            return res.status(404).json({ error: 'Startup no encontrada' });
        }

        // Calcular la recaudación total sumando todas las inversiones
        const recaudacionTotal = startup.inversiones.reduce((total, inversion) => {
            return total + parseFloat(inversion.monto_invertido);
        }, 0);

        // Enviar los datos al cliente
        res.json({
            startup,
            seguidores: startup.usuario.seguidores.length, // Número de seguidores
            inversores: startup.inversiones.length, // Número de inversores
            recaudacionTotal, // Total recaudado por la startup
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al recuperar datos de la startup' });
    }
};

export const startupsAleatorias = async (req, res) => {
    try {
      // Obtener startups aleatorias
      const startups = await prisma.startup.findMany({
        take: 10, // Número de startups aleatorias a devolver
        orderBy: {
          // Puedes añadir lógica de orden aquí si lo necesitas
          id: 'desc', // Solo un ejemplo de orden
        },

        include: {
            usuario: {
                select: {
                    username: true,
                    avatar: true
                },
            },
            inversiones: {
                include: {
                    inversor: true, // Incluir datos de los inversores
                },
            },
        },

      });
  
      if (!startups || startups.length === 0) {
        return res.status(404).json({ message: 'No se encontraron startups aleatorias' });
      }
  
      // Devolver las startups aleatorias
      res.json({ startups });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al recuperar las startups aleatorias' });
    }
  };

  export const startupsSeguidas = async (req, res) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(402).json({ message: 'Token no proporcionado' });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;

        if (!userId) {
            return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
        }
    
      // Obtener startups seguidas por el usuario
      const startups = await prisma.startup.findMany({
        where: {
          usuario: {
            seguidos: {
              some: {
                seguidor: { id: userId }, // Filtrar por los usuarios seguidos por el usuario actual
              },
            },
          },
        },
        take: 10, // Limitar el número de resultados
        orderBy: {
          id: 'desc', // Ordenar según tus necesidades
        },
        include: {
          usuario: {
            select: {
              username: true,
              avatar: true,
            },
          },
          inversiones: {
            include: {
              inversor: true, // Incluir datos de los inversores
            },
          },
        },
      });
  
      if (!startups || startups.length === 0) {
        return res.status(404).json({ message: 'No se encontraron startups seguidas' });
      }
  
      // Devolver las startups seguidas
      res.json({ startups });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al recuperar las startups seguidas' });
    }
  };
  

export async function datosPortfolio(req, res) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(402).json({ message: 'Token no proporcionado' });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;

        if (!userId) {
            return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
        }

        // Primero, buscar el inversor asociado al usuario
        const inversor = await prisma.inversor.findFirst({
            where: { id_usuario: userId }, // Cambiar esto según cómo estés manejando la relación
        });

        if (!inversor) {
            return res.status(404).json({ message: 'Inversor no encontrado' });
        }

        // Luego, buscar el portfolio asociado al inversor
        const portfolio = await prisma.portfolio.findFirst({
            where: { id_inversor: inversor.id }, // Usa el id del inversor
            include: {
                inversiones: {
                    include: {
                        startup: {
                            select: {
                                nombre: true,
                                valoracion: true,
                                usuario: { // Incluir el usuario de la startup
                                    select: {
                                        avatar: true, // Seleccionar el avatar
                                        username: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!portfolio) {
            return res.status(404).json({ error: 'Portfolio no encontrado' });
        }

        // Calcular el cambio porcentual para cada inversión
        const inversionesConCambios = portfolio.inversiones.map((inversion) => {
            const cambioPorcentual = calcularCambioPorcentual(inversion.monto_invertido, inversion.valor);
            return {
                ...inversion,
                cambio_porcentual: cambioPorcentual, // Agregar el cambio porcentual a cada inversión
            };
        });

        // Ordenar las inversiones por id (de menor a mayor)
        inversionesConCambios.sort((a, b) => a.id - b.id);

        // Devolver el portfolio con inversiones y cambios porcentuales
        res.json({
            ...portfolio,
            inversiones: inversionesConCambios,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al recuperar datos del portfolio' });
    }
}

// Función para calcular el cambio porcentual de una inversión
const calcularCambioPorcentual = (montoInvertido, valorActual) => {
    return ((valorActual - montoInvertido) / montoInvertido) * 100; // Retorna el cambio porcentual
};


export async function gruposUsuario(req, res) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(402).json({ message: 'Token no proporcionado' });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;

        if (!userId) {
            return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
        }

        // Recuperar los grupos a los que pertenece el usuario
        const grupos = await prisma.grupoUsuario.findMany({
            where: { id_usuario: userId }, // Asumiendo que 'usuarioId' es el campo que relaciona a Usuario con GrupoUsuario
            include: {
                grupo: true, // Incluir información del grupo
            },
        });

        if (!grupos.length) {
            return res.status(404).json({ error: 'No se encontraron grupos para este usuario' });
        }

        res.json(grupos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al recuperar datos de grupos del usuario' });
    }
}

export async function movimientosRecientes(req, res) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(402).json({ message: 'Token no proporcionado' });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;

        if (!userId) {
            return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
        }

        // Buscar el inversor asociado al usuario
        const inversor = await prisma.inversor.findFirst({
            where: { id_usuario: userId },
        });

        if (!inversor) {
            return res.status(404).json({ message: 'Inversor no encontrado' });
        }

        // Recuperar inversiones recientes con el usuario de la startup
        const inversionesRecientes = await prisma.inversion.findMany({
            where: { id_inversor: inversor.id },
            orderBy: { fecha: 'desc' },
            take: 10,
            select: {
                id: true,
                monto_invertido: true,
                porcentaje_adquirido: true,
                fecha: true,
                startup: {
                    select: {
                        nombre: true,
                        valoracion: true,
                        usuario: {
                            select: {
                                username: true,
                                avatar: true,
                            },
                        },
                    },
                },
            },
        });

        // Recuperar ofertas recientes con el usuario de la startup
        const ofertasRecientes = await prisma.oferta.findMany({
            where: { id_inversor: inversor.id },
            orderBy: { fecha_creacion: 'desc' },
            take: 10,
            select: {
                id: true,
                monto_ofrecido: true,
                porcentaje_ofrecido: true,
                fecha_creacion: true,
                estado: true,
                startup: {
                    select: {
                        nombre: true,
                        usuario: {
                            select: {
                                username: true,
                                avatar: true,
                            },
                        },
                    },
                },
            },
        });

        // Recuperar eventos recientes creados por el usuario
        const eventosCreadosRecientes = await prisma.evento.findMany({
            where: { id_usuario: userId },
            orderBy: { fecha_evento: 'desc' },
            take: 10,
            select: {
                id: true,
                titulo: true,
                descripcion: true,
                fecha_evento: true,
                tipo: true,
                fecha_creacion: true,
                creador: {
                    select: {
                        username: true,
                        avatar: true,
                    },
                },
                participantes: {
                    where: {
                        id_usuario: userId,
                    },
                    select: {
                        fecha_union: true,
                        usuario: true,
                    },
                },
            },
        });

        const eventosParticipadosRecientes = await prisma.evento.findMany({
            where: {
                participantes: {
                    some: {
                        id_usuario: userId,
                    },
                },
                id_usuario: {
                    not: userId, // Excluir eventos creados por el usuario
                },
            },
            orderBy: { fecha_evento: 'desc' },
            take: 10,
            select: {
                id: true,
                titulo: true,
                descripcion: true,
                fecha_evento: true,
                tipo: true,
                creador: {
                    select: {
                        username: true,
                        avatar: true,
                    },
                },
                participantes: {
                    where: {
                        id_usuario: userId,
                    },
                    select: {
                        fecha_union: true,
                        usuario: true,
                    },
                },
            },
        });
        
        // Combinar todos los movimientos en un solo array
        const movimientos = [
            ...inversionesRecientes.map(m => ({
                ...m,
                tipo_movimiento: 'inversion',
                avatar: m.startup.usuario.avatar,
            })),
            ...ofertasRecientes.map(m => ({
                ...m,
                tipo_movimiento: 'oferta',
                avatar: m.startup.usuario.avatar,
            })),
            ...eventosCreadosRecientes.map(m => ({
                ...m,
                tipo_movimiento: 'evento',
                avatar: m.creador.avatar,
            })),
            ...eventosParticipadosRecientes.map(m => ({
                ...m,
                tipo_movimiento: 'evento',
                avatar: m.creador.avatar,
            })),
        ];

        // Ordenar los movimientos por fecha (más reciente primero)
        const movimientosOrdenados = movimientos.sort((a, b) => {
            return new Date(b.fecha || b.fecha_creacion || b.fecha_evento) - new Date(a.fecha || a.fecha_creacion || a.fecha_evento);
        });

        // Tomar los últimos 10 movimientos
        const ultimosMovimientos = movimientosOrdenados.slice(0, 10);

        // Enviar respuesta
        res.json(ultimosMovimientos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al recuperar movimientos recientes' });
    }
}


export async function obtenerContacto(req, res) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(402).json({ message: 'Token no proporcionado' });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;

        if (!userId) {
            return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
        }

        // Obtener la información de contacto
        const contacto = await prisma.contacto.findFirst({
            where: { id_usuario: userId },
        });

        if (!contacto) {
            return res.status(404).json({ message: 'Información de contacto no encontrada' });
        }

        res.json(contacto);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la información de contacto' });
    }
}

export async function obtenerEventos(req, res) {
    const token = req.cookies.token;
  
    // Verificar que se proporciona el token
    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }
  
    try {
      // Decodificar el token para obtener el ID del usuario
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decodedToken.userId;
  
      if (!userId) {
        return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
      }
  
      // Obtener eventos en los que el usuario es el creador o participante
      const eventosCreados = await prisma.evento.findMany({
        where: { id_usuario: userId },
        orderBy: { fecha_evento: 'asc' },
        select: {
          id: true,
          titulo: true,
          descripcion: true,
          fecha_evento: true,
          tipo: true,
          tipo_movimiento: true,
          creador: true,
        },
      });
  
      // Obtener eventos en los que el usuario participa (pero no es el creador)
      const eventosParticipando = await prisma.evento.findMany({
        where: {
          participantes: {
            some: {
              id_usuario: userId,
            },
          },
          id_usuario: { not: userId }, // Excluye los eventos creados por el usuario
        },
        orderBy: { fecha_evento: 'asc' },
        select: {
          id: true,
          titulo: true,
          descripcion: true,
          fecha_evento: true,
          tipo: true,
          tipo_movimiento: true,
          creador: true,
        },
      });
  
      // Marcar los eventos en los que el usuario es creador o participante
      const eventos = [
        ...eventosCreados.map(evento => ({ ...evento, esCreador: true, esParticipante: false })),
        ...eventosParticipando.map(evento => ({ ...evento, esCreador: false, esParticipante: true })),
      ];
  
      // Si no hay eventos
      if (eventos.length === 0) {
        return res.status(200).json({ message: 'No hay eventos disponibles para este usuario.' });
      }
  
      // Responder con los eventos encontrados
      res.json(eventos);
    } catch (error) {
      console.error('Error al obtener eventos:', error);
      res.status(500).json({ error: 'Error al recuperar eventos.' });
    }
  }
  