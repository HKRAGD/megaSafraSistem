# Correção: Importação de Peso da Planilha Excel

## 🚨 Problema Identificado

Na importação de produtos via planilha Excel, o script estava interpretando incorretamente a coluna **"KG"**.

### ❌ Comportamento Anterior (Incorreto)
- **Interpretação**: Coluna "KG" = Peso Total do produto
- **Cálculo**: `weightPerUnit = KG ÷ quantidade`
- **Resultado**: Peso total igual ao valor da coluna "KG"

### ✅ Comportamento Corrigido
- **Interpretação**: Coluna "KG" = Peso Unitário de cada item
- **Cálculo**: `weightPerUnit = KG` (valor da coluna)
- **Resultado**: Peso total = `quantidade × peso unitário`

## 📊 Exemplo Prático

### Dados da Planilha:
```
| Quadra | Lado | Fila | Andar | Produto | Lote        | Quantidade | KG |
|--------|------|------|-------|---------|-------------|------------|----|
| 1      | A    | 1    | 1     | MILHO   | LOT-2024-01 | 17         | 15 |
```

### Comparação de Resultados:

| Aspecto | Antes (❌ Errado) | Depois (✅ Correto) |
|---------|-------------------|---------------------|
| **Interpretação da coluna KG** | Peso total | Peso unitário |
| **Peso por unidade** | 15 ÷ 17 = 0.88kg | 15kg |
| **Peso total** | 15kg | 17 × 15 = 255kg |
| **Lógica** | 17 sacos pesam 15kg total | 17 sacos de 15kg cada |

## 🔧 Alterações no Código

### Arquivo: `backend/scripts/importFromExcelFixed.js`

#### 1. Renomeação da Variável
```javascript
// ANTES
kg: kg ? parseFloat(kg) : null

// DEPOIS  
kgUnitario: kg ? parseFloat(kg) : null // Deixa claro que é peso unitário
```

#### 2. Cálculo do Peso Unitário
```javascript
// ANTES
const weightPerUnit = kg / quantidade; // Divisão incorreta

// DEPOIS
const weightPerUnit = kgUnitario; // Direto da planilha
```

#### 3. Cálculo do Peso Total
```javascript
// ANTES
const totalWeight = kg; // Usava valor da coluna diretamente

// DEPOIS
const totalWeight = quantidade * kgUnitario; // Cálculo correto
```

#### 4. Criação do Produto
```javascript
// ANTES
const product = new Product({
  // ...
  weightPerUnit: kg / quantidade,
  totalWeight: kg,
  // ...
});

// DEPOIS
const product = new Product({
  // ...
  weightPerUnit: kgUnitario,
  // totalWeight será calculado automaticamente pelo model
  // ...
});
```

## 🧮 Casos de Teste

| Quantidade | KG (Planilha) | Peso Total Anterior | Peso Total Correto |
|------------|---------------|--------------------|--------------------|
| 17         | 15            | 15kg               | 255kg              |
| 10         | 25            | 25kg               | 250kg              |
| 8          | 30            | 30kg               | 240kg              |
| 25         | 12.5          | 12.5kg             | 312.5kg            |

## 🎯 Benefícios da Correção

1. **Precisão nos Dados**: Peso total agora reflete a realidade
2. **Consistência**: Alinhamento com a estrutura da planilha
3. **Rastreabilidade**: Peso unitário correto para cálculos futuros
4. **Relatórios**: Dados precisos para relatórios de capacidade

## 🔍 Validação

### Script de Demonstração
```bash
cd backend
node scripts/demonstrarCorrecaoPeso.js
```

### Verificação Manual
1. Antes da correção: 17 itens × 15kg = produto com 15kg total ❌
2. Após a correção: 17 itens × 15kg = produto com 255kg total ✅

## 📝 Logs Informativos

O script agora mostra logs mais claros:

```
📊 Linha 2: 17 unidades × 15kg = 255kg total
✅ Linha 2: Produto "MILHO - Lote LOT-2024-01" importado com sucesso
```

## 🚀 Como Usar

1. **Executar Script Corrigido**:
   ```bash
   cd backend
   node scripts/importFromExcelFixed.js caminho/para/planilha.xlsx
   ```

2. **Verificar Resultados**:
   ```bash
   node scripts/verifyImport.js
   ```

## ⚠️ Importante

- A correção se aplica apenas a **futuras importações**
- Produtos já importados com peso incorreto precisariam ser corrigidos manualmente
- A planilha deve manter o formato: coluna "KG" = peso unitário

---

**Data da Correção**: Janeiro 2025  
**Arquivo Modificado**: `backend/scripts/importFromExcelFixed.js`  
**Status**: ✅ **CORREÇÃO APLICADA E TESTADA** 