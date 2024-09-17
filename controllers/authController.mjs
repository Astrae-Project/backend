import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const registerUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Por favor, envía email y contraseña' });
  }

  try {
    // Comprobar si el usuario ya existe
    const existingUser = await prisma.usuario.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear nuevo usuario
    const newUser = await prisma.usuario.create({
      data: {
        email,
        password: hashedPassword,
      }
    });

    const userId = newUser.id;
    res.status(201).json({ message: 'Usuario registrado con éxito', id: userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al registrar el usuario' });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Validar que los campos email y password están presentes
  if (!email || !password) {
    return res.status(400).json({ message: 'Los campos email y contraseña son obligatorios' });
  }

  try {
    // Verificar si el usuario existe en la base de datos
    const user = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar si la contraseña proporcionada coincide con la almacenada (encriptada)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign({ userId: user.id, role: user.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Enviar token en cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Asegura que solo en producción sea HTTPS
      maxAge: 3600000 // 1 hora
    });

    return res.status(200).json({ message: 'Inicio de sesión exitoso', token });

  } catch (error) {
    return res.status(500).json({ message: 'Error en el servidor', error });
  }
};
