const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const isStaff = (req, res, next) => {
  if (req.user.role !== 'Staff') {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
};

const isMember = (req, res, next) => {
  if (req.user.role !== 'Member') {
    return res.status(403).json({ error: 'Member access required' });
  }
  next();
};

module.exports = { authenticateToken, isStaff, isMember };
