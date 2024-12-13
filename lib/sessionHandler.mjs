import { v4 as uuidv4 } from 'uuid';
import prisma from './prismaClient.mjs';

export const createSession = async (id_usuario) => {
  try {
    const id_sesion = uuidv4(); // Genera un UUID único para la sesión
    const session = await prisma.sesion.create({
      data: {
        id_sesion,
        id_usuario,
        creado: new Date(),
      },
    });
    return session;
  } catch (error) {
    console.error('Error al crear la sesión:', error);
    return null;
  }
};
