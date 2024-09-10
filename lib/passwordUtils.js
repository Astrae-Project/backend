import bcrypt from 'bcrypt';

// Función para comparar la contraseña ingresada con el hash almacenado
const comparePassword = async (contraseña, hash) => {
  try {
    if (!contraseña || !hash) {
      throw new Error('La contraseña o el hash están vacíos');
    }
    const isMatch = await bcrypt.compare(contraseña, hash);
    return isMatch;
  } catch (error) {
    console.error('Error al comparar la contraseña:', error);
    throw error;
  }
};

export default comparePassword;
