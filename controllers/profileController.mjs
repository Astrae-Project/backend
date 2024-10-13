import jwt from 'jsonwebtoken';
import prisma from "../lib/prismaClient.mjs";

// Función para obtener el perfil del usuario
export const getProfile = async (req, res) => {
    try {
        // Obtener el token del encabezado de autorización
        const token = req.headers.authorization.split(" ")[1];
        
        // Decodificar el token para obtener la información del usuario
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Reemplaza con tu clave secreta
        const userId = decoded.id; // Asegúrate de que el ID esté en el payload del token

        // Obtener el perfil del usuario desde la base de datos
        const userProfile = await getUserById(userId);

        if (!userProfile) {
            return res.status(404).json({ message: "Perfil no encontrado" });
        }

        // Obtener las cuentas relacionadas
        const seguidoresCount = await getFollowersCount(userId);
        const suscriptoresCount = await getSubscribersCount(userId);
        const inversionesCount = await getInvestmentsCount(userId);

        // Devolver solo la información necesaria
        const { nombre, fecha_creacion } = userProfile;

        res.json({
            nombre,
            fechaCreacion: fecha_creacion,
            seguidoresCount,
            suscriptoresCount,
            inversionesCount
        });
    } catch (error) {
        console.error('Error obteniendo el perfil:', error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Función para obtener el perfil del usuario por ID
const getUserById = async (userId) => {
    return await prisma.usuario.findUnique({
        where: { id: userId },
        select: {
            nombre: true,
            fecha_creacion: true
        }
    });
};

// Función para obtener el número de seguidores de un usuario
const getFollowersCount = async (userId) => {
    return await prisma.seguidores.count({
        where: { id_usuario: userId }
    });
};

// Función para obtener el número de suscriptores de un usuario
const getSubscribersCount = async (userId) => {
    return await prisma.suscriptores.count({
        where: { id_usuario: userId }
    });
};

// Función para obtener el número de inversiones de un usuario
const getInvestmentsCount = async (userId) => {
    return await prisma.inversiones.count({
        where: { id_inversor: userId }
    });
};
