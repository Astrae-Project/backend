import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.mjs';

export const registerUser = async (req, res) => {
  const { email, password } = req.body;

  // Validar que se haya enviado el email y la contraseña
  if (!email || !password) {
    return res.status(400).json({ message: 'Por favor, envía email y contraseña' });
  }

  try {
    // Verificar si el usuario ya existe
    const existingUser = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar el nuevo usuario en la base de datos
    const result = await pool.query(
      'INSERT INTO usuarios (email, password) VALUES ($1, $2) RETURNING id',
      [email, hashedPassword]
    );

    // Enviar respuesta al cliente
    res.status(201).json({ message: 'Usuario registrado con éxito', userId: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al registrar el usuario' });
  }
};


export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Buscar el usuario por email
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Usuario no encontrado' });
    }

    const user = result.rows[0];

    // Verificar la contraseña
    const isMatch = await bcrypt.compare(password, user.password);

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
};
