/**
 * Testes de Integração - Correções FSM e Transações Atômicas
 * Valida as correções implementadas nos gaps identificados
 */

const mongoose = require('mongoose');
const Product = require('../../models/Product');
const WithdrawalRequest = require('../../models/WithdrawalRequest');
const Location = require('../../models/Location');
const Movement = require('../../models/Movement');
const User = require('../../models/User');
const { PRODUCT_STATUS, WITHDRAWAL_STATUS, WITHDRAWAL_TYPE } = require('../../utils/constants');
const withdrawalService = require('../../services/withdrawalService');

describe('FSM Corrections and Atomic Transactions', () => {
  let testUser, testLocation, testProduct, testSeedType;

  beforeEach(async () => {
    // Setup dados de teste
    testUser = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'hashedpass',
      role: 'ADMIN'
    });

    testLocation = await Location.create({
      code: 'T1-L1-F1-A1',
      coordinates: { block: 1, side: 1, row: 1, level: 1 },
      maxCapacityKg: 1000,
      isOccupied: false
    });

    testProduct = await Product.create({
      name: 'Soja Premium',
      lot: 'LOT001',
      seedTypeId: new mongoose.Types.ObjectId(),
      quantity: 100,
      storageType: 'saco',
      weightPerUnit: 50,
      totalWeight: 5000,
      locationId: testLocation._id,
      status: PRODUCT_STATUS.LOCADO,
      metadata: { createdBy: testUser._id }
    });

    // Marcar localização como ocupada
    await Location.findByIdAndUpdate(testLocation._id, {
      isOccupied: true,
      currentWeightKg: 5000
    });
  });

  afterEach(async () => {
    await Product.deleteMany({});
    await WithdrawalRequest.deleteMany({});
    await Location.deleteMany({});
    await Movement.deleteMany({});
    await User.deleteMany({});
  });

  describe('1. Constantes FSM e Status Strings Corretos', () => {
    test('deve usar constantes FSM em vez de strings hardcoded', async () => {
      const product = await Product.findById(testProduct._id);
      expect(product.status).toBe(PRODUCT_STATUS.LOCADO);
      
      // Testar outros métodos que usavam strings incorretas
      const pendingProducts = await Product.findPendingLocation();
      expect(Array.isArray(pendingProducts)).toBe(true);
      
      const pendingWithdrawal = await Product.findPendingWithdrawal();
      expect(Array.isArray(pendingWithdrawal)).toBe(true);
    });

    test('deve validar índice com status correto', async () => {
      // Tentar criar outro produto na mesma localização deve falhar
      await expect(Product.create({
        name: 'Outro produto',
        lot: 'LOT002',
        seedTypeId: new mongoose.Types.ObjectId(),
        quantity: 50,
        storageType: 'saco',
        weightPerUnit: 30,
        locationId: testLocation._id,
        status: PRODUCT_STATUS.LOCADO
      })).rejects.toThrow();
    });
  });

  describe('2. Transição cancelWithdrawal', () => {
    test('deve cancelar solicitação de retirada corretamente', async () => {
      // Criar solicitação
      await testProduct.requestWithdrawal(testUser._id, 'Teste');
      expect(testProduct.status).toBe(PRODUCT_STATUS.AGUARDANDO_RETIRADA);

      // Cancelar solicitação
      await testProduct.cancelWithdrawal(testUser._id, 'Cancelamento teste');
      
      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct.status).toBe(PRODUCT_STATUS.LOCADO);
      expect(updatedProduct.version).toBe(testProduct.version + 2); // +1 request, +1 cancel
    });

    test('deve falhar ao cancelar produto não aguardando retirada', async () => {
      await expect(testProduct.cancelWithdrawal(testUser._id))
        .rejects.toThrow('Apenas produtos aguardando retirada podem ter solicitação cancelada');
    });
  });

  describe('3. Retirada Parcial com Transações Atômicas', () => {
    test('deve processar retirada parcial corretamente', async () => {
      // Criar solicitação de retirada parcial
      const withdrawalData = {
        productId: testProduct._id,
        type: WITHDRAWAL_TYPE.PARCIAL,
        quantityRequested: 30,
        reason: 'Teste retirada parcial'
      };

      const result = await withdrawalService.createWithdrawalRequest(
        withdrawalData, 
        testUser._id
      );

      expect(result.success).toBe(true);
      expect(result.data.withdrawalRequest.type).toBe(WITHDRAWAL_TYPE.PARCIAL);
      expect(result.data.withdrawalRequest.quantityRequested).toBe(30);

      // Verificar produto foi atualizado
      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct.status).toBe(PRODUCT_STATUS.AGUARDANDO_RETIRADA);
      expect(updatedProduct.version).toBe(testProduct.version + 1);
    });

    test('deve confirmar retirada parcial e ajustar quantidades', async () => {
      // Setup: produto aguardando retirada
      await testProduct.requestWithdrawal(testUser._id);
      
      const withdrawal = await WithdrawalRequest.create({
        productId: testProduct._id,
        requestedBy: testUser._id,
        type: WITHDRAWAL_TYPE.PARCIAL,
        quantityRequested: 30,
        status: WITHDRAWAL_STATUS.PENDENTE
      });

      // Confirmar usando método atualizado do Product
      await testProduct.confirmWithdrawal(testUser._id, 30, 'Confirmação parcial');

      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct.status).toBe(PRODUCT_STATUS.LOCADO); // Volta para LOCADO
      expect(updatedProduct.quantity).toBe(70); // 100 - 30
      expect(updatedProduct.totalWeight).toBe(3500); // 70 * 50
    });

    test('deve confirmar retirada total e marcar como RETIRADO', async () => {
      await testProduct.requestWithdrawal(testUser._id);
      
      // Confirmar retirada total (sem quantidade especificada)
      await testProduct.confirmWithdrawal(testUser._id, null, 'Confirmação total');

      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct.status).toBe(PRODUCT_STATUS.RETIRADO);
    });
  });

  describe('4. Optimistic Locking', () => {
    test('deve falhar ao atualizar produto com versão antiga', async () => {
      const product1 = await Product.findById(testProduct._id);
      const product2 = await Product.findById(testProduct._id);

      // Atualizar product1
      product1.notes = 'Atualização 1';
      product1.version += 1;
      await product1.save();

      // Tentar atualizar product2 (versão antiga)
      product2.notes = 'Atualização 2';
      product2.version += 1;
      
      await expect(product2.save()).rejects.toThrow();
    });

    test('deve usar optimistic locking em transações de retirada', async () => {
      // Simular concorrência: duas tentativas de criar solicitação
      const withdrawalData = {
        productId: testProduct._id,
        type: WITHDRAWAL_TYPE.TOTAL,
        reason: 'Teste concorrência'
      };

      // Primeira solicitação deve suceder
      const result1 = await withdrawalService.createWithdrawalRequest(
        withdrawalData, 
        testUser._id
      );
      expect(result1.success).toBe(true);

      // Segunda solicitação deve falhar (produto não está mais LOCADO)
      await expect(withdrawalService.createWithdrawalRequest(
        withdrawalData, 
        testUser._id
      )).rejects.toThrow('Apenas produtos locados podem ter retirada solicitada');
    });
  });

  describe('5. Validação de Transições FSM', () => {
    test('deve respeitar transições válidas do FSM', async () => {
      // LOCADO → AGUARDANDO_RETIRADA (válida)
      await testProduct.requestWithdrawal(testUser._id);
      expect(testProduct.status).toBe(PRODUCT_STATUS.AGUARDANDO_RETIRADA);

      // AGUARDANDO_RETIRADA → LOCADO (cancelamento - válida)
      await testProduct.cancelWithdrawal(testUser._id);
      const updated = await Product.findById(testProduct._id);
      expect(updated.status).toBe(PRODUCT_STATUS.LOCADO);
    });

    test('deve impedir transições inválidas', async () => {
      // Tentar cancelar retirada de produto LOCADO (inválida)
      await expect(testProduct.cancelWithdrawal(testUser._id))
        .rejects.toThrow();
    });
  });

  describe('6. Casos de Borda', () => {
    test('deve tratar erro de quantidade inválida para retirada parcial', async () => {
      const withdrawalData = {
        productId: testProduct._id,
        type: WITHDRAWAL_TYPE.PARCIAL,
        quantityRequested: 150, // Maior que quantidade total (100)
        reason: 'Quantidade inválida'
      };

      await expect(withdrawalService.createWithdrawalRequest(
        withdrawalData, 
        testUser._id
      )).rejects.toThrow('Quantidade para retirada parcial deve ser menor que a quantidade total');
    });

    test('deve manter integridade em caso de falha de transação', async () => {
      // Mock de erro durante transação
      const originalCreate = WithdrawalRequest.create;
      WithdrawalRequest.create = jest.fn().mockRejectedValue(new Error('Database error'));

      const withdrawalData = {
        productId: testProduct._id,
        type: WITHDRAWAL_TYPE.TOTAL,
        reason: 'Teste rollback'
      };

      await expect(withdrawalService.createWithdrawalRequest(
        withdrawalData, 
        testUser._id
      )).rejects.toThrow();

      // Verificar que produto não foi alterado
      const unchangedProduct = await Product.findById(testProduct._id);
      expect(unchangedProduct.status).toBe(PRODUCT_STATUS.LOCADO);
      expect(unchangedProduct.version).toBe(testProduct.version);

      // Restaurar método original
      WithdrawalRequest.create = originalCreate;
    });
  });
});

module.exports = {}; 