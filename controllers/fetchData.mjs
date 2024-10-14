import prisma from "../lib/prismaClient.mjs"; 
import jwt from 'jsonwebtoken'; 

export async function datosInversor(req, res) {  // Agrega req y res como parámetros
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

        // Recuperar el inversor y su información
        const inversor = await prisma.inversor.findUnique({
            where: { id: userId }, // Asumiendo que id_usuario es la relación con Usuario
            include: {
                usuario: true, // Incluye datos del usuario
                inversiones: {
                    include: {
                        startup: true, // Incluye datos de la startup relacionada
                    },
                },
                portfolio: true, // Incluye el portfolio
            },
        });

        if (!inversor) {
            return res.status(404).json({ error: 'Inversor no encontrado' });
        }

        res.json(inversor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al recuperar datos del inversor' });
    }
}


export async function datosStartup() {
    
}

export async function datosPortfolio() {
    
}

export async function gruposUsuario() {
    
}
