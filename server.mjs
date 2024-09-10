import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.mjs';
import profileRoutes from './routes/profileRoutes.js';
import pool from './db.mjs';
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

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.send('Backend funcionando');
});

// Middleware para verificar el token
app.use((req, res, next) => {
  const token = req.headers['authorization'];
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Token inválido' });
      }
      req.user = decoded;
      next();
    });
  } else {
    res.status(403).json({ message: 'No se proporcionó un token' });
  }
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