import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Registro de usuarios
export const registerUser = async (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    console.log('Faltan datos:', { email, password });
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  try {
    console.log('Verificando si el usuario ya existe...');
    const existingUser = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('El usuario ya existe:', email);
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    console.log('Hasheando la contraseña...');
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Creando nuevo usuario...');
    const newUser = await prisma.usuario.create({
      data: {
        email,
        password: hashedPassword,
        username,
      },
    });

    const userId = newUser.id;
    console.log('Usuario creado con ID:', userId);

    // Crear tokens
    const accessToken = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ userId: newUser.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Guardar los tokens en cookies
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000, // 1 hora
      sameSite: 'Lax',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      sameSite: 'Lax',
    });

    res.status(201).json({ message: 'Usuario registrado con éxito', userId: newUser.id });
  } catch (err) {
    console.error('Error en el registro:', err);
    res.status(500).json({ message: 'Error al registrar el usuario' });
  }
};

// Inicio de sesión
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Los campos email y contraseña son obligatorios' });
  }

  try {
    const user = await prisma.usuario.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    const accessToken = jwt.sign({ userId: user.id, role: user.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ userId: user.id, role: user.rol }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000, // 1 hora
      sameSite: 'Lax',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      sameSite: 'Lax',
    });

    return res.status(200).json({ message: 'Inicio de sesión exitoso', accessToken, refreshToken });
  } catch (error) {
    console.error('Error en loginUser:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Cierre de sesión
export const loginOut = async (req, res) => {
  try {
    res.cookie('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0),
    });

    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0),
    });

    res.status(200).json({ message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    res.status(500).json({ message: 'Error al cerrar sesión' });
  }
};

// Refrescar el access token
export const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({ message: 'No se encontró el token de refresco' });
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const newAccessToken = jwt.sign(
      { userId: payload.userId, role: payload.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000, // 1 hora
      sameSite: 'Lax',
    });

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Error al refrescar el token:', error);
    return res.status(403).json({ message: 'Token de refresco inválido o expirado' });
  }
};
