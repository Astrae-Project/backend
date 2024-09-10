import pool from '../db.mjs';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import comparePassword from "../lib/passwordUtils.js"


export const registerUser = async (req, res) => {
  const { email, contraseña } = req.body;

  if (!email || !contraseña) {
    return res.status(400).json({ message: 'Por favor, envía email y contraseña' });
  }

  try {
    const existingUser = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(contraseña, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (email, contraseña) VALUES ($1, $2) RETURNING id',
      [email, hashedPassword]
    );

    const userId = result.rows[0].id;
    res.status(201).json({ message: 'Usuario registrado con éxito', userId, redirectUrl: `/seleccionar-rol/${userId}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al registrar el usuario' });
  }
};

export const loginUser = async (req, res) => {
  const { email, contraseña } = req.body;

  try {
    // Buscar el usuario por email
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Usuario no encontrado' });
    }

    const user = result.rows[0];

    // Verificar la contraseña
    const isMatch = await comparePassword(contraseña, user.contraseña);

    if (!isMatch) {
      return res.status(400).json({ message: 'Contraseña incorrecta' });
    }

    // Generar token JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};