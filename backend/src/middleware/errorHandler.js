const mongoose = require('mongoose');

// Middleware global de tratamento de erros
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log do erro (em produção, usar um logger como Winston)
  if (process.env.NODE_ENV !== 'test') {
    console.error('❌ Erro capturado:', err);
  }

  // Erro de validação do Mongoose
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      status: 'error',
      message: `Dados inválidos: ${message}`,
      statusCode: 400
    };
  }

  // Erro de cast do Mongoose (ObjectId inválido)
  if (err.name === 'CastError') {
    error = {
      status: 'error',
      message: 'Recurso não encontrado - ID inválido',
      statusCode: 404
    };
  }

  // Erro de duplicação (chave única)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error = {
      status: 'error',
      message: `${field} '${value}' já existe no sistema`,
      statusCode: 400
    };
  }

  // Erro de JWT
  if (err.name === 'JsonWebTokenError') {
    error = {
      status: 'error',
      message: 'Token inválido',
      statusCode: 401
    };
  }

  // Erro de JWT expirado
  if (err.name === 'TokenExpiredError') {
    error = {
      status: 'error',
      message: 'Token expirado',
      statusCode: 401
    };
  }

  // Erro de conexão com MongoDB
  if (err instanceof mongoose.Error.MongooseServerSelectionError) {
    error = {
      status: 'error',
      message: 'Erro de conexão com o banco de dados',
      statusCode: 500
    };
  }

  // Resposta padrão
  res.status(error.statusCode || 500).json({
    status: error.status || 'error',
    message: error.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Middleware para capturar erros assíncronos
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Classe de erro customizada
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  asyncHandler,
  AppError
}; 