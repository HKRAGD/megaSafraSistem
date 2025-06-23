/**
 * Script para limpar rate limits em desenvolvimento
 */

const express = require('express');
const rateLimit = require('express-rate-limit');

console.log('🧹 Limpando rate limits...');

// O express-rate-limit usa memória por padrão em desenvolvimento
// Para limpar, precisamos reiniciar o servidor ou usar um store persistente

console.log('ℹ️ Para limpar completamente os rate limits:');
console.log('1. Reinicie o servidor backend (Ctrl+C e npm run dev)');
console.log('2. Ou aguarde o tempo de janela especificado');
console.log('3. Ou use um store Redis em produção');

console.log('\n📋 Configurações atuais:');
console.log('- Login: 20 tentativas/15min (desenvolvimento)');
console.log('- API Geral: 5000 requests/hora (desenvolvimento)');
console.log('- Produção: limites mais restritivos aplicados');

process.exit(0);