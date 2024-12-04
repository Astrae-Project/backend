import prisma from '../lib/prismaClient.mjs'; // Asegúrate de que la importación de Prisma está correcta
import jwt from 'jsonwebtoken';

export const selectRole = async (req, res) => {
  try {
    const { token, refreshToken } = req.cookies;

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decodedToken.userId;

      if (!userId) {
        return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
      }

      const { rol } = req.body;

      await prisma.usuario.update({
        where: { id: userId },
        data: { rol },
      });

      // Enviar el userId en la respuesta
      res.status(200).json({ message: 'Rol seleccionado con éxito', userId });
    } catch (err) {
      // Si el token ha expirado, intentamos con el refreshToken
      if (err.name === 'TokenExpiredError') {
        const decodedRefreshToken = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const newToken = jwt.sign(
          { userId: decodedRefreshToken.userId },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        // Enviar el nuevo token en la cookie
        res.cookie('token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // Solo usar en producción
          maxAge: 3600000, // 1 hora
          sameSite: 'Lax',
        });

        // Reintentar la acción con el nuevo token
        const { rol } = req.body;
        await prisma.usuario.update({
          where: { id: decodedRefreshToken.userId },
          data: { rol },
        });

        res.status(200).json({ message: 'Rol seleccionado con éxito', userId: decodedRefreshToken.userId });
      } else {
        return res.status(500).json({ message: 'Error al verificar el token', error: err.message });
      }
    }
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
    const { token, refreshToken } = req.cookies;

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
      // Si el token ha expirado, intentamos con el refreshToken
      if (err.name === 'TokenExpiredError') {
        const decodedRefreshToken = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const newToken = jwt.sign(
          { userId: decodedRefreshToken.userId },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        // Enviar el nuevo token en la cookie
        res.cookie('token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // Solo usar en producción
          maxAge: 3600000, // 1 hora
          sameSite: 'Lax',
        });

        // Reintentar la acción con el nuevo token
        const user = await prisma.usuario.findUnique({
          where: { id: decodedRefreshToken.userId },
        });

        // El resto de la lógica sigue igual
        const newInversor = await prisma.inversor.create({
          data: {
            id_usuario: decodedRefreshToken.userId,
            nombre: nombre_inversor,
            perfil_inversion: perfil_inversion,
          },
        });

        await prisma.portfolio.create({
          data: {
            inversor: {
              connect: { id: newInversor.id },
            },
          },
        });

        await prisma.usuario.update({
          where: { id: decodedRefreshToken.userId },
          data: {
            ciudad: ciudad,
            pais: pais,
          },
        });

        res.status(201).json({ message: 'Inversor y portafolio creados con éxito', inversorId: newInversor.id });
      } else {
        return res.status(500).json({ message: 'Error al verificar el token', error: err.message });
      }
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
    let decodedToken;

    // Si no hay token, retornamos un error
    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    // Intentamos verificar el token, si expira, usamos el refresh token
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        // Si el token ha expirado, intentar obtener un nuevo access token usando el refresh token
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
          return res.status(401).json({ message: 'Refresh token no proporcionado' });
        }

        try {
          const decodedRefreshToken = jwt.verify(refreshToken, process.env.JWT_SECRET);
          const newAccessToken = jwt.sign(
            { userId: decodedRefreshToken.userId },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
          );

          // Regenerar el token de acceso y enviarlo como cookie
          res.cookie('token', newAccessToken, { httpOnly: true, maxAge: 3600000 }); // 1 hora

          // Intentamos de nuevo con el nuevo token
          decodedToken = jwt.verify(newAccessToken, process.env.JWT_SECRET);
        } catch (refreshError) {
          return res.status(403).json({ message: 'Refresh token no válido o expirado' });
        }
      } else {
        return res.status(500).json({ message: 'Error al verificar el token', error: error.message });
      }
    }

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
    console.error('Error al completar el perfil de la startup:', err);
    res.status(500).json({ message: 'Error al completar el perfil de la startup', error: err.message });
  }
};
