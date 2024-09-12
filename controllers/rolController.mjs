import prisma from '../lib/prismaClient.mjs'; // Asegúrate de que la importación de Prisma está correcta
import jwt from 'jsonwebtoken';

export const selectRole = async (req, res) => {
  const userId = parseInt(req.params.id, 10); // Asegúrate de que el ID es un número
  const { rol } = req.body;

  // Validar el rol recibido
  if (!rol || (rol !== 'inversor' && rol !== 'startup')) {
    return res.status(400).json({ message: 'Selecciona un rol válido' });
  }

  try {
    // Comprobar si el usuario ya existe
    const user = await prisma.usuario.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar si ya tiene un rol asignado
    if (user.rol) {
      return res.status(400).json({ message: 'El usuario ya tiene un rol asignado' });
    }

    // Actualizar el rol del usuario en la base de datos
    await prisma.usuario.update({
      where: { id: userId },
      data: { rol: rol }
    });

    // Redirigir al siguiente paso según el rol
    if (rol === 'inversor') {
      return res.json({ message: 'Rol seleccionado: inversor', redirectUrl: `/crear-inversor/${userId}` });
    } else if (rol === 'startup') {
      return res.json({ message: 'Rol seleccionado: startup', redirectUrl: `/crear-startup/${userId}` });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al seleccionar el rol' });
  }
};

export const investorRole = async (req, res) => {
  const userId = parseInt(req.params.id, 10); // Asegúrate de que el ID es un número
  const { nombre_inversor, perfil_inversion } = req.body;

  if (!nombre_inversor || !perfil_inversion) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  try {
    // Verificar si el inversor ya tiene un perfil
    const existingInversor = await prisma.inversor.findUnique({
      where: { id: userId }
    });

    if (existingInversor) {
      return res.status(400).json({ message: 'El perfil de inversor ya existe para este usuario' });
    }

    // Insertar el inversor en la base de datos
    const newInversor = await prisma.inversor.create({
      data: {
        id_usuario: userId,
        nombre: nombre_inversor,
        perfil_inversion: perfil_inversion
      }
    });

    const inversorId = newInversor.id;

    // Generar el token JWT ahora que el perfil está completo
    const token = jwt.sign({ userId, inversorId }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Redirigir a la app con la información del perfil
    res.status(200).json({ message: 'Inversor creado con éxito', redirectTo: 'http://localhost:3000/', token });
  } catch (err) {
    console.error('Error al completar el perfil del inversor:', err);
    res.status(500).json({ message: 'Error al completar el perfil del inversor' });
  }
};

export const startupRole = async (req, res) => {
  const userId = parseInt(req.params.id, 10); // Asegúrate de que el ID es un número
  const { nombre_startup, sector, fase_desarrollo, estado_financiacion, plantilla } = req.body;

  // Validar los campos obligatorios
  if (!nombre_startup || !sector || !fase_desarrollo || !estado_financiacion || plantilla === undefined) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  try {
    // Verificar si la startup ya tiene un perfil
    const existingStartup = await prisma.startup.findUnique({
      where: { id: userId } // Verificamos por `id_usuario`
    });

    if (existingStartup) {
      return res.status(400).json({ message: 'El perfil de startup ya existe para este usuario' });
    }

    // Insertar la startup en la base de datos
    const newStartup = await prisma.startup.create({
      data: {
        id_usuario: userId,
        nombre: nombre_startup,
        sector: sector,
        fase_desarrollo: fase_desarrollo,
        estado_financiacion: estado_financiacion,
        plantilla: plantilla
      }
    });

    const startupId = newStartup.id;

    // Generar el token JWT ahora que el perfil está completo
    const token = jwt.sign({ userId, startupId }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Redirigir a la app con la información del perfil
    res.status(200).json({ message: 'Startup creada con éxito', redirectTo: 'http://localhost:3000/', token });
  } catch (err) {
    console.error('Error al completar el perfil de la startup:', err);
    res.status(500).json({ message: 'Error al completar el perfil de la startup' });
  }
};