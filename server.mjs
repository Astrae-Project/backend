import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.mjs';
import investRoutes from './routes/investRoutes.mjs';
import searchingRoutes from './routes/searchingRoutes.mjs';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from './middlewares/tokenMiddleware.mjs';
import fetchingRoutes from './routes/fetchingRoutes.mjs';
import groupesRoutes from './routes/groupesRoutes.mjs'
import profileRoutes from './routes/profileRoutes.mjs'

// Configuración de variables de entorno
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Crear instancia del cliente Prisma
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: ['http://localhost:4321', 'http://localhost:3000'], // Asegúrate de poner el origen correcto de tu frontend
  methods: ['POST', 'GET', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json()); // Parsear JSON
app.use(cookieParser());


// Rutas  
app.use('/api/auth', authRoutes);
app.use('/api/invest', investRoutes, verifyToken);
app.use('/api/search', searchingRoutes, verifyToken);
app.use('/api/data', fetchingRoutes)
app.use('/api/grupos', groupesRoutes)
app.use('/api/perfil', profileRoutes)

// Ruta principal
app.get('/', (req, res) => {
  res.send('Backend funcionando');
});

// Iniciar el servidor
const startServer = async () => {
  try {
    // Verificar conexión a la base de datos
    await prisma.$connect();
    console.log('Conectado a la base de datos');

    // Iniciar el servidor solo después de conectar la base de datos
    app.listen(port, () => {
      console.log(`Servidor corriendo en http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Error al conectar a la base de datos', err);
    process.exit(1); // Salir del proceso con error
  }
};

startServer();
