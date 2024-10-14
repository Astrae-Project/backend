import prisma from "../lib/prismaClient.mjs"; 
import jwt from 'jsonwebtoken'; 

export const datosInversor = async (req, res) => {
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

        // Recuperar los datos del inversor
        const inversor = await prisma.usuario.findUnique({
            where: { id: userId },
            include: {
                inversores: {
                    include: {
                        inversiones: {
                            include: {
                                startup: true,
                            },
                        },
                        portfolio: true,
                    },
                },
            },
        });

        if (!inversor) {
            return res.status(404).json({ message: 'Inversor no encontrado' });
        }

        res.json(inversor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al recuperar datos del inversor' });
    }
};


export const datosStartup = async (req, res) => {
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

        // Recuperar el startup y su información
        const startup = await prisma.startup.findUnique({
            where: { id: userId }, // Asumiendo que id_usuario es la relación con Usuario
            include: {
                usuario: true,
            },
        });

        if (!startup) {
            return res.status(404).json({ error: 'Startup no encontrada' });
        }

        res.json(startup);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al recuperar datos de la startup' });
    }
};


export async function datosPortfolio(req,res) {
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

        // Recuperar el startup y su información
        const portfolio = await prisma.portfolio.findUnique({
            where: { id: userId }, // Asumiendo que id_usuario es la relación con Usuario
            include: {
                inversor: true,
                inversiones: true
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

export async function gruposUsuario() {
    
}
