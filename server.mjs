// server.mjs
import './hooks/instrument.mjs'; // Inicializar Sentry lo antes posible
import * as Sentry from "@sentry/node";
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
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const PORT = process.env.PORT || 5000;

// __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Normalizar orígenes permitidos (sin barras finales)
const allowedOrigins = (process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',')
  : ['https://www.astraesystem.com', 'https://app.astraesystem.com', 'http://localhost:4321', 'http://localhost:3000']
).map(s => s.trim().replace(/\/+$/, ''));

// Opciones CORS (usadas por Express)
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200
};

const app = express();
const server = createServer(app);

// Socket.io — usar la misma lista de orígenes normalizada
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('Socket conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('Socket desconectado:', socket.id);
  });
});

// Middlewares globales
app.use(Sentry.Handlers.requestHandler()); // <--- Sentry requestHandler antes de rutas
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Servir uploads (ruta absoluta)
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// Rutas públicas
app.use('/api/auth', authRoutes);
app.use('/api/waitlist', waitlistRoutes);

// Rutas protegidas por token
app.use('/api/invest', verifyToken, investRoutes);
app.use('/api/search', verifyToken, searchingRoutes);
app.use('/api/data', verifyToken, fetchingRoutes);
app.use('/api/grupos', verifyToken, groupesRoutes);
app.use('/api/perfil', verifyToken, profileRoutes);
app.use('/api/evento', verifyToken, eventRoutes);
app.use('/api/follow', verifyToken, followRoutes);
app.use('/api/stripe', verifyToken, stripeRoutes);


app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

// Ruta principal
app.get('/', (req, res) => {
  res.send('Backend funcionando');
});

// Sentry errorHandler — después de todas las rutas
app.use(Sentry.Handlers.errorHandler());

// Middleware final de errores JSON personalizado (opcional)
app.use((err, req, res, next) => {
  console.error(err);
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: origen no permitido' });
  }
  res.status(500).json({
    error: err.message || 'Error interno del servidor',
    eventId: res.sentry, // ID Sentry para tracking
  });
});

// Prisma y arranque del servidor
const prisma = new PrismaClient();

const startServer = async () => {
  try {
    await prisma.$connect();
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      console.log('Allowed origins:', allowedOrigins);
    });
  } catch (err) {
    console.error('Error al conectar a la base de datos:', err);
    process.exit(1);
  }
};

startServer();