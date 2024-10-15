import prisma from '../lib/prismaClient.mjs';
import jwt from 'jsonwebtoken'

export const createGroup = async (req, res) => {
    try {
      const token = req.cookies.token;
  
      if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
      }
  
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decodedToken.userId;
  
      if (!userId) {
        return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
      }
  
      const { nombre, descripcion, tipo } = req.body; // Obtén los datos del cuerpo de la solicitud
    
        // Crea el grupo en la base de datos
        const grupo = await prisma.grupo.create({
          data: {
            nombre: nombre,
            descripcion: descripcion,
            tipo: tipo,
            id_usuario: userId,
            // Añade al usuario que crea el grupo como miembro
            usuarios: {
              connect: { id: userId }, // Conecta el usuario al grupo
            },
          },
        });
    
        // Responde con el grupo creado
        res.status(201).json(grupo);
      } catch (error) {
        // Manejo de errores: registra el error y responde con un mensaje de error
        console.error('Error al crear el grupo:', error);
        res.status(500).json({ message: 'Error al crear el grupo' });
      }
    };

  export const dropGroup = async (req, res) => {
    try {
      const token = req.cookies.token;
  
      if (!token) {
          return res.status(401).json({ message: 'Token no proporcionado' });
      }
    
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decodedToken.userId;
  
      if (!userId) {
        return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
      }

      const { grupoId } = req.params;
      const parsedGroupId = parseInt(grupoId, 10);
  
      // Verifica si el grupoId es un número válido
      if (isNaN(parsedGroupId)) {
        return res.status(400).json({ message: 'ID de grupo inválido' });
      }
  
      // Busca el grupo en la base de datos
      const grupo = await prisma.grupo.findUnique({
        where: {
          id: parsedGroupId, // ID del grupo
        },
        include: {
          usuarios: true, // Incluye la relación con usuarios para verificar membresía
        },
      });
  
      // Si el grupo no existe, responde con un error 404
      if (!grupo) {
        return res.status(404).json({ message: 'Grupo no encontrado' });
      }
  
      // Verifica si el usuario que hace la solicitud es un miembro del grupo
      const esMiembro = grupo.usuarios.some(usuario => usuario.id === userId);
  
      if (!esMiembro) {
        return res.status(403).json({ message: 'No estás en este grupo' });
      }
  
      // Elimina al usuario del grupo
      await prisma.grupo.update({
        where: {
          id: parsedGroupId,
        },
        data: {
          usuarios: {
            disconnect: { id: userId }, // Desconecta al usuario del grupo
          },
        },
      });
  
      // Responde con éxito
      res.status(200).json({ message: 'Has salido del grupo con éxito' });
    } catch (error) {
      // Manejo de errores: registra el error y responde con un mensaje de error
      console.error('Error al salir del grupo:', error);
      res.status(500).json({ message: 'Error al salir del grupo' });
    }
  };

export const dataGroup = async (req, res) => {
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

export const changeData = async (req, res) => {
    try {
        const token = req.cookies.token;
    
        if (!token) {
          return res.status(401).json({ message: 'Token no proporcionado' });
        }
    
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;
    
        if (!userId) {
          return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
        }
    
        const { nombre, descripcion, tipo } = req.body; // Obtén los datos del cuerpo de la solicitud
      
          // Crea el grupo en la base de datos
          const grupo = await prisma.grupo.update({
            data: {
              nombre: nombre,
              descripcion: descripcion,
              tipo: tipo,
            },
          });
      
          // Responde con el grupo creado
          res.status(201).json(grupo);
        } catch (error) {
          // Manejo de errores: registra el error y responde con un mensaje de error
          console.error('Error al crear el grupo:', error);
          res.status(500).json({ message: 'Error al crear el grupo' });
        }
    }
  
  export const addMember = async (req, res) => {
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

  export const dropMember = async (req, res) => {
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
  
  export const sendMessage = async (req, res) => {
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
  
  export const seeMessage = async (req, res) => {
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

  export const changeRole = async (req, res) => {
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

  
  