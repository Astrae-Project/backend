import pool from "../db.mjs";
import jwt from 'jsonwebtoken';

export const selectRole = async (req, res) => {
    const userId = req.params.id;
    const { rol } = req.body;
  
    // Validar el rol recibido
    if (!rol || (rol !== 'inversor' && rol !== 'startup')) {
      return res.status(400).json({ message: 'Selecciona un rol válido' });
    }
  
    try {
      // Comprobar si el usuario ya existe
      const userResult = await pool.query('SELECT * FROM usuarios WHERE id = $1', [userId]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
  
      const user = userResult.rows[0];
  
      // Verificar si ya tiene un rol asignado
      if (user.rol) {
        return res.status(400).json({ message: 'El usuario ya tiene un rol asignado' });
      }
  
      // Actualizar el rol del usuario en la base de datos
      await pool.query('UPDATE usuarios SET rol = $1 WHERE id = $2', [rol, userId]);
  
      // Redirigir al siguiente paso según el rol
      if (rol === 'inversor') {
        return res.json({ message: 'Rol seleccionado: inversor', redirectUrl: `/crear-inversor/${userId}` });
      } else if (rol === 'startup') {
        return res.json({ message: 'Rol seleccionado: startup', redirectUrl: `/crear-startup/${userId}` });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error al seleccionar el rol' });
    }
  };  

  export const investorRole = async (req, res) => {
    const userId = req.params.id; // ID del usuario

    const { nombre_inversor, perfil_inversion } = req.body;
  
    if (!nombre_inversor || !perfil_inversion) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }
  
    try {
      // Verificar si el inversor ya tiene un perfil
      const existingInversor = await pool.query('SELECT id FROM inversores WHERE id_usuario = $1', [userId]);
      
      if (existingInversor.rows.length > 0) {
        return res.status(400).json({ message: 'El perfil de inversor ya existe para este usuario' });
      }
  
      // Insertar el inversor en la tabla de inversores con un nuevo ID
      const insertInversor = await pool.query(
        'INSERT INTO inversores (id_usuario, nombre, perfil_inversion) VALUES ($1, $2, $3) RETURNING id',
        [userId, nombre_inversor, perfil_inversion]
      );
  
      const inversorId = insertInversor.rows[0].id;
  
      // Verificar si ya se creó el portfolio (debería ser manejado por el trigger)
      const existingPortfolio = await pool.query('SELECT id FROM portfolios WHERE id_inversor = $1', [inversorId]);
  
      if (existingPortfolio.rows.length > 0) {
        return res.status(400).json({ message: 'El inversor ya tiene un portfolio' });
      }
  
      // Generar el token JWT ahora que el perfil está completo
      const token = jwt.sign({ userId, inversorId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
      // Redirigir a la app con la información del perfil
      res.status(200).json({ message: 'Inversor creado con éxito', redirectTo: 'http://localhost:3000/', token });
    } catch (err) {
      console.error('Error al completar el perfil del inversor:', err);
      res.status(500).json({ message: 'Error al completar el perfil del inversor' });
    }
  }; 

  // Ruta para crear startup
  export const startupRole = async (req, res) => {
    const userId = req.params.id; // ID del usuario

  const { nombre_startup, sector, fase_desarrollo, estado_financiacion, plantilla } = req.body;

  if (!nombre_startup || !sector || !fase_desarrollo || !estado_financiacion || plantilla === undefined) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  try {
    // Verificar si la startup ya tiene un perfil
    const existingStartup = await pool.query('SELECT id FROM startups WHERE id_usuario = $1', [userId]);
    
    if (existingStartup.rows.length > 0) {
      return res.status(400).json({ message: 'El perfil de startup ya existe para este usuario' });
    }

    // Insertar la startup en la tabla de startups con un nuevo ID
    const insertStartup = await pool.query(
      'INSERT INTO startups (id_usuario, nombre, sector, fase_desarrollo, estado_financiacion, plantilla) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [userId, nombre_startup, sector, fase_desarrollo, estado_financiacion, plantilla]
    );

    const startupId = insertStartup.rows[0].id;

    // Generar el token JWT ahora que el perfil está completo
    const token = jwt.sign({ userId, startupId }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Redirigir a la app con la información del perfil
    res.status(200).json({ message: 'Startup creada con éxito', redirectTo: 'http://localhost:3000/', token });
  } catch (err) {
    console.error('Error al completar el perfil de la startup:', err);
    res.status(500).json({ message: 'Error al completar el perfil de la startup' });
  }
};
