import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.mjs';
import profileRoutes from './routes/profileRoutes.js';
import pool from './db.mjs';

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