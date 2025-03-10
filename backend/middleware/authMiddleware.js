const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

const authenticateUser = (req, res, next) => {
  // Get token from cookie OR from Authorization header (for React Native)
  const token = 
    req.cookies.auth_token || 
    (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user data to request
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Invalid or expired authentication' });
  }
};

const generateToken = (userData) => {
  return jwt.sign(
    userData,
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = {
  authenticateUser,
  generateToken,
  JWT_SECRET
};