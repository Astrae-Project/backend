import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createSession } from '../lib/sessionHandler.mjs';
import { generateAccessToken } from '../lib/accessToken.mjs';

const prisma = new PrismaClient();

// Registro de usuarios
export const registerUser = async (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    console.error('Faltan datos:', { email, password, username });
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  try {
    // Verificar si el usuario ya existe
    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
      console.warn('El usuario ya existe:', email);
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Hashear contraseña y crear usuario
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.usuario.create({
      data: {
        email,
        password: hashedPassword,
        username,
      },
    });

    const userId = newUser.id;

    // Crear contacto asociado
    await prisma.contacto.create({
      data: {
        id_usuario: userId,
        correo: email,
      },
    });

    // Crear tokens iniciales (sin rol)
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Configurar cookies
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 1000, // 1 hora
      sameSite: 'Strict',
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      sameSite: 'Strict',
      path: '/',
    });

    res.status(201).json({ message: 'Usuario registrado con éxito' });
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

    const accessToken = generateAccessToken(user)
    const refreshToken = jwt.sign(
      { userId: user.id, role: user.rol },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Solo si estás usando HTTPS
      maxAge: 60 * 60 * 1000, // 1 hora
      sameSite: 'Strict', // Protege contra ataques CSRF
      path: '/', // Establece el path adecuado para las cookies
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, // No accesible desde JavaScript
      secure: process.env.NODE_ENV === 'production', // Solo si estás usando HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      sameSite: 'Strict', // Protege contra ataques CSRF
      path: '/', // Establece el path adecuado para las cookies
    });

    return res.status(200).json({ message: 'Inicio de sesión exitoso', accessToken });
  } catch (error) {
    console.error('Error en loginUser:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
};

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

export const tokenController = async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken; // Asegúrate de extraer correctamente el refreshToken

  try {
    if (!refreshToken) {
      return res.status(403).json({ message: "No refresh token provided" });
    }

    // Verifica y decodifica el refresh token
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
        if (err) {
          console.error("Error al verificar el refresh token:", err);
          return reject(new Error("Failed to authenticate token"));
        }
        resolve(decoded);
      });
    });

    // Extraemos el userId del payload del refresh token
    const { userId } = decoded;

    // Buscar al usuario en la base de datos utilizando el userId
    const user = await prisma.usuario.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generar un nuevo access token usando los datos del usuario
    const accessToken = generateAccessToken(user);

    // Establecer el nuevo access token en la cookie HttpOnly
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 1000, // 1 hora
      sameSite: 'Strict',
      path: '/',
    });

    return res.status(200).json({ message: "Token refreshed successfully", accessToken });
  } catch (error) {
    console.error("Error en el tokenController:", error);
    next(error);
  }
};
