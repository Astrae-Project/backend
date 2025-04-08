import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next, err) => {
  const token = req.cookies.token; 

  try {
    if (!token) {
      return res.status(401).json({ message: "User not authorized" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Verification failed" });
      }
      req.user = user;
      next(); 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
