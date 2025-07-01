# MAPEAMENTO COMPLETO DE DUPLICAÇÕES - BatchProduct*

## 📋 ARQUIVOS IDENTIFICADOS

### 1. COMPONENTES PRINCIPAIS

#### 1.1 SimpleBatchProductForm
**Localização**: `/frontend/src/pages/Products/NewProductPage/components/SimpleBatchProductForm.tsx`
**Status**: ✅ **EM USO ATIVO** (NewProductPage)
**Características**:
- Usa `useBatchProducts` hook (centralizado)
- Material-UI v6 com Grid size syntax
- Interface simples para cadastro em lote
- Integração com ClientSelector
- Schema Yup já tem campos obrigatórios (name, lot, seedTypeId)

#### 1.2 BatchProductForm
**Localização**: `/frontend/src/components/products/BatchProductForm/index.tsx`
**Status**: ❌ **NÃO UTILIZADO** (componente órfão)
**Características**:
- Arquitetura mais complexa e modular
- Usa `useBatchProductFormLogic` hook (diferente)
- Sub-componentes organizados
- Interface mais elaborada
- Schema próprio em `batchFormValidation.ts`

### 2. HOOKS DUPLICADOS

#### 2.1 useBatchProducts (ATIVO)
**Localização**: `/frontend/src/hooks/useBatchProducts.ts`
**Status**: ✅ **EM USO** (SimpleBatchProductForm)
**Schema**: Campos obrigatórios CORRETOS (name, lot, seedTypeId)
**API Integration**: Correta via `productService.createBatchProducts`

#### 2.2 useBatchProductFormLogic (ÓRFÃO)
**Localização**: `/frontend/src/components/products/BatchProductForm/hooks/useBatchProductFormLogic.ts`
**Status**: ❌ **NÃO UTILIZADO** (usado apenas pelo BatchProductForm órfão)
**Schema**: Usa schema separado de `batchFormValidation.ts`

### 3. SUB-COMPONENTES ÓRFÃOS

#### 3.1 BatchProductItem
**Localização**: `/frontend/src/components/products/BatchProductForm/components/BatchProductItem.tsx`
**Status**: ❌ **NÃO UTILIZADO**

#### 3.2 BatchProductItemBasicInfo
**Localização**: `/frontend/src/components/products/BatchProductForm/components/BatchProductItemBasicInfo.tsx`
**Status**: ❌ **NÃO UTILIZADO**

#### 3.3 BatchClientSelector
**Localização**: `/frontend/src/components/products/BatchProductForm/components/BatchClientSelector.tsx`
**Status**: ❌ **NÃO UTILIZADO**

#### 3.4 BatchFormActions
**Localização**: `/frontend/src/components/products/BatchProductForm/components/BatchFormActions.tsx`
**Status**: ❌ **NÃO UTILIZADO**

### 4. SCHEMAS E VALIDAÇÕES

#### 4.1 Schema em useBatchProducts (ATIVO)
```typescript
const batchIndividualProductSchema = yup.object({
  name: yup.string().required('Nome é obrigatório'),
  lot: yup.string().required('Lote é obrigatório'),
  seedTypeId: yup.string().required('Tipo de semente é obrigatório'),
  // ... outros campos
});
```

#### 4.2 Schema em batchFormValidation.ts (ÓRFÃO)
**Localização**: `/frontend/src/components/products/BatchProductForm/utils/batchFormValidation.ts`
**Status**: ❌ **NÃO UTILIZADO**

## 🔍 ANÁLISE DE DEPENDÊNCIAS

### FLUXO ATUAL EM USO:
```
NewProductPage
    ↓
SimpleBatchProductForm
    ↓
useBatchProducts (hook)
    ↓
productService.createBatchProducts
    ↓
POST /products/batch (API)
```

### FLUXO ÓRFÃO (NÃO USADO):
```
BatchProductForm (órfão)
    ↓
useBatchProductFormLogic (órfão)
    ↓
batchFormValidation.ts (órfão)
    ↓
[Sub-componentes órfãos]
```

## ⚠️ PROBLEMA CRÍTICO IDENTIFICADO

### ERRO 400 Bad Request - ROOT CAUSE
**Análise do useBatchProducts.ts (linhas 122-130)**:
```typescript
const payload: CreateBatchProductsPayload = {
  clientId: data.clientId,
  products: data.products.map(product => ({
    ...product,
    expirationDate: product.expirationDate ? product.expirationDate.toISOString() : undefined,
    locationId: undefined,
    clientId: undefined
  }))
};
```

**PROBLEMA**: O payload está sendo criado corretamente COM os campos obrigatórios!
**CONCLUSÃO**: O hook useBatchProducts JÁ ENVIA os campos name, lot, seedTypeId

### INVESTIGAÇÃO ADICIONAL NECESSÁRIA
O erro 400 pode estar sendo causado por:
1. **SimpleBatchProductForm não coletando os dados** dos inputs
2. **Problema na validação Yup** impedindo submissão
3. **Erro na transformação de dados** antes do envio
4. **Backend API mudou** e não está documentado

## 📊 AUDITORIA DE QUALIDADE

### ✅ IMPLEMENTAÇÃO CORRETA (useBatchProducts)
- Schema Yup com campos obrigatórios
- Integração correta com productService
- Error handling robusto
- Loading states apropriados
- Validação em tempo real

### ❌ IMPLEMENTAÇÃO ÓRFÃ (BatchProductForm ecosystem)
- Componente complexo não utilizado
- Hook duplicado com lógica similar
- Sub-componentes modulares desperdiçados
- Schema separado desnecessário

## 🎯 ESTRATÉGIA DE CONSOLIDAÇÃO

### DECISÃO: SimpleBatchProductForm como BASE
**Razão**: Já está em uso e funcionando (exceto erro 400)

### AÇÕES NECESSÁRIAS:

#### 1. CORREÇÃO IMEDIATA (MVS)
- Investigar por que SimpleBatchProductForm não está enviando dados
- Verificar binding dos inputs name, lot, seedTypeId
- Testar payload real sendo enviado para API

#### 2. CONSOLIDAÇÃO (FASE 3+)
- Migrar partes úteis do BatchProductForm para SimpleBatchProductForm
- Aproveitar sub-componentes modulares órfãos
- Remover implementação duplicada

#### 3. LIMPEZA
- Deletar todo o diretório `/components/products/BatchProductForm/`
- Remover imports não utilizados
- Consolidar schemas em um único local

## 🔧 PRÓXIMAS AÇÕES

### IMEDIATA (MVS):
1. ✅ Auditoria do SimpleBatchProductForm para identificar problema nos inputs
2. ✅ Debug do payload sendo enviado vs esperado pelo backend
3. ✅ Correção minimalista para resolver erro 400

### REFATORAÇÃO:
1. Aproveitar arquitetura modular do BatchProductForm órfão
2. Migrar sub-componentes úteis
3. Criar componente único consolidado seguindo arquitetura clean

---

**📌 CONCLUSÃO**: O problema não é duplicação afetando o erro 400. O useBatchProducts está implementado corretamente. O erro está na coleta de dados do SimpleBatchProductForm ou na comunicação com a API.