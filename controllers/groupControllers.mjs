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

    const { nombre, descripcion, tipo } = req.body;

    // Crear el grupo
    const grupo = await prisma.grupo.create({
      data: {
        id_usuario: userId, // Aquí se asigna el id del creador
        nombre,
        descripcion,
        tipo,
        usuarios: {
          create: {
            id_usuario: userId,   // Agregar el usuario creador con rol de administrador
            rol: 'administrador'  // Asignar al creador como administrador del grupo
          }
        }
      }
    });

    // Responder con el grupo creado
    res.status(201).json(grupo);
  } catch (error) {
    console.error('Error al crear el grupo:', error);
    res.status(500).json({ message: 'Error al crear el grupo' });
  }
};

export const joinGroup = async (req, res) => {
  try {
    const token = req.cookies.token;

    // Verifica que el token esté presente
    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    // Verifica que el token contenga un ID de usuario
    if (!userId) {
      return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
    }

    const { grupoId } = req.params;
    const parsedGroupId = parseInt(grupoId, 10);

    // Verifica que el ID del grupo sea válido
    if (isNaN(parsedGroupId)) {
      return res.status(400).json({ message: 'ID de grupo inválido' });
    }

    // Verifica si el grupo existe
    const grupo = await prisma.grupo.findUnique({
      where: { id: parsedGroupId },
    });

    if (!grupo) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }

    // Verifica si el usuario ya está en el grupo
    const relacionExistente = await prisma.grupoUsuario.findUnique({
      where: {
        id_grupo_id_usuario: {
          id_grupo: parsedGroupId,
          id_usuario: userId,
        },
      },
    });

    if (relacionExistente) {
      return res.status(400).json({ message: 'Ya eres miembro de este grupo' });
    }

    if (grupo.tipo === 'privado') {
      return res.status(406).json({ message: 'Este grupo es privado, necesitas una invitación para unirte' });
    }

    // Crea la relación entre el usuario y el grupo
    await prisma.grupoUsuario.create({
      data: {
        id_grupo: parsedGroupId,
        id_usuario: userId,
        rol: 'miembro', // Asigna el rol predeterminado al usuario
      },
    });

    res.status(201).json({ message: 'Te has unido al grupo con éxito' });
  } catch (error) {
    console.error('Error al unirse al grupo:', error);
    res.status(500).json({ message: 'Error al unirse al grupo' });
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

    // Verifica si el grupo existe
    const grupo = await prisma.grupo.findUnique({
      where: { id: parsedGroupId },
    });

    if (!grupo) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }

    // Verifica si el usuario está en el grupo
    const relacion = await prisma.grupoUsuario.findUnique({
      where: {
        id_grupo_id_usuario: {
          id_grupo: parsedGroupId,
          id_usuario: userId,
        },
      },
    });

    if (!relacion) {
      return res.status(403).json({ message: 'No estás en este grupo' });
    }

    // Elimina la relación del usuario con el grupo
    await prisma.grupoUsuario.delete({
      where: {
        id_grupo_id_usuario: {
          id_grupo: parsedGroupId,
          id_usuario: userId,
        },
      },
    });

    res.status(200).json({ message: 'Has salido del grupo con éxito' });
  } catch (error) {
    console.error('Error al salir del grupo:', error);
    res.status(500).json({ message: 'Error al salir del grupo' });
  }
};

  export const dataGroup = async (req, res) => {
    try {
      const { grupoId } = req.params; // Suponiendo que pasas el id del grupo en los parámetros de la URL

      if (!grupoId) {
          return res.status(400).json({ message: 'ID del grupo no proporcionado' });
      }

      // Consulta el grupo con sus usuarios y roles asociados
      const grupo = await prisma.grupo.findUnique({
          where: { id: parseInt(grupoId) }, // Busca por el ID del grupo
          include: {
              usuarios: {
                  include: {
                      usuario: true, // Incluye los datos del usuario relacionados
                  },
              },
          },
      });

      if (!grupo) {
          return res.status(404).json({ message: 'Grupo no encontrado' });
      }

      // Formateamos la información de los miembros y roles
      const miembros = grupo.usuarios.map((grupoUsuario) => ({
          id: grupoUsuario.usuario.id,
          username: grupoUsuario.usuario.username,
          rol: grupoUsuario.rol,
      }));

      // Respuesta con la información del grupo y sus miembros
      return res.status(200).json({
          id: grupo.id,
          nombre: grupo.nombre,
          descripcion: grupo.descripcion,
          tipo: grupo.tipo,
          miembros,  // Lista de miembros con sus roles
      });

  } catch (error) {
      console.error('Error al obtener la información del grupo:', error);
      return res.status(500).json({ message: 'Error al obtener la información del grupo' });
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

    const { grupoId } = req.params;
    const { nombre, descripcion, tipo } = req.body;

    // Verificar si el usuario es administrador del grupo
    const grupoUsuario = await prisma.grupoUsuario.findUnique({
      where: {
        id_grupo_id_usuario: {
          id_grupo: parseInt(grupoId, 10),
          id_usuario: userId
        }
      }
    });

    if (!grupoUsuario || grupoUsuario.rol !== 'administrador') {
      return res.status(403).json({ message: 'No tienes permisos para realizar esta acción' });
    }

    // Actualizar el grupo
    const updatedFields = {};
    if (nombre) updatedFields.nombre = nombre;
    if (descripcion) updatedFields.descripcion = descripcion;
    if (tipo) updatedFields.tipo = tipo;

    const grupo = await prisma.grupo.update({
      where: { id: parseInt(grupoId, 10) },
      data: updatedFields,
    });

    res.status(200).json(grupo);
  } catch (error) {
    console.error('Error al cambiar la información del grupo:', error);
    res.status(500).json({ message: 'Error al cambiar la información del grupo' });
  }
};
  
export const addMember = async (req, res) => {
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

    const { groupId, newMemberId } = req.body; // ID del grupo y del nuevo miembro a añadir

    // Verificar que el grupo existe
    const grupo = await prisma.grupo.findUnique({
      where: {
        id: groupId,
      },
      include: {
        usuarios: true, // Incluye los usuarios actuales para verificar el rol del admin
      },
    });

    if (!grupo) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }

    // Verificar que el usuario que hace la solicitud es un administrador
    const admin = await prisma.grupoUsuario.findFirst({
      where: {
        id_usuario: userId,
        id_grupo: groupId,
        rol: 'administrador', // Verificamos que sea administrador
      },
    });

    if (!admin) {
      return res.status(403).json({ message: 'No tienes permisos para añadir miembros a este grupo' });
    }

    // Verificar si el nuevo miembro ya está en el grupo
    const existingMember = await prisma.grupoUsuario.findFirst({
      where: {
        id_usuario: newMemberId,
        id_grupo: groupId,
      },
    });

    if (existingMember) {
      return res.status(400).json({ message: 'El miembro ya está en el grupo' });
    }

    // Añadir el nuevo miembro al grupo
    const nuevoMiembro = await prisma.grupoUsuario.create({
      data: {
        id_usuario: newMemberId,
        id_grupo: groupId,
        rol: 'miembro', // Añadimos al nuevo miembro con el rol por defecto
      },
    });

    res.status(201).json({ message: 'Miembro añadido exitosamente', nuevoMiembro });
  } catch (error) {
    console.error('Error al añadir miembro al grupo:', error);
    res.status(500).json({ message: 'Error al añadir miembro al grupo' });
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

  
  