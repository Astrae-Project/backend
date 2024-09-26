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
      return res.status(800).json({ message: 'El usuario ya tiene un rol asignado' });
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
  const userId = parseInt(req.params.id, 10);
  const { nombre_inversor, perfil_inversion, usuario } = req.body;

  // Validar campos requeridos
  if (!nombre_inversor || !perfil_inversion || !usuario) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  try {
    // Verificar si el usuario existe
    const user = await prisma.usuario.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Crear el inversor en la base de datos
    const newInversor = await prisma.inversor.create({
      data: {
        id_usuario: userId,
        nombre: nombre_inversor,
        perfil_inversion: perfil_inversion,
        username: usuario // Asegúrate de que esta columna existe en la base de datos
      }
    });

    res.status(201).json({ message: 'Inversor creado con éxito', inversorId: newInversor.id });
  } catch (err) {
    console.error('Error al completar el perfil del inversor:', err);
    res.status(500).json({ message: 'Error al completar el perfil del inversor' });
  }
};


export const startupRole = async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { nombre_startup, usuario, sector, porcentaje, estado_financiacion, plantilla } = req.body;

  // Validar los campos obligatorios
  if (!nombre_startup || !usuario || !sector || porcentaje < 0 || porcentaje > 100 || !estado_financiacion || plantilla < 0) {
    return res.status(400).json({ message: 'Faltan campos requeridos o campos inválidos' });
  }

  // Asegúrate de convertir plantilla y porcentaje a número
  const plantillaInt = parseInt(plantilla, 10);
  const porcentajeInt = parseInt(porcentaje, 10);

  // Validar conversión
  if (isNaN(plantillaInt) || isNaN(porcentajeInt)) {
    return res.status(400).json({ message: 'Los campos plantilla y porcentaje deben ser números válidos.' });
  }

  try {
    // Verificar si el usuario existe
    const user = await prisma.usuario.findUnique({
      where: { id: userId }
    });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Insertar la startup en la base de datos
    const newStartup = await prisma.startup.create({
      data: {
        id_usuario: userId,
        nombre: nombre_startup,
        username: usuario,
        sector: sector,
        estado_financiacion: estado_financiacion,
        plantilla: plantillaInt, // Usa el valor convertido aquí
        porcentaje_disponible: porcentajeInt // Y aquí
      }
    });

    // Respuesta exitosa
    res.status(200).json({ message: 'Startup creada con éxito', redirectTo: 'http://localhost:3000/' });
  } catch (err) {
    console.error('Error al completar el perfil de la startup:', err);
    res.status(500).json({ message: 'Error al completar el perfil de la startup', error: err.message });
  }
};
