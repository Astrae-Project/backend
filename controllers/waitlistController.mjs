import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Añadir usuario a la lista de espera
export const addToWaitlist = async (req, res) => {
  console.log('Datos recibidos:', req.body);
  const { correo, nombre, tipo_usuario } = req.body;

  if (!correo || !tipo_usuario) {
    console.log('Faltan campos:', { correo, tipo_usuario });
    return res.status(400).json({ 
      message: 'El correo y el tipo de usuario son campos obligatorios',
      receivedData: req.body
    });
  }

  // Convertir tipo_usuario a minúsculas y validar
  const tipoUsuarioNormalizado = tipo_usuario.toLowerCase();
  if (!['startup', 'investor'].includes(tipoUsuarioNormalizado)) {
    console.log('Tipo de usuario inválido:', tipo_usuario);
    return res.status(400).json({ 
      message: 'Tipo de usuario no válido. Debe ser "startup" o "investor"',
      receivedType: tipo_usuario
    });
  }

  try {
    // Comprobar si el correo ya está en la lista de espera
    const existingUser = await prisma.waitlistUser.findUnique({
      where: { correo }
    });

    if (existingUser) {
      console.log('Correo ya existe:', correo);
      return res.status(400).json({ 
        message: 'Este correo ya está registrado en la lista de espera' 
      });
    }

    // Crear nuevo usuario en la lista de espera
    const newUser = await prisma.waitlistUser.create({
      data: {
        correo,
        nombre,
        tipo_usuario: tipoUsuarioNormalizado
      }
    });

    console.log('Usuario creado exitosamente:', newUser);
    return res.status(201).json({
      message: '¡Bienvenido a la revolución! Te mantendremos informado sobre el lanzamiento.',
      user: {
        id: newUser.id,
        correo: newUser.correo,
        nombre: newUser.nombre,
        tipo_usuario: newUser.tipo_usuario
      }
    });
  } catch (error) {
    console.error('Error al añadir usuario a la lista de espera:', error);
    return res.status(500).json({ 
      message: 'Lo sentimos, ha ocurrido un error. Por favor, inténtalo de nuevo más tarde.',
      error: error.message
    });
  }
};

// Obtener todos los usuarios de la lista de espera (solo para administradores)
export const getWaitlistUsers = async (req, res) => {
  try {
    const users = await prisma.waitlistUser.findMany({
      orderBy: {
        fecha_creacion: 'desc'
      }
    });

    return res.status(200).json(users);
  } catch (error) {
    console.error('Error al obtener usuarios de la lista de espera:', error);
    return res.status(500).json({ 
      message: 'Error al obtener los usuarios de la lista de espera' 
    });
  }
};

// Eliminar usuario de la lista de espera (solo para administradores)
export const removeFromWaitlist = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.waitlistUser.delete({
      where: { id: parseInt(id) }
    });

    return res.status(200).json({
      message: 'Usuario eliminado correctamente de la lista de espera',
      user
    });
  } catch (error) {
    console.error('Error al eliminar usuario de la lista de espera:', error);
    return res.status(500).json({ 
      message: 'Error al eliminar el usuario de la lista de espera' 
    });
  }
}; 