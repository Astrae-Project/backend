export const getProfile = (req, res) => {
    // Acceder a los datos del usuario desde el token decodificado
    const userId = req.user.userId;
  
    // Aquí puedes realizar la lógica para obtener el perfil del usuario desde la base de datos
    res.json({ message: `Perfil del usuario con ID: ${userId}` });
  };
  
  export const updateProfile = (req, res) => {
    const userId = req.user.userId;
    const { nombre, email } = req.body;
  
    // Aquí puedes realizar la lógica para actualizar el perfil del usuario en la base de datos
    res.json({ message: `Perfil del usuario con ID: ${userId} actualizado`, data: { nombre, email } });
  };
  