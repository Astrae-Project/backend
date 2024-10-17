import prisma from "../lib/prismaClient.mjs"; 
import jwt from 'jsonwebtoken'; 

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

        // Recuperar datos del inversor incluyendo seguidores, suscriptores e inversiones
        const inversor = await prisma.inversor.findFirst({
            where: { id_usuario: userId },
            include: {
                usuario: {
                    select: {
                        seguidores: true, // Incluye seguidores
                        suscriptores: true, // Incluye suscriptores
                        fecha_creacion: true
                    },
                },
                inversiones: {
                    include: {
                        startup: true, // Incluir datos de la startup relacionada
                    },
                },
                portfolio: true,
            },
        });

        if (!inversor) {
            return res.status(404).json({ message: 'Inversor no encontrado' });
        }

        // Enviar los datos al cliente
        res.json({
            inversor,
            seguidores: inversor.usuario.seguidores.length, // Número de seguidores
            suscriptores: inversor.usuario.suscriptores.length, // Número de suscriptores
            inversionesRealizadas: inversor.inversiones.length, // Número de inversiones
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
        const portfolio = await prisma.portfolio.findUnique({
            where: { id_inversor: inversor.id }, // Usa el id del inversor
            include: {
                inversiones: {
                    include: {
                        startup: true, // Incluir datos de las startups relacionadas
                    },
                },
            },
        });

        if (!portfolio) {
            return res.status(404).json({ error: 'Portfolio no encontrado' });
        }

        res.json(portfolio);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al recuperar datos del portfolio' });
    }
}


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

        // Recuperar inversiones recientes
        const inversionesRecientes = await prisma.inversion.findMany({
            where: { id_inversor: inversor.id },
            orderBy: { fecha: 'desc' },
            take: 10, // Limitar a los 10 movimientos más recientes
            select: {
                id: true,
                monto_invertido: true,
                fecha: true,
                startup: {
                    select: {
                        nombre: true, // Incluir el nombre de la startup
                    },
                },
                // Agregar tipo_movimiento como string literal
                tipo_movimiento: {
                    select: {
                        // Asegúrate de que aquí estés utilizando la propiedad correcta
                        tipo_movimiento: true, // Si este campo existe en el modelo Inversion
                    }
                }
            },
        });

        // Recuperar ofertas recientes
        const ofertasRecientes = await prisma.oferta.findMany({
            where: { id_inversor: inversor.id },
            orderBy: { fecha_creacion: 'desc' },
            take: 10,
            select: {
                id: true,
                monto_ofrecido: true,
                fecha_creacion: true,
                estado: true,
                startup: {
                    select: {
                        nombre: true, // Incluir el nombre de la startup
                    },
                },
                // Agregar tipo_movimiento como string literal
                tipo_movimiento: {
                    select: {
                        tipo_movimiento: true, // Si este campo existe en el modelo Oferta
                    }
                }
            },
        });

        // Recuperar eventos recientes
        const eventosRecientes = await prisma.evento.findMany({
            where: { id_inversor: inversor.id },
            orderBy: { fecha_evento: 'desc' },
            take: 10,
            select: {
                id: true,
                descripcion: true,
                fecha_evento: true,
                tipo_evento: true,
                // Agregar tipo_movimiento como string literal
                tipo_movimiento: {
                    select: {
                        tipo_movimiento: true, // Si este campo existe en el modelo Evento
                    }
                }
            },
        });

        // Combinar todos los movimientos en un solo array
        const movimientos = [
            ...inversionesRecientes.map(m => ({
                ...m,
                tipo_movimiento: 'inversion' // Agregar un tipo para cada movimiento
            })),
            ...ofertasRecientes.map(m => ({
                ...m,
                tipo_movimiento: 'oferta' // Agregar un tipo para cada movimiento
            })),
            ...eventosRecientes.map(m => ({
                ...m,
                tipo_movimiento: 'evento' // Agregar un tipo para cada movimiento
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
        return res.status(402).json({ message: 'Token no proporcionado' });
    }

    try {
        // Decodificar el token para obtener el ID del usuario
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;

        if (!userId) {
            return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
        }

        // Buscar el inversor asociado al usuario
        const inversor = await prisma.inversor.findFirst({
            where: { id_usuario: userId },
        });

        // Si no se encuentra el inversor
        if (!inversor) {
            return res.status(404).json({ message: 'Inversor no encontrado' });
        }

        // Obtener eventos relacionados con el inversor
        const eventos = await prisma.evento.findMany({
            where: { id_inversor: inversor.id },
            orderBy: { fecha_evento: 'asc' }, // Ordenar por fecha ascendente
            select: {
                id: true,
                descripcion: true,
                fecha_evento: true,
                tipo_evento: true,
            },
        });

        // Si no hay eventos
        if (eventos.length === 0) {
            return res.status(200).json({ message: 'No hay eventos disponibles para este inversor.' });
        }

        // Responder con los eventos encontrados
        res.json(eventos);
    } catch (error) {
        console.error('Error al obtener eventos:', error);
        res.status(500).json({ error: 'Error al recuperar eventos.' });
    }
}
