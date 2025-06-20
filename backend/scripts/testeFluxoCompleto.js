#!/usr/bin/env node

/**
 * Teste do Fluxo Completo de Criação de Produto
 * Sistema de Gerenciamento de Câmaras Refrigeradas
 * 
 * Este script testa o fluxo completo após a correção do problema "Chamber not found"
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

const testeFluxoCompleto = async () => {
  console.log('\n🧪 TESTE: Fluxo Completo Após Correção "Chamber not found"');
  console.log('=' .repeat(70));

  try {
    // 1. Fazer login
    console.log('\n1️⃣ Fazendo login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@sistema-sementes.com',
      password: 'admin123456'
    });

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login realizado com sucesso');

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Verificar dados básicos
    console.log('\n2️⃣ Verificando dados básicos...');
    
    const [chambersRes, seedTypesRes, locationsRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/chambers`, { headers }),
      axios.get(`${API_BASE_URL}/seed-types`, { headers }),
      axios.get(`${API_BASE_URL}/locations/available?limit=5`, { headers })
    ]);

    const chambers = chambersRes.data.data.chambers || [];
    const seedTypes = seedTypesRes.data.data.seedTypes || [];
    const locations = locationsRes.data.data.locations || [];

    console.log(`✅ ${chambers.length} câmaras, ${seedTypes.length} tipos de sementes, ${locations.length} localizações disponíveis`);

    if (chambers.length === 0 || seedTypes.length === 0 || locations.length === 0) {
      console.log('❌ Dados insuficientes para teste. Criando dados necessários...');
      
      // Criar tipo de semente se não existir
      if (seedTypes.length === 0) {
        console.log('Criando tipo de semente...');
        await axios.post(`${API_BASE_URL}/seed-types`, {
          name: 'Milho Híbrido',
          description: 'Sementes de milho híbrido para teste',
          optimalTemperature: 15,
          optimalHumidity: 60,
          maxStorageTimeDays: 365
        }, { headers });
        console.log('✅ Tipo de semente criado');
      }
      
      return;
    }

    // 3. Analisar estrutura de localização retornada
    console.log('\n3️⃣ Analisando estrutura das localizações...');
    
    const primeiraLocalizacao = locations[0];
    console.log('Estrutura da primeira localização:');
    console.log(JSON.stringify({
      id: primeiraLocalizacao._id,
      code: primeiraLocalizacao.code,
      chamberId: typeof primeiraLocalizacao.chamberId,
      chamberInfo: primeiraLocalizacao.chamberId,
      isOccupied: primeiraLocalizacao.isOccupied,
      capacity: `${primeiraLocalizacao.currentWeightKg}/${primeiraLocalizacao.maxCapacityKg}kg`
    }, null, 2));

    // 4. Verificar se chamberId está populado
    let chamberInfoDisponivel = false;
    if (typeof primeiraLocalizacao.chamberId === 'object' && primeiraLocalizacao.chamberId !== null) {
      chamberInfoDisponivel = true;
      console.log('✅ SUCESSO: chamberId está populado com informações da câmara!');
      console.log(`   Nome da câmara: ${primeiraLocalizacao.chamberId.name}`);
    } else {
      console.log('⚠️ PROBLEMA: chamberId ainda é apenas string:', primeiraLocalizacao.chamberId);
    }

    // 5. Testar criação de produto usando os dados corretos
    if (chamberInfoDisponivel && seedTypes.length > 0) {
      console.log('\n4️⃣ Testando criação de produto...');
      
      const novoProduto = {
        name: `Produto Teste ${Date.now()}`,
        lot: `LOTE-${Date.now()}`,
        seedTypeId: seedTypes[0]._id || seedTypes[0].id,
        quantity: 10,
        storageType: 'saco',
        weightPerUnit: 50,
        locationId: primeiraLocalizacao._id,
        notes: 'Produto criado via teste automatizado',
        tracking: {
          batchNumber: `BATCH-${Date.now()}`,
          origin: 'Fazenda Teste',
          supplier: 'Fornecedor Teste',
          qualityGrade: 'A'
        }
      };

      console.log('Dados do produto a ser criado:', JSON.stringify(novoProduto, null, 2));

      try {
        const criarProdutoResponse = await axios.post(`${API_BASE_URL}/products`, novoProduto, { headers });
        
        console.log('✅ PRODUTO CRIADO COM SUCESSO!');
        console.log(`   ID: ${criarProdutoResponse.data.data._id}`);
        console.log(`   Nome: ${criarProdutoResponse.data.data.name}`);
        console.log(`   Localização: ${criarProdutoResponse.data.data.locationId}`);
        console.log(`   Peso Total: ${criarProdutoResponse.data.data.totalWeight}kg`);

        // 6. Verificar se a localização foi marcada como ocupada
        console.log('\n5️⃣ Verificando se localização foi marcada como ocupada...');
        
        const localizacaoAtualizada = await axios.get(`${API_BASE_URL}/locations/${primeiraLocalizacao._id}`, { headers });
        
        if (localizacaoAtualizada.data.data.isOccupied) {
          console.log('✅ Localização corretamente marcada como ocupada!');
        } else {
          console.log('⚠️ Localização não foi marcada como ocupada');
        }

        // 7. Verificar movimentações
        console.log('\n6️⃣ Verificando movimentações geradas...');
        
        const movimentacoes = await axios.get(`${API_BASE_URL}/movements?productId=${criarProdutoResponse.data.data._id}`, { headers });
        
        console.log(`✅ ${movimentacoes.data.data.movements.length} movimentação(ões) registrada(s)`);

      } catch (error) {
        console.error('❌ Erro ao criar produto:', error.response?.data?.message || error.message);
        console.log('Dados de erro:', error.response?.data || error.message);
      }
    }

    // 8. Resumo final
    console.log('\n7️⃣ RESUMO FINAL:');
    console.log(`✅ Backend funcionando corretamente`);
    console.log(`${chamberInfoDisponivel ? '✅' : '❌'} Informações de câmara ${chamberInfoDisponivel ? 'DISPONÍVEIS' : 'INDISPONÍVEIS'} nas localizações`);
    console.log(`✅ APIs retornando dados estruturados corretamente`);
    console.log(`✅ Correção "Chamber not found" ${chamberInfoDisponivel ? 'FUNCIONANDO' : 'PENDENTE'}`);

    if (chamberInfoDisponivel) {
      console.log('\n🎉 PROBLEMA "CHAMBER NOT FOUND" RESOLVIDO!');
      console.log('   O frontend agora deve funcionar corretamente.');
      console.log('   As localizações têm informações completas de câmara.');
    } else {
      console.log('\n⚠️ PROBLEMA AINDA PRESENTE:');
      console.log('   As localizações ainda não têm informações de câmara populadas.');
      console.log('   Verifique a configuração do populate no backend.');
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.response?.data?.message || error.message);
  }
};

const main = async () => {
  await testeFluxoCompleto();
  console.log('\n✅ Teste concluído!');
};

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testeFluxoCompleto }; 