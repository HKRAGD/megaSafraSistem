# API Documentation - Sistema de Câmaras Refrigeradas

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Autenticação e Autorização](#autenticação-e-autorização)
3. [Estruturas de Dados](#estruturas-de-dados)
4. [Endpoints da API](#endpoints-da-api)
5. [Regras de Negócio Críticas](#regras-de-negócio-críticas)
6. [Códigos de Resposta](#códigos-de-resposta)
7. [Exemplos de Integração](#exemplos-de-integração)
8. [Guia de Boas Práticas](#guia-de-boas-práticas)

---

## 🎯 Visão Geral

### Stack Tecnológico
- **Backend**: Node.js + Express.js
- **Banco de Dados**: MongoDB + Mongoose
- **Autenticação**: JWT (Access Token + Refresh Token)
- **Base URL**: `http://localhost:3001/api` (desenvolvimento)

### Arquitetura da API
- **Padrão REST** com recursos organizados por entidades
- **Autenticação JWT** com sistema de roles
- **Validação automática** de dados de entrada
- **Tratamento de erros** padronizado
- **Paginação** automática para listagens

---

## 🔐 Autenticação e Autorização

### Sistema de Roles
- **admin**: Acesso total ao sistema
- **operator**: Pode criar/modificar dados operacionais
- **viewer**: Apenas visualização

### Headers Obrigatórios
```javascript
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

### Fluxo de Autenticação

#### 1. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "user": {
      "id": "60d5ec49f1b2c72b1c8e4f5a",
      "name": "João Silva",
      "email": "joao@empresa.com",
      "role": "admin",
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "15m",
    "security": {
      "sessionId": "sess_abc123",
      "loginAttempts": 1,
      "lastLogin": "2023-12-01T10:30:00.000Z"
    }
  }
}
```

#### 2. Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

#### 3. Logout
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

---

## 📊 Estruturas de Dados

### User
```typescript
interface User {
  id: string;
  name: string;                    // 2-100 caracteres
  email: string;                   // único, formato email
  role: 'admin' | 'operator' | 'viewer';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### SeedType
```typescript
interface SeedType {
  id: string;
  name: string;                    // único, 2-100 caracteres
  description?: string;            // máx 500 caracteres
  optimalTemperature?: number;     // -50 a 50°C
  optimalHumidity?: number;        // 0-100%
  maxStorageTimeDays?: number;     // dias de armazenamento
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Chamber
```typescript
interface Chamber {
  id: string;
  name: string;                    // único, 2-100 caracteres
  description?: string;            // máx 500 caracteres
  currentTemperature?: number;     // -50 a 50°C
  currentHumidity?: number;        // 0-100%
  dimensions: {
    quadras: number;               // 1-100
    lados: string;                 // A-Z
    filas: number;                 // 1-100
    andares: number;               // 1-20
  };
  status: 'active' | 'maintenance' | 'inactive';
  settings?: {
    targetTemperature?: number;
    targetHumidity?: number;
    alertThresholds?: {
      temperatureMin?: number;
      temperatureMax?: number;
      humidityMin?: number;
      humidityMax?: number;
    };
  };
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  totalLocations: number;          // virtual: quadras × lados × filas × andares
  temperatureStatus: 'low' | 'normal' | 'high' | 'unknown';  // virtual
  humidityStatus: 'low' | 'normal' | 'high' | 'unknown';     // virtual
  conditionsStatus: 'optimal' | 'normal' | 'alert' | 'unknown'; // virtual
  createdAt: Date;
  updatedAt: Date;
}
```

### Location
```typescript
interface Location {
  id: string;
  chamberId: string;               // ref: Chamber
  coordinates: {
    quadra: number;
    lado: string;
    fila: number;
    andar: number;
  };
  code: string;                    // auto-gerado: "Q1-LA-F3-A4"
  isOccupied: boolean;
  maxCapacityKg: number;           // padrão: 1500kg
  currentWeightKg: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Product
```typescript
interface Product {
  id: string;
  name: string;                    // 2-200 caracteres
  lot: string;                     // 1-50 caracteres
  seedTypeId: string;              // ref: SeedType
  quantity: number;                // inteiro ≥ 1
  storageType: 'saco' | 'bag';
  weightPerUnit: number;           // 0.001-1500kg
  totalWeight: number;             // calculado automaticamente
  locationId: string;              // ref: Location
  entryDate: Date;
  expirationDate?: Date;           // deve ser > entryDate
  status: 'stored' | 'reserved' | 'removed';
  notes?: string;                  // máx 1000 caracteres
  tracking?: {
    batchNumber?: string;          // máx 50 caracteres
    origin?: string;               // máx 200 caracteres
    supplier?: string;             // máx 200 caracteres
    qualityGrade?: 'A' | 'B' | 'C' | 'D';
  };
  metadata?: {
    lastMovementDate?: Date;
    createdBy?: string;            // ref: User
    lastModifiedBy?: string;       // ref: User
  };
  // Virtuals
  calculatedTotalWeight: number;   // quantity × weightPerUnit
  isNearExpiration: boolean;       // ≤ 30 dias para vencer
  expirationStatus: 'expired' | 'critical' | 'warning' | 'good' | 'no-expiration';
  storageTimeDays: number;         // dias desde entrada
  createdAt: Date;
  updatedAt: Date;
}
```

### Movement
```typescript
interface Movement {
  id: string;
  productId: string;               // ref: Product
  type: 'entry' | 'exit' | 'transfer' | 'adjustment';
  fromLocationId?: string;         // ref: Location
  toLocationId?: string;           // ref: Location
  quantity: number;
  weight: number;
  userId: string;                  // ref: User
  reason?: string;
  notes?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🛠 Endpoints da API

### 1. Autenticação (`/api/auth`)

| Método | Endpoint | Acesso | Descrição |
|--------|----------|--------|-----------|
| POST | `/login` | Public | Login do usuário |
| POST | `/register` | Admin | Criar novo usuário |
| POST | `/refresh` | Public | Renovar access token |
| POST | `/logout` | Private | Logout do usuário |
| GET | `/security-info` | Private | Info de segurança do usuário |
| POST | `/revoke-sessions` | Private | Revogar todas as sessões |

**Exemplo de uso:**
```javascript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@empresa.com',
    password: 'senha123'
  })
});
```

### 2. Usuários (`/api/users`)

| Método | Endpoint | Acesso | Descrição |
|--------|----------|--------|-----------|
| GET | `/` | Admin/Operator | Listar usuários (paginado) |
| GET | `/:id` | Admin/Own | Obter usuário específico |
| POST | `/` | Admin | Criar usuário |
| PUT | `/:id` | Admin/Own | Atualizar usuário |
| DELETE | `/:id` | Admin | Desativar usuário |
| GET | `/:id/productivity` | Admin/Own | Análise de produtividade |
| GET | `/:id/similar` | Admin | Usuários similares |

**Query Parameters para GET `/`:**
- `page`: número da página (padrão: 1)
- `limit`: itens por página (padrão: 10)
- `sort`: campo de ordenação (padrão: -createdAt)
- `search`: busca por nome/email
- `role`: filtrar por role
- `isActive`: filtrar por status ativo
- `includeAnalytics`: incluir análises (true/false)

### 3. Tipos de Sementes (`/api/seed-types`)

| Método | Endpoint | Acesso | Descrição |
|--------|----------|--------|-----------|
| GET | `/` | All | Listar tipos de sementes |
| GET | `/by-conditions` | All | Buscar por condições |
| GET | `/performance-comparison` | Admin/Operator | Comparação de performance |
| GET | `/:id` | All | Obter tipo específico |
| GET | `/:id/condition-violations` | Admin/Operator | Violações de condições |
| POST | `/` | Admin/Operator | Criar tipo |
| PUT | `/:id` | Admin/Operator | Atualizar tipo |
| DELETE | `/:id` | Admin | Desativar tipo |

**Exemplo de criação:**
```javascript
const newSeedType = await fetch('/api/seed-types', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Soja Premium',
    description: 'Semente de soja de alta qualidade',
    optimalTemperature: 18,
    optimalHumidity: 60,
    maxStorageTimeDays: 365
  })
});
```

### 4. Câmaras (`/api/chambers`)

| Método | Endpoint | Acesso | Descrição |
|--------|----------|--------|-----------|
| GET | `/` | All | Listar câmaras |
| GET | `/:id` | All | Obter câmara específica |
| GET | `/:id/capacity-analysis` | Admin/Operator | Análise de capacidade |
| GET | `/:id/environmental-monitoring` | Admin/Operator | Monitoramento ambiental |
| GET | `/:id/maintenance-schedule` | Admin/Operator | Cronograma de manutenção |
| GET | `/:id/layout-optimization` | Admin | Otimização de layout |
| POST | `/` | Admin | Criar câmara |
| POST | `/:id/generate-locations` | Admin | Gerar localizações |
| PUT | `/:id` | Admin/Operator | Atualizar câmara |
| DELETE | `/:id` | Admin | Desativar câmara |

**Exemplo de criação de câmara:**
```javascript
const newChamber = await fetch('/api/chambers', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Câmara A1',
    description: 'Câmara principal para armazenamento',
    dimensions: {
      quadras: 5,
      lados: 4,
      filas: 10,
      andares: 3
    },
    settings: {
      targetTemperature: 18,
      targetHumidity: 60,
      alertThresholds: {
        temperatureMin: 15,
        temperatureMax: 22,
        humidityMin: 50,
        humidityMax: 70
      }
    }
  })
});
```

### 5. Localizações (`/api/locations`)

| Método | Endpoint | Acesso | Descrição |
|--------|----------|--------|-----------|
| GET | `/` | All | Listar localizações |
| GET | `/chamber/:chamberId` | All | Localizações por câmara |
| GET | `/available` | All | Apenas localizações disponíveis |
| GET | `/stats` | All | Estatísticas de localizações |
| GET | `/occupancy-analysis` | Admin/Operator | Análise de ocupação |
| GET | `/:id` | All | Obter localização específica |
| GET | `/:id/adjacent` | All | Localizações adjacentes |
| POST | `/generate` | Admin | Gerar localizações |
| POST | `/validate-capacity` | Admin/Operator | Validar capacidade |
| PUT | `/:id` | Admin/Operator | Atualizar localização |

**Query Parameters úteis:**
- Para `/available`: `chamberId`, `minCapacity`, `maxCapacity`
- Para `/chamber/:chamberId`: `available`, `sort`, `coordinates`

### 6. Produtos (`/api/products`)

| Método | Endpoint | Acesso | Descrição |
|--------|----------|--------|-----------|
| GET | `/` | All | Listar produtos |
| GET | `/:id` | All | Obter produto específico |
| GET | `/distribution-analysis` | Admin/Operator | Análise de distribuição |
| POST | `/validate-data` | Admin/Operator | Validar dados de produto |
| POST | `/find-optimal-location` | Admin/Operator | Encontrar localização ótima |
| POST | `/generate-code` | Admin/Operator | Gerar código de produto |
| POST | `/` | Admin/Operator | Criar produto |
| PUT | `/:id` | Admin/Operator | Atualizar produto |
| DELETE | `/:id` | Admin/Operator | Remover produto |
| POST | `/:id/move` | Admin/Operator | Mover produto |

**Exemplo de criação de produto:**
```javascript
const newProduct = await fetch('/api/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Soja Premium Lote 2023-001',
    lot: '2023-001',
    seedTypeId: '60d5ec49f1b2c72b1c8e4f5a',
    quantity: 100,
    storageType: 'saco',
    weightPerUnit: 50,
    locationId: '60d5ec49f1b2c72b1c8e4f5b',
    expirationDate: '2024-12-31T23:59:59.000Z',
    tracking: {
      batchNumber: 'BATCH-2023-001',
      origin: 'Fazenda São João',
      supplier: 'Sementes Ltda',
      qualityGrade: 'A'
    },
    notes: 'Lote especial com alta germinação'
  })
});
```

### 7. Movimentações (`/api/movements`)

| Método | Endpoint | Acesso | Descrição |
|--------|----------|--------|-----------|
| GET | `/` | All | Listar movimentações |
| GET | `/product/:productId` | All | Histórico por produto |
| GET | `/location/:locationId` | All | Histórico por localização |
| GET | `/patterns` | Admin/Operator | Padrões de movimentações |
| GET | `/audit` | Admin/Operator | Relatório de auditoria |
| GET | `/product/:id/detailed-history` | All | Histórico detalhado |
| POST | `/` | Admin/Operator | Registrar movimentação |
| POST | `/manual` | Admin/Operator | Movimentação manual |
| POST | `/verify-pending` | Admin/Operator | Verificar pendentes |

### 8. Dashboard (`/api/dashboard`)

| Método | Endpoint | Acesso | Descrição |
|--------|----------|--------|-----------|
| GET | `/summary` | All | Resumo geral do sistema |
| GET | `/chamber-status` | All | Status de câmaras |
| GET | `/storage-capacity` | All | Capacidade de armazenamento |
| GET | `/recent-movements` | All | Movimentações recentes |

### 9. Relatórios (`/api/reports`)

| Método | Endpoint | Acesso | Descrição |
|--------|----------|--------|-----------|
| GET | `/inventory` | All | Relatório de estoque |
| GET | `/movements` | All | Relatório de movimentações |
| GET | `/expiration` | All | Produtos próximos ao vencimento |
| GET | `/capacity` | All | Relatório de capacidade |
| GET | `/executive` | Admin/Operator | Relatório executivo |
| GET | `/custom` | Admin/Operator | Relatório customizado |

---

## ⚠️ Regras de Negócio Críticas

### 1. One Location = One Product
- **Regra**: Uma localização só pode conter UM produto por vez
- **Validação**: Ao criar/mover produto, verificar se localização está livre
- **Erro**: `409 Conflict` se localização já ocupada

### 2. Automatic Movements
- **Regra**: Toda alteração de produto gera movimento automático
- **Eventos**: create, update, delete, move
- **Tracking**: Usuário, timestamp, tipo de operação

### 3. Capacity Validation
- **Regra**: Peso total não pode exceder capacidade máxima da localização
- **Validação**: `totalWeight ≤ location.maxCapacityKg`
- **Erro**: `400 Bad Request` se exceder capacidade

### 4. Location Hierarchy Validation
- **Regra**: Coordenadas devem respeitar limites da câmara
- **Validação**: `1 ≤ coordenada ≤ dimensão_câmara`
- **Erro**: `400 Bad Request` se coordenadas inválidas

### 5. Dynamic Types
- **Regra**: Sistema suporta novos tipos de sementes sem alteração de código
- **Flexibilidade**: Tipos são configuráveis via API
- **Validação**: Nome único, parâmetros opcionais

---

## 📋 Códigos de Resposta

### Códigos de Sucesso
- `200 OK`: Operação bem-sucedida
- `201 Created`: Recurso criado com sucesso
- `204 No Content`: Operação bem-sucedida sem conteúdo

### Códigos de Erro
- `400 Bad Request`: Dados inválidos ou violação de regra
- `401 Unauthorized`: Token ausente ou inválido
- `403 Forbidden`: Sem permissão para a operação
- `404 Not Found`: Recurso não encontrado
- `409 Conflict`: Conflito com estado atual (ex: localização ocupada)
- `422 Unprocessable Entity`: Dados válidos mas não processáveis
- `500 Internal Server Error`: Erro interno do servidor

### Formato de Erro Padrão
```json
{
  "success": false,
  "message": "Descrição do erro",
  "error": {
    "code": "ERROR_CODE",
    "field": "campo_com_erro",
    "details": "Detalhes adicionais"
  }
}
```

---

## 💻 Exemplos de Integração

### React + Axios

#### 1. Configuração do Cliente HTTP
```javascript
// api/client.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
});

// Interceptor para adicionar token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('/api/auth/refresh', {
          refreshToken
        });
        
        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        
        // Retentar requisição original
        error.config.headers.Authorization = `Bearer ${accessToken}`;
        return axios.request(error.config);
      } catch (refreshError) {
        // Redirect para login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

#### 2. Hooks Personalizados
```javascript
// hooks/useAuth.js
import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password
      });
      
      const { user, accessToken } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Erro no login'
      };
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  return { user, login, logout, loading };
};
```

#### 3. Hook para Produtos
```javascript
// hooks/useProducts.js
import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export const useProducts = (filters = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});

  const fetchProducts = async (page = 1) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/products', {
        params: { ...filters, page }
      });
      
      setProducts(response.data.data.products);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (productData) => {
    try {
      const response = await apiClient.post('/products', productData);
      await fetchProducts(); // Recarregar lista
      return { success: true, product: response.data.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao criar produto'
      };
    }
  };

  const moveProduct = async (productId, newLocationId, reason) => {
    try {
      await apiClient.post(`/products/${productId}/move`, {
        newLocationId,
        reason
      });
      await fetchProducts(); // Recarregar lista
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao mover produto'
      };
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  return {
    products,
    loading,
    error,
    pagination,
    fetchProducts,
    createProduct,
    moveProduct
  };
};
```

### Vue.js + Composition API

```javascript
// composables/useApi.js
import { ref, reactive } from 'vue';
import axios from 'axios';

export function useApi() {
  const loading = ref(false);
  const error = ref(null);

  const apiCall = async (method, url, data = null) => {
    loading.value = true;
    error.value = null;

    try {
      const config = {
        method,
        url: `${process.env.VUE_APP_API_URL}${url}`,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      };

      if (data) config.data = data;

      const response = await axios(config);
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro na requisição';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    get: (url) => apiCall('GET', url),
    post: (url, data) => apiCall('POST', url, data),
    put: (url, data) => apiCall('PUT', url, data),
    delete: (url) => apiCall('DELETE', url)
  };
}
```

### Angular + HttpClient

```typescript
// services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap(response => {
          if (response.success) {
            localStorage.setItem('accessToken', response.data.accessToken);
            this.userSubject.next(response.data.user);
          }
        })
      );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/logout`, {})
      .pipe(
        tap(() => {
          localStorage.removeItem('accessToken');
          this.userSubject.next(null);
        })
      );
  }

  getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
}
```

---

## 🎯 Guia de Boas Práticas

### 1. Gerenciamento de Estado

#### Para React
```javascript
// Context para dados globais
const AppContext = createContext();

// Provider com cache e sincronização
const AppProvider = ({ children }) => {
  const [chambers, setChambers] = useState([]);
  const [seedTypes, setSeedTypes] = useState([]);
  
  // Carregar dados iniciais
  useEffect(() => {
    Promise.all([
      apiClient.get('/chambers'),
      apiClient.get('/seed-types')
    ]).then(([chambersRes, seedTypesRes]) => {
      setChambers(chambersRes.data.data);
      setSeedTypes(seedTypesRes.data.data);
    });
  }, []);

  return (
    <AppContext.Provider value={{ chambers, seedTypes }}>
      {children}
    </AppContext.Provider>
  );
};
```

### 2. Tratamento de Erros

```javascript
// Utilitário para tratamento de erros
export const handleApiError = (error) => {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return {
          type: 'validation',
          message: data.message,
          field: data.error?.field
        };
      case 401:
        return {
          type: 'auth',
          message: 'Sessão expirada. Faça login novamente.'
        };
      case 403:
        return {
          type: 'permission',
          message: 'Você não tem permissão para esta ação.'
        };
      case 409:
        return {
          type: 'conflict',
          message: data.message
        };
      default:
        return {
          type: 'unknown',
          message: 'Erro inesperado. Tente novamente.'
        };
    }
  }
  
  return {
    type: 'network',
    message: 'Erro de conexão. Verifique sua internet.'
  };
};
```

### 3. Paginação e Filtros

```javascript
// Hook para paginação
export const usePagination = (fetchFunction, filters = {}) => {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 10
  });

  const loadPage = async (page = 1) => {
    try {
      const response = await fetchFunction({
        ...filters,
        page,
        limit: pagination.limit
      });
      
      setData(response.data);
      setPagination({
        currentPage: response.pagination.currentPage,
        totalPages: response.pagination.totalPages,
        totalItems: response.pagination.totalItems,
        limit: response.pagination.limit
      });
    } catch (error) {
      console.error('Erro ao carregar página:', error);
    }
  };

  return { data, pagination, loadPage };
};
```

### 4. Validação de Formulários

```javascript
// Esquemas de validação (usando Yup)
import * as yup from 'yup';

export const productSchema = yup.object({
  name: yup.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(200, 'Nome deve ter no máximo 200 caracteres')
    .required('Nome é obrigatório'),
  lot: yup.string()
    .min(1, 'Lote é obrigatório')
    .max(50, 'Lote deve ter no máximo 50 caracteres')
    .required('Lote é obrigatório'),
  seedTypeId: yup.string()
    .required('Tipo de semente é obrigatório'),
  quantity: yup.number()
    .integer('Quantidade deve ser um número inteiro')
    .min(1, 'Quantidade deve ser pelo menos 1')
    .required('Quantidade é obrigatória'),
  weightPerUnit: yup.number()
    .min(0.001, 'Peso deve ser pelo menos 0.001kg')
    .max(1500, 'Peso não pode exceder 1500kg')
    .required('Peso por unidade é obrigatório'),
  locationId: yup.string()
    .required('Localização é obrigatória'),
  expirationDate: yup.date()
    .min(new Date(), 'Data de expiração deve ser futura')
    .nullable()
});
```

### 5. Cache e Performance

```javascript
// Cache simples para dados estáticos
class ApiCache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutos
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

const apiCache = new ApiCache();

// Uso no cliente
export const getCachedSeedTypes = async () => {
  const cached = apiCache.get('seedTypes');
  if (cached) return cached;
  
  const response = await apiClient.get('/seed-types');
  apiCache.set('seedTypes', response.data);
  return response.data;
};
```

### 6. WebSockets para Atualizações em Tempo Real

```javascript
// Cliente WebSocket para atualizações
export class RealtimeClient {
  constructor(url, token) {
    this.url = url;
    this.token = token;
    this.listeners = new Map();
  }

  connect() {
    this.ws = new WebSocket(`${this.url}?token=${this.token}`);
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const listeners = this.listeners.get(message.type) || [];
      listeners.forEach(callback => callback(message.data));
    };
  }

  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }
}

// Uso
const realtime = new RealtimeClient('ws://localhost:3000', accessToken);
realtime.connect();

realtime.subscribe('product_moved', (data) => {
  console.log('Produto movido:', data);
  // Atualizar estado da aplicação
});
```

---

## 📝 Notas Finais

### Versionamento da API
- Versão atual: `v1`
- Mudanças compatíveis são aplicadas na mesma versão
- Mudanças quebradas criarão nova versão

### Rate Limiting
- Limite padrão: 100 requests por 15 minutos por usuário
- Headers de resposta: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

### Ambientes
- **Desenvolvimento**: `http://localhost:3000/api`
- **Homologação**: `https://api-staging.empresa.com/api`
- **Produção**: `https://api.empresa.com/api`

### Suporte
- Documentação completa: `/docs/swagger`
- Issues: GitHub Issues
- Contato: dev-team@empresa.com

---

*Documentação gerada automaticamente - Última atualização: Dezembro 2023* 