const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    console.log(`Auth middleware: No token provided for ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ 
      success: false,
      message: 'No token, authorization denied' 
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, role, department }
    console.log(`Auth middleware: User ${req.user.userId} (${req.user.role}) authenticated for ${req.method} ${req.originalUrl}`);
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    res.status(401).json({ 
      success: false,
      message: 'Token is not valid',
      error: err.message 
    });
  }
};
