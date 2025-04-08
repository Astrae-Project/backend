import prisma from '../lib/prismaClient.mjs'; // Asegúrate de que la importación de Prisma está correcta
import jwt from 'jsonwebtoken';

// Selección de rol (actualiza el usuario y reemite los tokens con el rol)
export const selectRole = async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido', error: err.message });
  }

  const userId = decodedToken.userId;
  if (!userId) {
    return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
  }

  const { rol } = req.body;
  if (!rol) {
    return res.status(400).json({ message: 'Falta el campo rol en la solicitud' });
  }

  try {
    // Actualizar el rol del usuario en la base de datos
    await prisma.usuario.update({
      where: { id: userId },
      data: { rol },
    });

    // Crear nuevos tokens incluyendo el rol actualizado
    const accessToken = jwt.sign(
      { userId, rol },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
      { userId, rol },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Actualizar las cookies con los nuevos tokens
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 1000, // 1 hora
      sameSite: 'Strict',
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      sameSite: 'Strict',
      path: '/',
    });

    res.status(200).json({ message: 'Rol seleccionado con éxito', userId });
  } catch (error) {
    console.error('Error al seleccionar rol:', error);
    res.status(500).json({ message: 'Error al seleccionar rol' });
  }
};

export const investorRole = async (req, res) => {
  const { nombre_inversor, perfil_inversion, ciudad, pais } = req.body;

  if (!nombre_inversor || !perfil_inversion || !ciudad || !pais) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  try {
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

      const user = await prisma.usuario.findUnique({
        where: { id: userId },
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
        },
      });

      // Crear el portafolio asociado al nuevo inversor
      await prisma.portfolio.create({
        data: {
          inversor: {
            connect: { id: newInversor.id },
          },
        },
      });

      await prisma.usuario.update({
        where: { id: userId },
        data: {
          ciudad: ciudad,
          pais: pais,
        },
      });

      res.status(201).json({ message: 'Inversor y portafolio creados con éxito', inversorId: newInversor.id });
    } catch (err) {
      return res.status(500).json({ message: 'Error al verificar el token', error: err.message });
    }
  } catch (err) {
    console.error('Error al completar el perfil del inversor:', err);
    res.status(500).json({ message: 'Error al completar el perfil del inversor', error: err.message });
  }
};

export const startupRole = async (req, res) => {
  const { nombre_startup, sector, porcentaje, estado_financiacion, plantilla, ciudad, pais } = req.body;

  // Validar los campos obligatorios
  if (!nombre_startup || !sector || porcentaje < 0 || porcentaje > 100 || !estado_financiacion || plantilla < 0 || !ciudad || !pais) {
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
    let token = req.cookies.token;

    // Si no hay token, retornamos un error
    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    // Intentamos verificar el token
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decodedToken.userId;

      if (!userId) {
        return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
      }

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
          sector: sector,
          estado_financiacion: estado_financiacion,
          plantilla: plantillaInt, // Usa el valor convertido aquí
          porcentaje_disponible: porcentajeInt // Y aquí
        }
      });

      await prisma.usuario.update({
        where: { id: userId },
        data: {
          ciudad: ciudad,
          pais: pais,
        }
      });

      // Respuesta exitosa
      res.status(200).json({ message: 'Startup creada con éxito', redirectTo: 'http://localhost:3000/' });
    } catch (err) {
      return res.status(500).json({ message: 'Error al verificar el token', error: err.message });
    }
  } catch (err) {
    console.error('Error al completar el perfil de la startup:', err);
    res.status(500).json({ message: 'Error al completar el perfil de la startup', error: err.message });
  }
};
