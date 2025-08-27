import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.mjs';
import investRoutes from './routes/investRoutes.mjs';
import searchingRoutes from './routes/searchingRoutes.mjs';
import fetchingRoutes from './routes/fetchingRoutes.mjs';
import groupesRoutes from './routes/groupesRoutes.mjs';
import profileRoutes from './routes/profileRoutes.mjs';
import eventRoutes from './routes/eventRoutes.mjs';
import followRoutes from './routes/followRoutes.mjs';
import waitlistRoutes from './routes/waitlistRoutes.mjs';
import stripeRoutes from './routes/stripeRoutes.mjs';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from './middlewares/tokenMiddleware.mjs';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { checkStripeAccount } from './middlewares/checkedStripeMiddleware.mjs';
import { requirePaymentMethod } from './middlewares/paymentMethodMiddleware.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración de variables de entorno
dotenv.config();
const port = process.env.PORT || 5000; 

// Crear instancia de Express y servidor HTTP
const app = express();
const server = createServer(app);

// Configurar Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN || ['https://www.astraesystem.com/', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('Usuario conectado', socket.id);

  socket.on('disconnect', () => {
    console.log('Usuario desconectado', socket.id);
  });

  // Puedes agregar aquí otros eventos o lógica para Socket.io
});

// Crear instancia del cliente Prisma
const prisma = new PrismaClient();

// Middlewares generales
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN 
    ? process.env.FRONTEND_ORIGIN.split(',') 
    : ['https://www.astraesystem.com/', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve('uploads')));

// Rutas sin protección (por ejemplo, autenticación)
app.use('/api/auth', authRoutes);
app.use('/api/waitlist', waitlistRoutes);

// Rutas protegidas por token: se recomienda aplicar primero el middleware de verificación
app.use('/api/invest', verifyToken, investRoutes);
app.use('/api/search', verifyToken, searchingRoutes);
app.use('/api/data', verifyToken, fetchingRoutes);
app.use('/api/grupos', verifyToken, groupesRoutes);
app.use('/api/perfil', verifyToken, profileRoutes);
app.use('/api/evento', verifyToken, eventRoutes);
app.use('/api/follow', verifyToken, followRoutes);
app.use('/api/stripe', verifyToken, stripeRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.send('Backend funcionando');
});

// Middleware global de manejo de errores (opcional pero recomendado)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar el servidor
const startServer = async () => {
  try {
    // Conectar a la base de datos
    await prisma.$connect();

    // Iniciar el servidor HTTP
    server.listen(port, () => {
    });
  } catch (err) {
    console.error('Error al conectar a la base de datos', err);
    process.exit(1);
  }
};

startServer();
