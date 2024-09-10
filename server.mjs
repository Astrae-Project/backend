import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import pool from './db.mjs'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:4321', // Asegúrate de poner el origen correcto de tu frontend
  methods: ['POST', 'GET']
}));
app.use(express.json()); // Parsear JSON

// Ruta de registro
app.post('/registrar', async (req, res) => {
  const { email, contraseña } = req.body;

  try {
    // Verificar si el usuario ya existe
    const existingUser = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];

      // Si no ha seleccionado un rol
      if (!user.rol) {
        return res.status(200).json({
          message: 'El usuario ya está registrado, pero no ha seleccionado un rol',
          redirectUrl: `/seleccionar-rol/${user.id}`
        });
      }

      // Si ha seleccionado un rol, verificar si ha completado su perfil según el rol
      if (user.rol === 'inversor') {
        const inversor = await pool.query('SELECT * FROM inversores WHERE id_usuario = $1', [user.id]);

        if (inversor.rows.length === 0) {
          // Si no ha completado el perfil de inversor
          return res.status(200).json({
            message: 'El usuario es inversor, pero no ha completado su perfil',
            redirectUrl: `/crear-inversor/${user.id}`
          });
        }
      } else if (user.rol === 'startup') {
        const startup = await pool.query('SELECT * FROM startups WHERE id_usuario = $1', [user.id]);

        if (startup.rows.length === 0) {
          // Si no ha completado el perfil de startup
          return res.status(200).json({
            message: 'El usuario es startup, pero no ha completado su perfil',
            redirectUrl: `/crear-startup/${user.id}`
          });
        }
      }

      // Si ya ha completado su perfil, devolver un error o redirigirlo a la app principal
      return res.status(400).json({
        message: 'El usuario ya completó su registro',
        redirectUrl: `/app/${user.id}`
      });
    }

      // Encriptar la contraseña
      const hashedPassword = await bcrypt.hash(contraseña, 10);

      // Insertar el nuevo usuario en la base de datos
      const insertResult = await pool.query(
          'INSERT INTO usuarios (email, contraseña) VALUES ($1, $2) RETURNING id',
          [email, hashedPassword]
      );

      // Verificar si se ha insertado correctamente
      if (insertResult.rows.length === 0) {
          return res.status(500).json({ message: 'Error al registrar el usuario' });
      }

      const userId = insertResult.rows[0].id;

      // Enviar respuesta al cliente
      res.status(201).json({ message: 'Usuario registrado con éxito', userId,  redirectUrl: `/seleccionar-rol/${userId}` });
  } catch (err) {
      console.error('Error al registrar el usuario:', err);
      res.status(500).json({ message: 'Error al registrar el usuario' });
  }
});

app.post('/seleccionar-rol/:id', async (req, res) => {
  const userId = req.params.id;
  const { rol } = req.body; // El rol es enviado desde el frontend (startup o inversor)

  // Validar que se ha enviado un rol válido
  if (!rol || (rol !== 'inversor' && rol !== 'startup')) {
    return res.status(400).json({ message: 'Selecciona un rol válido' });
  }

  try {
    // Verificar si el usuario existe en la base de datos
    const userResult = await pool.query('SELECT * FROM usuarios WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Actualizar el rol del usuario en la base de datos
    await pool.query('UPDATE usuarios SET rol = $1 WHERE id = $2', [rol, userId]);

    // Redirigir al siguiente paso según el rol
    if (rol === 'inversor') {
      return res.json({ message: 'Rol seleccionado: inversor', redirectUrl: `/crear-inversor/${userId}` });
    } else {
      return res.json({ message: 'Rol seleccionado: startup', redirectUrl: `/crear-startup/${userId}` });
    }
  } catch (err) {
    console.error('Error al seleccionar el rol:', err);
    res.status(500).json({ message: 'Error al seleccionar el rol' });
  }
});


// Ruta para completar el perfil de inversor
app.post('/crear-inversor/:id', async (req, res) => {
  const userId = req.params.id;  // Usamos el userId que se pasó en la URL

  const { nombre, perfil_inversion } = req.body;

  if (!nombre || !perfil_inversion) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  try {

    // Verificar si el usuario existe en la base de datos
    const userResult = await pool.query('SELECT * FROM usuarios WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const inversorExistente = await pool.query('SELECT * FROM inversores WHERE id_usuario = $1', [userId]);

    if (inversorExistente.rows.length > 0) {
      return res.status(400).json({ message: 'Ya existe un perfil de inversor para este usuario' });
    }

    // Insertar el inversor en la tabla de inversores con un nuevo ID
    const insertInversor = await pool.query(
      'INSERT INTO inversores (id_usuario, nombre, perfil_inversion) VALUES ($1, $2, $3) RETURNING id',
      [userId, nombre, perfil_inversion]
    );

    const inversorId = insertInversor.rows[0].id;

    // Generar el token JWT ahora que el perfil está completo
    const token = jwt.sign({ userId, inversorId }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Redirigir a la app con la información del perfil
    res.status(200).json({ message: 'Inversor creado con éxito', redirectTo: 'http://localhost:3000/' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al completar el perfil del inversor' });
  }
});

// Ruta para completar el perfil de startup
app.post('/crear-startup/:id', async (req, res) => {
  const userId = req.params.id;  // Usamos el userId que se pasó en la URL

  const { nombre_startup, sector, fase_desarrollo, estado_financiacion, website, plantilla } = req.body;

  if (!nombre_startup || !sector || !fase_desarrollo || !estado_financiacion || !plantilla) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  try {

    // Verificar si el usuario existe en la base de datos
    const userResult = await pool.query('SELECT * FROM usuarios WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const startupExistente = await pool.query('SELECT * FROM startups WHERE id_usuario = $1', [userId]);

    if (startupExistente.rows.length > 0) {
      return res.status(400).json({ message: 'Ya existe un perfil de startup para este usuario' });
    }

    // Insertar el inversor en la tabla de inversores con un nuevo ID
    const insertStartup = await pool.query(
      'INSERT INTO startups (id_usuario, nombre, sector, fase_desarrollo, estado_financiacion, website, plantilla) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [userId, nombre_startup, sector, fase_desarrollo, estado_financiacion, website, plantilla]
    );

    const startupId = insertStartup.rows[0].id;

    // Generar el token JWT ahora que el perfil está completo
    const token = jwt.sign({ userId, startupId }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Redirigir a la app con la información del perfil
    res.status(200).json({ message: 'Startup creada con éxito', redirectTo: 'http://localhost:3000/' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al completar el perfil del inversor' });
  }
});

// Ruta para iniciar sesión
  app.post('/iniciar-sesion', async (req, res) => {
    const { email, contraseña } = req.body;

    try {
      // Buscar el usuario por email
      const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

      if (result.rows.length === 0) {
        return res.status(400).json({ message: 'Usuario no encontrado' });
      }

      const user = result.rows[0];

      // Verificar la contraseña
      const isMatch = await bcrypt.compare(contraseña, user.contraseña);

      if (!isMatch) {
        return res.status(400).json({ message: 'Contraseña incorrecta' });
      }

      // Generar token JWT
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error al iniciar sesión' });
    }
  }
);

// Ruta principal
app.get('/', (req, res) => {
  res.send('Backend funcionando');
});

// Iniciar el servidor
pool.connect()
    .then(client => {
        console.log('Conectado a la base de datos');
        client.release();  // Libera el cliente de la conexión

        // Iniciar el servidor solo después de conectar la base de datos
        app.listen(port, () => {
            console.log(`Servidor corriendo en http://localhost:${port}`);
        });
    })
    .catch(err => {
        console.error('Error al conectar a la base de datos', err);
    });
