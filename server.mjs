import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import pool from './db.mjs'
import bcrypt from 'bcrypt'
import { createUser } from './models/userModel.mjs';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:4321', // Asegúrate de poner el origen correcto de tu frontend
  methods: ['POST', 'GET']
}));
app.use(express.json()); // Parsear JSON

// Ruta para registrar un usuario
// Ruta para registrar un usuario
app.post('/register', async (req, res) => {
  const { email, contraseña } = req.body;

  // Validar que se haya enviado el email y la contraseña
  if (!email || !contraseña) {
      return res.status(400).json({ message: 'Por favor, envía email y contraseña' });
  }

  try {
      // Verificar si el usuario ya existe
      const existingUserResult = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

      if (existingUserResult.rows.length > 0) {
          return res.status(400).json({ message: 'El usuario ya existe' });
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
      res.status(201).json({ message: 'Usuario registrado con éxito', userId });
  } catch (err) {
      console.error('Error al registrar el usuario:', err);
      res.status(500).json({ message: 'Error al registrar el usuario' });
  }
});

// Ruta para iniciar sesión
app.post('/login', async (req, res) => {
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
