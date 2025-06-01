const jwt = require('jsonwebtoken');

const authConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
};

// Gerar token JWT
const generateToken = (payload) => {
  if (!authConfig.secret) {
    throw new Error('JWT_SECRET não definido nas variáveis de ambiente');
  }

  return jwt.sign(payload, authConfig.secret, {
    expiresIn: authConfig.expiresIn
  });
};

// Gerar refresh token
const generateRefreshToken = (payload) => {
  if (!authConfig.refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET não definido nas variáveis de ambiente');
  }

  return jwt.sign(payload, authConfig.refreshSecret, {
    expiresIn: authConfig.refreshExpiresIn
  });
};

// Verificar token JWT
const verifyToken = (token) => {
  if (!authConfig.secret) {
    throw new Error('JWT_SECRET não definido nas variáveis de ambiente');
  }

  return jwt.verify(token, authConfig.secret);
};

// Verificar refresh token
const verifyRefreshToken = (token) => {
  if (!authConfig.refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET não definido nas variáveis de ambiente');
  }

  return jwt.verify(token, authConfig.refreshSecret);
};

// Decodificar token sem verificar (útil para debug)
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  authConfig,
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  decodeToken
}; 