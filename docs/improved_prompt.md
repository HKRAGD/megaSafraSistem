# Prompt para Implementação do Sistema de Roles e Workflow de Produtos

## 📋 Contexto e Documentação

Você tem acesso ao arquivo `docs/especificacao-roles-workflow.md` que contém a especificação técnica completa do projeto. **IMPORTANTE**: Analise cuidadosamente este documento antes de iniciar, pois ele contém:

- Definições detalhadas dos roles (ADMIN/OPERATOR)
- Estados dos produtos (FSM - Finite State Machine)
- Arquitetura técnica completa (Backend + Frontend)
- Fluxos de trabalho específicos
- Modelos de dados atualizados
- Exemplos de código implementação
- Estratégia de testes e migração

## 🎯 Objetivo Principal

O sistema está **praticamente completo** com a maioria das funcionalidades funcionando, mas precisa de **alterações específicas** no workflow de produtos e implementação do sistema de roles conforme especificado na documentação.

## 🔄 Mudanças Críticas Necessárias

### 1. **Cadastro de Produtos (Alteração Obrigatória)**
**Situação Atual (PROBLEMÁTICA):**
- Sistema obriga cadastrar localização no momento do cadastro do produto
- Não é possível cadastrar produto sem selecionar localização

**Situação Desejada (CONFORME ESPECIFICAÇÃO):**
- **Administrador** cadastra produtos **SEM obrigatoriedade de localização**
- Localização deve ser **OPCIONAL** no cadastro
- Produtos sem localização devem ficar com status `AGUARDANDO_LOCACAO`
- **Administrador ainda pode cadastrar com localização** se desejar (não é proibido, apenas não obrigatório)

### 2. **Sistema de Roles e Controle de Acesso**
**ADMINISTRADOR (ADMIN):**
- ✅ Cadastrar produtos (com ou sem localização)
- ✅ Criar solicitações de retirada (parcial/total)
- ✅ Gerenciar usuários e configurações
- ✅ Acesso a todos os relatórios
- ✅ Acesso completo ao sistema
- ❌ **NÃO executa** ações físicas (confirmação de retirada)

**OPERADOR (OPERATOR):**
- ✅ **Apenas páginas**: Produtos (limitado) e Histórico
- ✅ **Em Produtos pode**: Ver detalhes, Mover (tudo/parcial), Localizar produtos sem localização
- ✅ **Confirmar retiradas** solicitadas pelo admin
- ❌ **NÃO pode**: Remover produtos, Adicionar estoque, Criar solicitações de retirada, Cadastrar novos produtos

### 3. **Novo Fluxo de Retirada (Conforme Especificação FSM)**
1. **Admin** cria solicitação de retirada (parcial/total) → Produto vai para `AGUARDANDO_RETIRADA`
2. **Operador** vê "produto aguardando retirada" e pode apenas **confirmar a retirada**
3. Após confirmação → Produto vai para status `RETIRADO`

### 4. **Interface e Mensagens**
- Produtos sem localização: mostrar **"Produto aguardando locação"** no lugar da localização
- **Novo relatório**: "Total de produtos aguardando locação"
- Navegação condicional baseada em roles
- Ações de produto condicionais conforme permissões

## 📊 Deliverables Esperados

### 1. **Análise da Documentação**
- Leia e analise completamente o arquivo `especificacao-roles-workflow.md`
- Identifique todos os requisitos técnicos
- Entenda a arquitetura proposta (FSM, modelos, endpoints)

### 2. **Plano de Implementação**
- Liste as alterações específicas necessárias no código existente
- Identifique componentes que precisam ser criados/modificados
- Defina ordem de implementação baseada nas dependências

### 3. **Arquivo de Documentação do Progresso**
**CRIAR**: Arquivo `implementacao-progresso.md` contendo:

```markdown
# 📋 Status de Implementação - Sistema de Roles e Workflow

## ✅ Concluído
- [ ] Lista de tarefas já implementadas

## 🔄 Em Progresso  
- [ ] Tarefas sendo trabalhadas no momento

## ⏳ Pendente
- [ ] Tarefas ainda não iniciadas

## 🐛 Issues Identificados
- Lista de problemas encontrados e suas soluções

## 📝 Notas de Implementação
- Decisões técnicas tomadas
- Desvios da especificação (se houver)
- Pontos de atenção para próximas implementações

## 🧪 Testes Realizados
- Testes unitários implementados
- Testes de integração realizados
- Cenários de teste validados

## 📈 Próximos Passos
- Ações imediatas necessárias
- Dependências para próximas tarefas
```

### 4. **Implementação Técnica**
Baseado na especificação, implemente:
- Modelos atualizados (Product, User, WithdrawalRequest)
- Services com validações de estado (FSM)
- Middleware de autorização
- Endpoints com controle de acesso
- Componentes React com renderização condicional
- Hooks customizados para gerenciamento de estado

## 🔍 Pontos de Atenção Críticos

1. **Migração de Dados**: Produtos existentes precisam receber status apropriado
2. **Validações de Estado**: Implementar FSM rigorosamente
3. **Controle de Acesso**: Backend SEMPRE valida permissões
4. **UX Intuitiva**: Interface clara sobre limitações por role
5. **Integridade**: Transações para operações críticas

## 🎯 Critérios de Sucesso

- [ ] Produtos podem ser cadastrados sem localização obrigatória
- [ ] Operadores têm acesso limitado conforme especificado
- [ ] Fluxo de retirada funciona com solicitação → confirmação
- [ ] Estados dos produtos seguem FSM definida
- [ ] Relatório de produtos aguardando locação funcional
- [ ] Zero quebras de segurança/acesso indevido

## 📞 Instruções Finais

1. **SEMPRE consulte a especificação** antes de tomar decisões técnicas
2. **Mantenha o arquivo de progresso atualizado** conforme implementa
3. **Priorize a segurança** - validações sempre no backend
4. **Teste cada funcionalidade** antes de marcar como concluída
5. **Documente desvios** da especificação se necessários

---

**Documentação Base**: `especificacao-roles-workflow.md`  
**Status**: Aguardando implementação  
**Prioridade**: Alta - Sistema em produção