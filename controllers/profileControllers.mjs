import prisma from "../lib/prismaClient.mjs";
import jwt from 'jsonwebtoken';

// Endpoint para guardar la información de contacto
export async function saveContact(req, res) {
    const { correo, twitter, linkedin, facebook, instagram, otros } = req.body;
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

        // Guardar o actualizar la información de contacto
        const contacto = await prisma.contacto.upsert({
            where: { id_usuario: userId }, // Si ya existe, actualizar
            update: {
                correo,
                twitter,
                linkedin,
                facebook,
                instagram,
                otros,
            },
            create: {
                id_usuario: userId,
                correo,
                twitter,
                linkedin,
                facebook,
                instagram,
                otros,
            },
        });

        res.json(contacto);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar la información de contacto' });
    }
}

export async function darPuntuacion(req, res) {
    const { id_inversor, id_startup, puntuacion, comentario } = req.body;
    const token = req.cookies.token;

    // Verificar si el token está presente
    if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    // Verificar que el id_inversor y puntuacion estén presentes
    if (!id_inversor || !id_startup || puntuacion === undefined) {
        return res.status(400).json({ error: "El id_inversor y la puntuación son obligatorios" });
    }

    // Validar que la puntuación esté entre 0 y 5, permitiendo hasta dos decimales
    const puntuacionDecimal = parseFloat(puntuacion);
    if (isNaN(puntuacionDecimal) || puntuacionDecimal < 0 || puntuacionDecimal > 5 || !/^\d+(\.\d{1,2})?$/.test(puntuacion.toString())) {
        return res.status(400).json({ error: "La puntuación debe estar entre 0 y 5 con hasta dos decimales" });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId; // ID de la startup
        const role = decodedToken.role;

        // Verificar que el ID de usuario se haya decodificado correctamente
        if (!userId) {
            return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
        }

        // Verificar que el rol sea de startup
        if (role !== 'startup') {
            return res.status(403).json({ message: 'Solo las startups pueden hacer reseñas' });
        }

        // Verificar que el inversor existe
        const inversor = await prisma.inversor.findUnique({
            where: { id: id_inversor },
        });
        if (!inversor) {
            return res.status(404).json({ error: "Inversor no encontrado" });
        }

        // Verificar que la startup existe
        const startup = await prisma.startup.findMany({
            where: { id_usuario: userId }, // Asegúrate de que 'id_usuario' es el campo correcto
        });
        if (!startup) {
            return res.status(404).json({ error: "Startup no encontrada" });
        }

        // Crear la reseña, asociándola tanto a la startup como al inversor
        const nuevaResena = await prisma.resena.create({
            data: {
                puntuacion: parseFloat(puntuacionDecimal.toFixed(2)), // Guardar puntuación con dos decimales
                comentario: comentario || '', // Manejar caso donde comentario sea undefined
                inversor: {
                    connect: { id: id_inversor }, // Conectar la reseña con el inversor
                },
                startup: {
                    connect: { id: id_startup }, // Conectar la reseña con la startup usando id directamente
                },
            },
        });

        return res.status(201).json(nuevaResena);
    } catch (error) {
        console.error("Error al crear la reseña:", error);
        return res.status(500).json({ error: "Error al crear la reseña" });
    }
}
