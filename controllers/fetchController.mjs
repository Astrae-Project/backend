import prisma from "../lib/prismaClient.mjs"; 
import jwt from 'jsonwebtoken';
import { calcularROI } from "../lib/functionCalculations.mjs";
 
export async function datosUsuario (req, res) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
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
                            id: true,
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
                            id: true,
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
            return res.status(403).json({ message: 'Rol no válido' });
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
        const role = decodedToken.role;

        if (!userId) {
            return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
        }

        if (!role) {
            return res.status(401).json({ message: 'Rol no encontrado' });
        }

        const usuario = await prisma.usuario.findUnique({
            where: { username },
            include: {
                inversores: true,
                startups: true,
                Contacto: true,
                grupos: {
                    include: {
                        grupo: true,
                    },
                },
            },
        });

        if (!usuario) { 
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const esInversor = usuario.inversores?.length > 0;
        const esStartup = usuario.startups?.length > 0;

        if (esInversor) {
            const inversor = await prisma.inversor.findUnique({
                where: { id_usuario: usuario.id },
                include: {
                    usuario: {
                        select: {
                            id: true,
                            username: true,
                            seguidores: true,
                            suscriptores: true,
                            avatar: true,
                            Contacto: true,
                            fecha_creacion: true,
                            ciudad: true,
                            pais: true,
                            grupos: {
                                include: {
                                    grupo: true,
                                },
                            },

                        },
                    },
                    inversiones: {
                        include: {
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
                    },
                    portfolio: true,
                    resenas: true,
                    portfolio_historico: true,
                },
            });
        
            if (!inversor) {
                return res.status(404).json({ message: 'Inversor no encontrado' });
            }
                
            const eventosCreados = await prisma.evento.findMany({
                where: {
                    creador: { username: username },
                },
                orderBy: { fecha_evento: 'asc' },
                select: {
                    id: true,
                    titulo: true,
                    descripcion: true,
                    fecha_evento: true,
                    tipo: true,
                    tipo_movimiento: true,
                    creador: {
                        select: {
                            username: true,
                            avatar: true,
                        },
                    },
                },
            });

            const eventosParticipando = await prisma.evento.findMany({
                where: {
                    participantes: {
                        some: {
                          usuario: { username: username },
                        },
                    },
                },
                orderBy: { fecha_evento: 'asc' },
                select: {
                    id: true,
                    titulo: true,
                    descripcion: true,
                    fecha_evento: true,
                    tipo: true,
                    tipo_movimiento: true,
                    creador: {
                        select: {
                            username: true,
                            avatar: true,
                        },
                    },
                },
            });

            const eventos = [
                ...eventosCreados.map(evento => ({ ...evento, esCreador: true, esParticipante: false })),
                ...eventosParticipando.map(evento => ({ ...evento, esCreador: false, esParticipante: true })),
            ];

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
        const ultimosMovimientos = movimientosOrdenados.slice(0, 15);
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

            return res.json({
                inversor,
                eventos,
                ultimosMovimientos,
                sectorFavorito,
                seguidores: inversor.usuario.seguidores.length,
                suscriptores: inversor.usuario.suscriptores.length,
                inversionesRealizadas: inversor.inversiones.length,
                roiPromedio: roiPromedio.toFixed(2),
                puntuacionMedia: puntuacionMedia, // Asegúrate de calcular la puntuación media si lo necesitas
                grupos: inversor.usuario.grupos,
                contacto: inversor.usuario.Contacto,
            });
        } else if (esStartup) {
            const startup = await prisma.startup.findFirst({
                where: { id_usuario: usuario.id },
                include: {
                    usuario: {
                        select: {
                            id: true,
                            seguidores: true,
                            username: true,
                            Contacto: true,
                            fecha_creacion: true,
                            ciudad: true,
                            pais: true,
                            avatar: true,
                            grupos: {
                                include: {
                                    grupo: true,
                                }, 
                            }
                        },
                    },
                    inversiones: true,
                    valoracion_historica: true,
                },
            });

            if (!startup) {
                return res.status(404).json({ message: 'Startup no encontrada' });
            }

            const recaudacionTotal = startup.inversiones.reduce(
                (total, inversion) => total + parseFloat(inversion.monto_invertido), 
                0
            );

            const eventosCreados = await prisma.evento.findMany({
                where: {
                    creador: { username: username },
                },
                orderBy: { fecha_evento: 'asc' },
                select: {
                    id: true,
                    titulo: true,
                    descripcion: true,
                    fecha_evento: true,
                    tipo: true,
                    tipo_movimiento: true,
                    creador: {
                        select: {
                            username: true,
                            avatar: true,
                        },
                    },
                },
            });

            const eventosParticipando = await prisma.evento.findMany({
                where: {
                    participantes: {
                        some: {
                          usuario: { username: username },
                        },
                    },
                },
                orderBy: { fecha_evento: 'asc' },
                select: {
                    id: true,
                    titulo: true,
                    descripcion: true,
                    fecha_evento: true,
                    tipo: true,
                    tipo_movimiento: true,
                    creador: {
                        select: {
                            username: true,
                            avatar: true,
                        },
                    },
                },
            });

            const eventos = [
                ...eventosCreados.map(evento => ({ ...evento, esCreador: true, esParticipante: false })),
                ...eventosParticipando.map(evento => ({ ...evento, esCreador: false, esParticipante: true })),
            ];

            return res.json({
                startup,
                eventos,
                seguidores: startup.usuario.seguidores.length,
                inversores: startup.inversiones.length,
                recaudacionTotal,
                contacto: startup.usuario.Contacto,
                grupos: startup.usuario.grupos,
            });
        }

        return res.status(400).json({ message: 'Usuario no tiene ni rol de inversor ni de startup' });
    } catch (error) {
        console.error('Error en usuarioEspecifico:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}

export async function todosUsuarios (req, res) {
    try {
        // Obtener startups aleatorias
        const usuarios = await prisma.usuario.findMany({
            orderBy: {
                id: 'desc',
            },
            include: {
                inversores: true,
                startups: true,
                Contacto: true,
            },
        });

        if (!usuarios || usuarios.length === 0) {
            return res.status(404).json({ message: 'No se encontraron usuarios' });
        }

        res.json({ usuarios });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al recuperar las usuarios' });
    }
};

export async function todasStartups (req, res) {
    try {
        // Obtener startups aleatorias
        const startups = await prisma.startup.findMany({
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
            return res.status(404).json({ message: 'No se encontraron startups' });
        }

        res.json({ startups });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al recuperar las startups' });
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

export async function startupsSeguidas(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
      }
  
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decodedToken.userId;
      if (!userId) {
        return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
      }
  
      // Buscar el usuario logueado e incluir sus seguidos cuyo usuario seguido tenga rol "startup"
      const usuarioConSeguidos = await prisma.usuario.findUnique({
        where: { id: userId },
        include: {
          seguidos: {
            where: {
              seguido: {
                rol: 'startup' // Filtro: solo los seguidos con rol startup
              }
            },
            take: 10, // Limitar resultados
            orderBy: {
              id: 'desc'
            },
            select: {
              // Se selecciona la información del usuario seguido
              seguido: {
                select: {
                  startups: true,
                  username: true,
                  avatar: true,
                }
              }
            }
          }
        }
      });
  
      if (!usuarioConSeguidos || usuarioConSeguidos.seguidos.length === 0) {
        return res.status(404).json({ message: 'No se encontraron startups seguidas' });
      }
  
      // Extraer la información del usuario seguido, eliminando el nivel de "seguido"
      const startups = usuarioConSeguidos.seguidos.map(s => s.seguido);
  
      res.json({ startups });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al recuperar las startups seguidas' });
    }
  };
  

export async function datosPortfolio(req, res) {
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
                                sector: true,
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
        return res.status(401).json({ message: 'Token no proporcionado' });
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

export async function todosGrupos (req, res) {
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

        // Recuperar los grupos a los que pertenece el usuario
        const grupos = await prisma.grupo.findMany({
            include: {
                usuarios: true,
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
        return res.status(401).json({ message: 'Token no proporcionado' });
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

export async function movimientosSeguidos(req, res) {
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

        const seguidos = await prisma.seguimiento.findMany({
            where: { id_seguidor: userId },
            select: { id_seguido: true },
        });

        const suscritos = await prisma.suscripcion.findMany({
            where: { id_suscriptor: userId, estado: 'ACTIVA' },
            select: { id_suscrito: true },
        });

        // Aquí agregamos la lógica para buscar inversores y startups
        const cuentasRelacionadasIds = [];

        // Verificar si las cuentas seguidas son inversores o startups
        const seguidosIds = seguidos.map((seguido) => seguido.id_seguido);
        const suscritosIds = suscritos.map((suscrito) => suscrito.id_suscrito);

        // Combine los usuarios seguidos y suscritos
        const todasLasCuentasIds = [...seguidosIds, ...suscritosIds];

        // Verificar si las cuentas seguidas o suscritas son inversores o startups
        for (const cuentaId of todasLasCuentasIds) {
            const usuario = await prisma.usuario.findUnique({
                where: { id: cuentaId },
                select: { rol: true },
            });

            if (usuario && usuario.rol === 'inversor') {
                // Si es un inversor, buscar su id_inversor
                const inversor = await prisma.inversor.findUnique({
                    where: { id_usuario: cuentaId },
                    select: { id: true },
                });
                if (inversor) {
                    cuentasRelacionadasIds.push(inversor.id);
                }
            } else {
                // Si no es inversor, buscar su id_startup
                const startup = await prisma.startup.findUnique({
                    where: { id_usuario: cuentaId },
                    select: { id: true },
                });
                if (startup) {
                    cuentasRelacionadasIds.push(startup.id);
                }
            }
        }

        const cuentasRelacionadasIdsUnicas = [...new Set(cuentasRelacionadasIds)];

        if (cuentasRelacionadasIdsUnicas.length === 0) {
            return res.json({ movimientos: [] });
        }

        // Recuperar inversiones recientes
        const inversionesRecientes = await prisma.inversion.findMany({
            where: {
                OR: [
                    { id_inversor: { in: cuentasRelacionadasIdsUnicas } },  // Buscar por id_inversor
                    { id_startup: { in: cuentasRelacionadasIdsUnicas } },   // O buscar por id_startup
                ],
            },
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
                inversor: {
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

        // Recuperar ofertas recientes
        const ofertasRecientes = await prisma.oferta.findMany({
            where: {
                OR: [
                    { id_inversor: { in: cuentasRelacionadasIdsUnicas } },  // Buscar por id_inversor (cuando hace la oferta)
                    { id_startup: { in: cuentasRelacionadasIdsUnicas } },   // O buscar por id_startup (cuando recibe la oferta)
                ],
            },
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
                inversor: {
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

        // Recuperar eventos recientes creados
        const eventosCreadosRecientes = await prisma.evento.findMany({
            where: { id_usuario: { in: cuentasRelacionadasIdsUnicas } },
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
                        id_usuario: { in: cuentasRelacionadasIdsUnicas },
                    },
                    select: {
                        fecha_union: true,
                        usuario: true,
                    },
                },
            },
        });

        // Recuperar eventos recientes participados
        const eventosParticipadosRecientes = await prisma.evento.findMany({
            where: {
                participantes: {
                    some: {
                        id_usuario: { in: cuentasRelacionadasIdsUnicas },
                    },
                },
                id_usuario: {
                    not: { in: cuentasRelacionadasIdsUnicas }, // Excluir eventos creados por el usuario
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
                        id_usuario: { in: cuentasRelacionadasIdsUnicas },
                    },
                    select: {
                        fecha_union: true,
                        usuario: true,
                    },
                },
            },
        });

        // Aquí agregamos la lógica para verificar si el 'seguido' es un inversor o una startup
        const movimientos = [
            ...inversionesRecientes.map((m) => {
                // Determinamos el autor comparando el id_usuario con id_seguido
                const autor = seguidos.some(seguido => seguido.id_seguido === m.inversor.id_usuario) ? 'inversor' :
                            seguidos.some(seguido => seguido.id_seguido === m.startup.id_usuario) ? 'startup' : 'desconocido';

                return {
                    ...m,
                    tipo_movimiento: 'inversion',
                    autor: autor,  // Asignamos el autor según el rol
                };
            }),
            ...ofertasRecientes.map((m) => {
                // Determinamos el autor comparando el id_usuario con id_seguido
                const autor = seguidos.some(seguido => seguido.id_seguido === m.inversor.id_usuario) ? 'inversor' :
                            seguidos.some(seguido => seguido.id_seguido === m.startup.id_usuario) ? 'startup' : 'desconocido';

                return {
                    ...m,
                    tipo_movimiento: 'oferta',
                    autor: autor,  // Asignamos el autor según el rol
                };
            }),
            ...eventosCreadosRecientes.map((m) => {
                return {
                    ...m,
                    tipo_movimiento: 'evento',
                };
            }),
            ...eventosParticipadosRecientes.map((m) => {
                return {
                    ...m,
                    tipo_movimiento: 'evento',
                };
            }),
        ];

        // Ordenar movimientos
        const movimientosOrdenados = movimientos.sort((a, b) => {
            return new Date(b.fecha || b.fecha_creacion || b.fecha_evento) - new Date(a.fecha || a.fecha_creacion || a.fecha_evento);
        });

        // Tomar los últimos 10 movimientos
        const ultimosMovimientos = movimientosOrdenados.slice(0, 10);

        res.json(ultimosMovimientos);
    } catch (error) {
        console.error('Error en movimientosSeguidos:', error);
        res.status(500).json({ error: 'Error al recuperar movimientos recientes' });
    }
}

export async function movimientosSinEventos(req, res) {
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

export async function movimientosInversionStartups(req, res) {
    const token = req.cookies.token;
    const usernameFromRequest = req.query.username || req.body.username;
  
    try {
      let userId = null;
  
      if (token) {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        userId = decodedToken.userId;
      }
  
      let usuario = null;
  
      // Si se proporciona username, buscar por username
      if (usernameFromRequest) {
        usuario = await prisma.usuario.findUnique({
          where: { username: usernameFromRequest },
        });
  
        if (!usuario) {
          return res.status(404).json({ message: 'Usuario no encontrado por username' });
        }
      }
      // Si no hay username pero sí token, buscar por userId
      else if (userId) {
        usuario = await prisma.usuario.findUnique({
          where: { id: userId },
        });
  
        if (!usuario) {
          return res.status(404).json({ message: 'Usuario no encontrado por ID' });
        }
      } else {
        return res.status(401).json({ message: 'No se proporcionó ni token ni username' });
      }
  
      // Buscar la startup asociada al usuario
      const startup = await prisma.startup.findFirst({
        where: { id_usuario: usuario.id },
      });
  
      if (!startup) {
        return res.status(404).json({ message: 'Startup no encontrada' });
      }
  
      // Obtener inversiones recientes
      const inversionesRecientes = await prisma.inversion.findMany({
        where: { id_startup: startup.id },
        orderBy: { fecha: 'desc' },
        take: 10,
        select: {
          id: true,
          monto_invertido: true,
          porcentaje_adquirido: true,
          fecha: true,
          inversor: {
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
  
      const movimientos = inversionesRecientes.map(m => ({
        ...m,
        tipo_movimiento: 'inversion',
        avatar: m.inversor.usuario.avatar,
      }));
  
      const movimientosOrdenados = movimientos.sort((a, b) => {
        return new Date(b.fecha || b.fecha_creacion || b.fecha_evento) - new Date(a.fecha || a.fecha_creacion || a.fecha_evento);
      });
  
      const ultimosMovimientos = movimientosOrdenados.slice(0, 10);
  
      res.json(ultimosMovimientos);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al recuperar movimientos recientes' });
    }
  }
  
export async function obtenerContacto(req, res) {
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

export async function obtenerOferta(req, res) {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ message: "No autorizado. Token no proporcionado." });
        }

        // Decodificar token
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken?.userId;
        const userRole = decodedToken?.role; // Asegúrate de que el token incluye el rol

        if (!userId || typeof userId !== "number") {
            return res.status(400).json({ message: "ID de usuario no válido." });
        }

        let ofertas;

        if (userRole === "startup") {
            // Buscar ofertas recibidas por sus startups
            ofertas = await prisma.oferta.findMany({
                where: {
                    startup: {
                        id_usuario: userId, // Solo startups del usuario
                    },
                    estado: "pendiente",
                },
                include: {
                    inversor: {
                        include: {
                            usuario: true,
                        },
                    },
                    startup: {
                        include: {
                            usuario: true,
                        },
                    },
                    escrow: true,
                },
            });
        } else if (userRole === "inversor") {
            // Buscar ofertas hechas por el inversor
            ofertas = await prisma.oferta.findMany({
                where: {
                    id_inversor: userId, // Ofertas hechas por este inversor
                },
                include: {
                    inversor: {
                        include: {
                            usuario: true,
                        },
                    },
                    startup: {
                        include: {
                            usuario: true,
                        },
                    },
                    escrow: true,
                },
                orderBy: {
                    fecha_creacion: 'desc', // Ordenar de más nueva a más vieja
                },
            });
        } else {
            return res.status(403).json({ message: "Acceso denegado. Rol no válido." });
        }

        if (!ofertas || ofertas.length === 0) {
            return res.status(404).json({ message: "No se encontraron ofertas." });
        }

        return res.json(ofertas);
    } catch (error) {
        console.error("Error al obtener ofertas:", error.message);
        return res.status(500).json({ error: "Error interno del servidor." });
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

export async function obtenerHistoricos(req, res) {
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
                    portfolio_historico: true,
                },
            });

            if (!inversor) {
                return res.status(404).json({ message: 'Inversor no encontrado' });
            }

            res.json({
                historico: inversor.portfolio_historico,
            });

        } else if (role === 'startup') {
            // Lógica para la startup
            const startup = await prisma.startup.findFirst({
                where: { id_usuario: userId },
                include: {
                    valoracion_historica: true,
                },
            });

            if (!startup) {
                return res.status(404).json({ error: 'Startup no encontrada' });
            }

            res.json({
                historico: startup.valoracion_historica,
            });
        } else {
            return res.status(403).json({ message: 'Rol no válido' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al recuperar datos del usuario' });
    }
  };
    
// Obtener notificaciones de un usuario
  export async function obtenerNotificaciones(req, res) {
    const token = req.cookies.token;
  
    if (!token) {
      return res.status(401).json({ message: "No autorizado" });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
  
      const notificaciones = await prisma.notificacion.findMany({
        where: {
            id_usuario: userId,
            leido: false,
          },
          orderBy: {
            fecha_creacion: "desc",
          },
          take: 5,
        });    
  
      res.json(notificaciones);
    } catch (error) {
      console.error("Error al obtener notificaciones:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }  
  