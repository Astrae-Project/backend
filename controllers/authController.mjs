import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const registerUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
      console.log('Faltan datos:', { email, password });
      return res.status(400).json({ message: 'Por favor, envía email y contraseña' });
  }

  try {
      console.log('Verificando si el usuario ya existe...');
      const existingUser = await prisma.usuario.findUnique({
          where: { email }
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
          }
      });

      const userId = newUser.id;
      console.log('Usuario creado con ID:', userId);
      
      const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const refreshToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

      console.log('Token creado:', accessToken); // Log para verificar el token

      res.cookie('token', accessToken, {
          maxAge: 3600000,
          sameSite: 'Strict' // Cambia a 'Lax' si es necesario
      });

      res.cookie('refresh-token', refreshToken, {
          maxAge: 7 * 24 * 60 * 60 * 1000,
          sameSite: 'Strict' // Cambia a 'Lax' si es necesario
      });

      res.status(201).json({ message: 'Usuario registrado con éxito' });
  } catch (err) {
      console.error('Error en el registro:', err);
      res.status(500).json({ message: 'Error al registrar el usuario' });
  }
};


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
      sameSite: 'Strict' // Ajustado para desarrollo y pruebas
    });

    res.cookie('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      sameSite: 'Strict' // Ajustado para desarrollo y pruebas
    });

    return res.status(200).json({ message: 'Inicio de sesión exitoso', accessToken, refreshToken });

  } catch (error) {
    console.error('Error en loginUser:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
};


export const loginOut = async (req,res) => {
  try {
    // Eliminar el token JWT de las cookies
    res.cookie('token', '', { 
      httpOnly: true, // Solo accesible desde el servidor
      secure: process.env.NODE_ENV === 'production', // Solo en HTTPS en producción
      expires: new Date(0) // Establecer una fecha de expiración pasada para eliminar la cookie
    });

    res.status(200).json({ message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    res.status(500).json({ message: 'Error al cerrar sesión' });
  }
}
