import prisma from "../lib/prismaClient.mjs";
import jwt from 'jsonwebtoken';
import path from 'path';

export async function saveContact(req, res) {
    const { correo, twitter, linkedin, facebook, instagram, otros } = req.body;
    const token = req.cookies.token;

    // Verificar si el token está presente
    if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    try {
        // Verificar y decodificar el token JWT
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken?.userId;

        if (!userId) {
            return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
        }

        // Validar que al menos un campo se envió para actualizar
        if (![correo, twitter, linkedin, facebook, instagram, otros].some(field => field !== undefined)) {
            return res.status(400).json({ message: 'Debe proporcionar al menos un campo para actualizar' });
        }

        // Buscar el contacto existente en la base de datos
        const contactoExistente = await prisma.contacto.findUnique({
            where: { id_usuario: userId },
        });

        if (!contactoExistente) {
            return res.status(404).json({ message: 'No se encontró el registro para actualizar' });
        }

        // Actualizar los datos preservando valores existentes si no se envían
        const contactoActualizado = await prisma.contacto.update({
            where: { id_usuario: userId },
            data: {
                correo: correo !== undefined ? correo : contactoExistente.correo,
                twitter: twitter !== undefined ? twitter : contactoExistente.twitter,
                linkedin: linkedin !== undefined ? linkedin : contactoExistente.linkedin,
                facebook: facebook !== undefined ? facebook : contactoExistente.facebook,
                instagram: instagram !== undefined ? instagram : contactoExistente.instagram,
                otros: otros !== undefined ? otros : contactoExistente.otros,    
            },
        });

        // Responder con los datos actualizados
        res.status(200).json({ message: 'Contacto actualizado con éxito', data: contactoActualizado });
    } catch (error) {
        console.error('Error al actualizar la información de contacto:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
}

export const changeData = async (req, res) => {
  try {
    console.log('[1] Inicio de changeData');

    const token = req.cookies.token;
    console.log('[2] Token recibido:', token);

    if (!token) {
      console.warn('[2.1] Token no proporcionado');
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = parseInt(decodedToken.userId, 10);
    console.log('[3] Token decodificado. ID de usuario:', userId);

    if (!userId) {
      console.warn('[3.1] ID de usuario no encontrado en el token');
      return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
    }

    const {
      nombre,
      username,
      avatar,
      ciudad,
      pais,
      perfil_inversion,
      sector,
      estado_financiacion,
      plantilla,
      porcentaje_disponible,
    } = req.body;

    console.log('[4] Datos recibidos del body:', req.body);

    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        inversores: true,
        startups: true,
      },
    });

    console.log('[5] Usuario encontrado:', usuario);

    if (!usuario) {
      console.warn('[5.1] Usuario no encontrado en la base de datos');
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const cambios = [];

    const dataUsuario = {};
    if (username && username !== usuario.username) {
      dataUsuario.username = username;
      cambios.push(`Username: "${usuario.username}" → "${username}"`);
    }
    if (avatar && avatar !== usuario.avatar) {
      dataUsuario.avatar = avatar;
      cambios.push('Avatar actualizado');
    }
    if (ciudad && ciudad !== usuario.ciudad) {
      dataUsuario.ciudad = ciudad;
      cambios.push(`Ciudad: "${usuario.ciudad}" → "${ciudad}"`);
    }
    if (pais && pais !== usuario.pais) {
      dataUsuario.pais = pais;
      cambios.push(`País: "${usuario.pais}" → "${pais}"`);
    }

    // Inversor
    const inversor = usuario.inversores?.[0]; // en plural
    console.log('[6] Inversor detectado:', inversor);

    if (inversor) {
      const dataInversor = {};
      if (nombre && nombre !== inversor.nombre) {
        dataInversor.nombre = nombre;
        cambios.push(`Nombre: "${inversor.nombre}" → "${nombre}"`);
      }
      if (perfil_inversion && perfil_inversion !== inversor.perfil_inversion) {
        dataInversor.perfil_inversion = perfil_inversion;
        cambios.push('Perfil de inversión actualizado');
      }

      if (Object.keys(dataInversor).length > 0) {
        console.log('[6.1] Actualizando datos de inversor:', dataInversor);
        await prisma.inversor.update({
          where: { id_usuario: userId },
          data: dataInversor,
        });
      }
    }

    // Startup
    const startup = usuario.startups?.[0]; // en plural
    console.log('[7] Startup detectada:', startup);

    if (startup) {
      const dataStartup = {};
      if (nombre && nombre !== startup.nombre) {
        dataStartup.nombre = nombre;
        cambios.push(`Nombre: "${startup.nombre}" → "${nombre}"`);
      }
      if (sector && sector !== startup.sector) {
        dataStartup.sector = sector;
        cambios.push(`Sector: "${startup.sector}" → "${sector}"`);
      }
      if (estado_financiacion && estado_financiacion !== startup.estado_financiacion) {
        dataStartup.estado_financiacion = estado_financiacion;
        cambios.push('Estado de financiación actualizado');
      }
      if (plantilla && plantilla !== startup.plantilla) {
        dataStartup.plantilla = plantilla;
        cambios.push('Plantilla actualizada');
      }
      if (
        porcentaje_disponible &&
        porcentaje_disponible !== startup.porcentaje_disponible
      ) {
        dataStartup.porcentaje_disponible = porcentaje_disponible;
        cambios.push('Porcentaje disponible actualizado');
      }

      if (Object.keys(dataStartup).length > 0) {
        console.log('[7.1] Actualizando datos de startup:', dataStartup);
        await prisma.startup.update({
          where: { id_usuario: userId },
          data: dataStartup,
        });
      }
    }

    // Usuario
    if (Object.keys(dataUsuario).length > 0) {
      console.log('[8] Actualizando datos de usuario:', dataUsuario);
      await prisma.usuario.update({
        where: { id: userId },
        data: dataUsuario,
      });
    }

    if (cambios.length === 0) {
      console.log('[9] No se realizaron cambios en el perfil');
      return res.status(200).json({ message: 'No se realizaron cambios en el perfil' });
    }

    console.log('[10] Cambios realizados:', cambios);
    return res.status(200).json({ message: 'Perfil actualizado correctamente', cambios });

  } catch (error) {
    console.error('[ERROR] Error al actualizar el perfil:', error);
    return res.status(500).json({ message: 'Error al actualizar el perfil' });
  }
};

export async function darPuntuacion(req, res) {
    const { id_inversor, id_startup, puntuacion, comentario } = req.body;
    const token = req.cookies.token;

    // Verificar si el token está presente
    if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    // Verificar que el id_inversor y puntuacion estén presentes
    if (!id_inversor || !id_startup || puntuacion === undefined) {
        return res.status(400).json({ error: "El id_inversor y la puntuación son obligatorios" });
    }

    // Validar que la puntuación esté entre 0 y 5, permitiendo hasta dos decimales
    const puntuacionDecimal = parseFloat(puntuacion);
    if (isNaN(puntuacionDecimal) || puntuacionDecimal < 0 || puntuacionDecimal > 5 || !/^\d+(\.\d{1,2})?$/.test(puntuacion.toString())) {
        return res.status(400).json({ error: "La puntuación debe estar entre 0 y 5 con hasta dos decimales" });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId; // ID de la startup
        const role = decodedToken.role;

        // Verificar que el ID de usuario se haya decodificado correctamente
        if (!userId) {
            return res.status(400).json({ message: 'ID de usuario no encontrado en el token' });
        }

        // Verificar que el rol sea de startup
        if (role !== 'startup') {
            return res.status(403).json({ message: 'Solo las startups pueden hacer reseñas' });
        }

        // Verificar que el inversor existe
        const inversor = await prisma.inversor.findUnique({
            where: { id: id_inversor },
        });
        if (!inversor) {
            return res.status(404).json({ error: "Inversor no encontrado" });
        }

        // Verificar que la startup existe
        const startup = await prisma.startup.findMany({
            where: { id_usuario: userId }, // Asegúrate de que 'id_usuario' es el campo correcto
        });
        if (!startup) {
            return res.status(404).json({ error: "Startup no encontrada" });
        }

        // Crear la reseña, asociándola tanto a la startup como al inversor
        const nuevaResena = await prisma.resena.create({
            data: {
                puntuacion: parseFloat(puntuacionDecimal.toFixed(2)), // Guardar puntuación con dos decimales
                comentario: comentario || '', // Manejar caso donde comentario sea undefined
                inversor: {
                    connect: { id: id_inversor }, // Conectar la reseña con el inversor
                },
                startup: {
                    connect: { id: id_startup }, // Conectar la reseña con la startup usando id directamente
                },
            },
        });

        await prisma.notificacion.create({
            data: {
                id_usuario: id_inversor,
                tipo: 'reseña',
                descripcion: `Has recibido una reseña de la startup ${startup[0].nombre}`,
                leido: false,
            },
        });

        return res.status(201).json(nuevaResena);
    } catch (error) {
        console.error("Error al crear la reseña:", error);
        return res.status(500).json({ error: "Error al crear la reseña" });
    }
}

export async function marcarComoLeido(req, res) {
  const token = req.cookies.token;
  const { id } = req.body; // ID de la notificación seleccionada
  
  if (!token) {
    return res.status(401).json({ message: "No autorizado" });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
  
    // Verificar que la notificación exista y pertenezca al usuario
    const notificacion = await prisma.notificacion.findUnique({
      where: { id },
    });

    if (!notificacion || notificacion.id_usuario !== userId) {
      return res.status(404).json({ message: "Notificación no encontrada" });
    }

    // Actualizar el estado de la notificación a leido
    await prisma.notificacion.update({
      where: { id },
      data: { leido: true },
    });

    res.json({ message: "Notificación marcada como leída" });
  } catch (error) {
    console.error("Error al marcar notificación como leída:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function verDocumento(req, res) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }

  const id_startup = parseInt(req.params.id_startup, 10);
  if (isNaN(id_startup)) {
    return res.status(400).json({ message: 'ID de startup inválido' });
  }

  try {
    const documentos = await prisma.documento.findMany({
      where: { id_startup: id_startup }
    });

    return res.status(200).json(documentos);
  } catch (err) {
    return res.status(500).json({ message: 'Error interno al recuperar documentos' });
  }
}

export async function subirDocumento(req, res) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }

  const startup = await prisma.startup.findFirst({
    where: { id_usuario: decoded.userId }
  });

  if (!startup) {
    return res.status(404).json({ message: 'No se encontró startup para este usuario' });
  }

  const paramId = parseInt(req.params.id_startup, 10);
  if (paramId !== startup.id) {
    return res.status(403).json({ message: 'No autorizado para subir en esta startup' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No se recibió ningún archivo' });
  }

  try {
    const nuevoDocumento = await prisma.documento.create({
      data: {
        id_startup: startup.id,
        nombre: req.file.originalname,
        url: `/uploads/${req.file.filename}`,
        tipo: req.body.tipo || path.extname(req.file.originalname).slice(1),
      }
    });
    return res.status(200).json({
      message: 'Documento subido correctamente',
      documento: nuevoDocumento
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error interno al guardar documento' });
  }
}
