/**
 * Test Helpers Index - Infraestrutura de Testes
 * 
 * Arquivo de entrada para todos os helpers de teste, facilitando
 * a importação e uso nos testes de integração.
 * 
 * Uso: const { TestDataFactory, AuthHelpers, MockHelpers } = require('./helpers');
 */

const TestDatabase = require('./TestDatabase');
const TestDataFactory = require('./TestDataFactory');
const AuthHelpers = require('./AuthHelpers');

module.exports = {
  TestDatabase,
  TestDataFactory,
  AuthHelpers
}; 