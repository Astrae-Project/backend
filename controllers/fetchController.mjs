import prisma from "../lib/prismaClient.mjs"; 
import jwt from 'jsonwebtoken';
import { calcularROI } from "../lib/functionCalculations.mjs";
 
export async function datosUsuario (req, res) {
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
        if (role === 'inversor') {
            // Lógica para el inversor
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
                            startup: true,
                        },
                    },
                    portfolio: true,
                    resenas: true
                },
            });

            if (!inversor) {
                return res.status(404).json({ message: 'Inversor no encontrado' });
            }

            // Calcular el sector favorito
            const sectores = inversor.inversiones.reduce((acc, inv) => {
                const sector = inv.startup.sector;
                acc[sector] = (acc[sector] || 0) + 1;
                return acc;
            }, {});

            const sectorFavorito = Object.keys(sectores).reduce((a, b) => (sectores[a] > sectores[b] ? a : b), "Desconocido");

            // Calcular el ROI y otras métricas
            let totalROI = 0;
            let countROI = 0;

            inversor.inversiones = inversor.inversiones.map((inversion) => {
                const montoInvertido = Number(inversion.monto_invertido);
                const valorInversion = Number(inversion.valor);

                if (isNaN(montoInvertido) || isNaN(valorInversion)) {
                    console.error(`Inversión ID ${inversion.id}: Monto Invertido (${inversion.monto_invertido}), Valor (${inversion.valor}) no son números.`);
                    return {
                        ...inversion,
                        esExitosa: false,
                        roi: null,
                    };
                }

                const esExitosa = montoInvertido < valorInversion;
                const roi = calcularROI(montoInvertido, valorInversion);

                if (montoInvertido > 0) {
                    totalROI += roi;
                    countROI++;
                }

                return {
                    ...inversion,
                    esExitosa,
                    roi,
                };
            });

            const totalPuntuacion = inversor.resenas.reduce((acc, resena) => acc + parseFloat(resena.puntuacion), 0);
            const puntuacionMedia = inversor.resenas.length > 0 ? totalPuntuacion / inversor.resenas.length : 0;

            const roiPromedio = countROI > 0 ? totalROI / countROI : 0;

            res.json({
                inversor,
                seguidores: inversor.usuario.seguidores.length,
                suscriptores: inversor.usuario.suscriptores.length,
                inversionesRealizadas: inversor.inversiones.length,
                roiPromedio: roiPromedio.toFixed(2),
                puntuacionMedia: puntuacionMedia.toFixed(2),
                sectorFavorito: sectorFavorito
            });

        } else if (role === 'startup') {
            // Lógica para la startup
            const startup = await prisma.startup.findFirst({
                where: { id_usuario: userId },
                include: {
                    usuario: {
                        select: {
                            seguidores: true,
                            username: true,
                            fecha_creacion: true,
                        },
                    },
                    inversiones: {
                        include: {
                            inversor: true,
                        },
                    },
                },
            });

            if (!startup) {
                return res.status(404).json({ error: 'Startup no encontrada' });
            }

            const recaudacionTotal = startup.inversiones.reduce((total, inversion) => {
                return total + parseFloat(inversion.monto_invertido);
            }, 0);

            res.json({
                startup,
                seguidores: startup.usuario.seguidores.length,
                inversores: startup.inversiones.length,
                recaudacionTotal,
            });
        } else {
            return res.status(401).json({ message: 'Rol no válido' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al recuperar datos del usuario' });
    }
};

export async function usuarioEspecifico(req, res) {
    const { username } = req.params;

    if (!username) {
        return res.status(400).json({ message: 'Username no proporcionado' });
    }

    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;

        if (!userId) {
            return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
        }

        const usuario = await prisma.usuario.findUnique({
            where: { username },
            include: {
                inversores: true,
                startups: true,
            },
        });

        if (!usuario) { 
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Determinar el rol
        const esInversor = usuario.inversores?.length > 0;
        const esStartup = usuario.startups?.length > 0;

        if (esInversor) {
            // Lógica para inversor
            const inversor = await prisma.inversor.findUnique({
                where: { id_usuario: usuario.id },
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
                            eventosCreados: true,
                            eventosParticipados: true
                        },
                    },
                    inversiones: {
                        include: {
                            startup: {
                                select: {
                                    sector: true,
                                },
                            },
                        },
                    },
                    portfolio: true,
                    resenas: true,
                },
            });

            if (!inversor) {
                return res.status(404).json({ message: 'Inversor no encontrado' });
            }

            // Calcular el sector favorito
            const sectores = inversor.inversiones.reduce((acc, inv) => {
                const sector = inv.startup?.sector || 'Desconocido';
                acc[sector] = (acc[sector] || 0) + 1;
                return acc;
            }, {});

            const sectorFavorito = Object.keys(sectores).reduce((a, b) => (sectores[a] > sectores[b] ? a : b), 'Desconocido');

            // Calcular ROI
            let totalROI = 0;
            let countROI = 0;

            inversor.inversiones = inversor.inversiones.map((inversion) => {
                const montoInvertido = Number(inversion.monto_invertido);
                const valorInversion = Number(inversion.valor);

                if (!montoInvertido || !valorInversion || montoInvertido <= 0) {
                    return { ...inversion, esExitosa: false, roi: null };
                }

                const roi = ((valorInversion - montoInvertido) / montoInvertido) * 100;
                totalROI += roi;
                countROI++;

                return { ...inversion, roi };
            });

            const puntuacionMedia =
                inversor.resenas.length > 0
                    ? inversor.resenas.reduce((acc, resena) => acc + parseFloat(resena.puntuacion), 0) /
                      inversor.resenas.length
                    : 0;

            const roiPromedio = countROI > 0 ? totalROI / countROI : 0;

            return res.json({
                inversor,
                seguidores: inversor.usuario.seguidores.length,
                suscriptores: inversor.usuario.suscriptores.length,
                inversionesRealizadas: inversor.inversiones.length,
                roiPromedio: roiPromedio.toFixed(2),
                puntuacionMedia: puntuacionMedia.toFixed(2),
                sectorFavorito,
            });
}
        else if (esStartup) {
            // Lógica para la startup
            const startup = await prisma.startup.findFirst({
                where: { id_usuario: usuario.id },
                include: {
                    usuario: {
                        select: {
                            seguidores: true,
                            username: true,
                            fecha_creacion: true,
                            eventosCreados: true,
                            eventosParticipados: true
                        },
                    },
                    inversiones: {
                        include: {
                            inversor: true,
                        },
                    },
                },
            });

            if (!startup) {
                return res.status(404).json({ message: 'Startup no encontrada' });
            }

            const recaudacionTotal = startup.inversiones.reduce((total, inversion) => total + parseFloat(inversion.monto_invertido), 0);

            return res.json({
                startup,
                seguidores: startup.usuario.seguidores.length,
                inversores: startup.inversiones.length,
                recaudacionTotal,
            });
        }

        return res.status(401).json({ message: 'Rol no válido' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al recuperar datos del usuario' });
    }
}

export async function startupEspecifica (req, res) {
    const token = req.cookies.token;
    const { startupId } = req.params;

    if (!token) {
        return res.status(402).json({ message: 'Token no proporcionado' });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;

        if (!userId) {
            return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
        }

        // Convertir startupId a entero
        const startupIdInt = parseInt(startupId, 10);

        if (isNaN(startupIdInt)) {
            return res.status(400).json({ message: 'ID de startup no válido' });
        }

        // Recuperar datos de la startup por su ID
        const startup = await prisma.startup.findUnique({
            where: { id: startupIdInt }, // Usar el ID como entero
            include: {
                usuario: {
                    select: {
                        seguidores: true,
                        username: true,
                        avatar: true,
                    },
                },
                inversiones: {
                    include: {
                        inversor: {
                            select: {
                                nombre: true,
                            },
                        },
                    },
                },
            },
        }); 

        if (!startup) {
            return res.status(404).json({ error: 'Startup no encontrada' });
        }

        // Calcular la recaudación total
        const recaudacionTotal = startup.inversiones.reduce((total, inversion) => {
            return total + parseFloat(inversion.monto_invertido);
        }, 0);

        res.json({
            id: startup.id,
            nombre: startup.nombre,
            sector: startup.sector,
            plantilla: startup.plantilla,
            estado_financiacion: startup.estado_financiacion,
            porcentaje_disponible: startup.porcentaje_disponible,
            valoracion: startup.valoracion,
            username: startup.usuario.username,
            avatar: startup.usuario.avatar,
            seguidores: startup.usuario.seguidores.length,
            inversores: startup.inversiones.length,
            recaudacionTotal,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al recuperar datos de la startup' });
    }
};


export async function startupsRecomendadas (req, res) {
    try {
        // Obtener startups aleatorias
        const startups = await prisma.startup.findMany({
            take: 10,
            orderBy: {
                id: 'desc',
            },
            include: {
                usuario: {
                    select: {
                        username: true,
                        avatar: true,
                        seguidores: true
                    },
                },
                inversiones: {
                    include: {
                        inversor: true,
                    },
                },
            },
        });

        if (!startups || startups.length === 0) {
            return res.status(404).json({ message: 'No se encontraron startups aleatorias' });
        }

        res.json({ startups });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al recuperar las startups aleatorias' });
    }
};


  export async function startupsSeguidas (req, res)  {
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
        return res.status(403).json({ message: 'Token no proporcionado' });
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
                    include: {
                        usuario: {
                            select: {
                                username: true,
                                avatar: true,
                                seguidores: true,
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
                    include: {
                        usuario: {
                            select: {
                                username: true,
                                avatar: true,
                                seguidores: true,
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
