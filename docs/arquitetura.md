Estrutura Hierárquica Típica
Types/Interfaces (Base da pirâmide)

Definem contratos e estruturas de dados
São utilizados por todas as outras camadas
Não dependem de nenhuma outra camada
Exemplo: interfaces de usuário, resposta de API, props de componentes

Services (Camada de dados)

Gerenciam comunicação com APIs externas
Implementam lógica de negócio pura
Utilizam types para tipar requisições/respostas
Independentes da interface do usuário
Exemplo: userService.ts, authService.ts

Hooks (Camada de lógica)

Encapsulam lógica de estado e efeitos colaterais
Consomem services para buscar/manipular dados
Fornecem interface reativa para componentes
Utilizam types para garantir tipagem
Exemplo: useAuth(), useUserData()

Components (Camada de apresentação)

Elementos reutilizáveis de interface
Consomem hooks para obter dados e lógica
Recebem props tipadas com types/interfaces
Focados apenas em renderização e interação básica
Exemplo: Button, Modal, UserCard

Pages (Camada de composição)

Orquestram components para formar telas completas
Utilizam hooks para gerenciar estado da página
Definem roteamento e navegação
Implementam layouts específicos da tela

Fluxo de Dependências
Types ← Services ← Hooks ← Components ← Pages
  ↑        ↑        ↑         ↑         ↑
Base   Dados   Lógica   Apresentação  Composição
Outros Elementos Importantes
Utils/Helpers: Funções utilitárias puras usadas em qualquer camada
Contexts: Compartilham estado global, geralmente consumidos por hooks
Constants: Valores fixos utilizados em toda aplicação
Styles: Definições de tema, cores e estilos globais
Essa arquitetura promove separação de responsabilidades, facilita testes unitários, melhora a reutilização de código e torna o projeto mais escalável e maintível.