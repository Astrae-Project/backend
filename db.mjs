import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();  // Cargar variables de entorno

const pool = new pg.Pool({
  user: process.env.DB_USER,         // Usuario de PostgreSQL
  host: process.env.DB_HOST,         // Servidor
  database: process.env.DB_NAME,     // Nombre de la base de datos
  password: process.env.DB_PASSWORD, // Contraseña
  port: process.env.DB_PORT || 5432, // Puerto
});

export default pool;