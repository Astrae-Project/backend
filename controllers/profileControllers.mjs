import prisma from "../lib/prismaClient.mjs";

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