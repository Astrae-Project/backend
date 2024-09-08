import pool from '../db.mjs';

export const createUser = async (email, hashedPassword) => {
  const result = await pool.query(
    'INSERT INTO usuarios (email, contraseña) VALUES ($1, $2) RETURNING id',
    [email, hashedPassword]
  );
  const id = result.rows[0].id;
  return id
};

export const findUserByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  return result.rows[0];
};
