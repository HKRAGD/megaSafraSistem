const mongoose = require('mongoose');

/**
 * Verifica se o MongoDB atual suporta transações
 * Transações requerem replica set ou sharded cluster
 * @returns {Promise<boolean>} true se transações estão disponíveis
 */
const checkTransactionSupport = async () => {
  try {
    // Verificar se estamos conectados
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB não está conectado para verificar suporte a transações');
      return false;
    }

    // Tentar obter informações do replica set
    const admin = mongoose.connection.db.admin();
    const result = await admin.command({ isMaster: 1 });
    
    // Verificar se é um replica set ou mongos (sharded)
    const isReplicaSet = result.setName !== undefined;
    const isMongos = result.msg === 'isdbgrid';
    
    const supportsTransactions = isReplicaSet || isMongos;
    
    console.log(`[Database] Verificação de transações:`, {
      isReplicaSet,
      isMongos,
      setName: result.setName,
      supportsTransactions,
      connectionString: mongoose.connection.host
    });
    
    return supportsTransactions;
    
  } catch (error) {
    console.warn('[Database] Erro ao verificar suporte a transações:', error.message);
    // Em caso de erro, assumir que não suporta transações (mais seguro)
    return false;
  }
};

/**
 * Executa uma operação com transação se disponível, senão executa sem transação
 * @param {Function} operation - Função async a ser executada
 * @param {Object} options - Opções da operação
 * @returns {Promise<any>} Resultado da operação
 */
const executeWithTransactionIfAvailable = async (operation, options = {}) => {
  const canUseTransactions = await checkTransactionSupport();
  
  if (canUseTransactions) {
    // Executar com transação
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      console.log('[Database] Executando operação COM transação');
      const result = await operation({ session, useTransactions: true });
      await session.commitTransaction();
      console.log('[Database] Transação commitada com sucesso');
      return result;
    } catch (error) {
      await session.abortTransaction();
      console.error('[Database] Transação abortada devido a erro:', error.message);
      throw error;
    } finally {
      session.endSession();
    }
  } else {
    // Executar sem transação
    console.warn('[Database] Executando operação SEM transação (fallback)');
    return await operation({ session: null, useTransactions: false });
  }
};

module.exports = {
  checkTransactionSupport,
  executeWithTransactionIfAvailable
};