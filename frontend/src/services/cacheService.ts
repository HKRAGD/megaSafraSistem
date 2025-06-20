/**
 * Service de Cache para otimização de performance
 * Conforme regras do projeto: Cache de 5 minutos obrigatório
 * MELHORADO: Sistema de tags para invalidação seletiva
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  tags: string[];
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private tagIndex = new Map<string, Set<string>>(); // tag -> set of keys
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos em ms (obrigatório pelas regras)

  /**
   * Armazena um item no cache com tags opcionais
   * @param key - Chave única para o cache
   * @param data - Dados a serem armazenados
   * @param ttl - Time to live em ms (padrão: 5 minutos)
   * @param tags - Tags para invalidação seletiva
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL, tags: string[] = []): void {
    const now = Date.now();
    const item: CacheItem<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      tags
    };
    
    // Remove item anterior se existir (para limpar tags antigas)
    this.delete(key);
    
    // Adiciona o novo item
    this.cache.set(key, item);
    
    // Atualiza índice de tags
    tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    });
  }

  /**
   * Recupera um item do cache
   * @param key - Chave do cache
   * @returns Dados do cache ou null se expirado/inexistente
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    const now = Date.now();
    
    // Verifica se o item expirou
    if (now > item.expiresAt) {
      this.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Remove um item específico do cache
   * @param key - Chave do cache
   */
  delete(key: string): void {
    const item = this.cache.get(key);
    
    if (item) {
      // Remove das tags
      item.tags.forEach(tag => {
        const tagSet = this.tagIndex.get(tag);
        if (tagSet) {
          tagSet.delete(key);
          if (tagSet.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      });
    }
    
    this.cache.delete(key);
  }

  /**
   * Invalida todos os itens com uma tag específica
   * @param tag - Tag para invalidar
   */
  invalidateByTag(tag: string): void {
    const keys = this.tagIndex.get(tag);
    
    if (keys) {
      keys.forEach(key => {
        this.delete(key);
      });
    }
  }

  /**
   * Invalida todos os itens com qualquer uma das tags fornecidas
   * @param tags - Array de tags para invalidar
   */
  invalidateByTags(tags: string[]): void {
    tags.forEach(tag => this.invalidateByTag(tag));
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
  }

  /**
   * Remove itens expirados do cache
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((item, key) => {
      if (now > item.expiresAt) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.delete(key));
  }

  /**
   * Verifica se uma chave existe e está válida no cache
   * @param key - Chave do cache
   * @returns true se existe e está válido
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    const now = Date.now();
    
    if (now > item.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats() {
    const now = Date.now();
    let validItems = 0;
    let expiredItems = 0;

    this.cache.forEach((item) => {
      if (now > item.expiresAt) {
        expiredItems++;
      } else {
        validItems++;
      }
    });

    return {
      totalItems: this.cache.size,
      validItems,
      expiredItems,
      totalTags: this.tagIndex.size,
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length // Aproximação do uso de memória
    };
  }

  /**
   * Executa operação com cache automático
   * @param key - Chave do cache
   * @param fetchFn - Função para buscar dados se não estiver em cache
   * @param ttl - Time to live opcional
   * @param tags - Tags opcionais para invalidação
   * @returns Dados do cache ou resultado da função
   */
  async getOrSet<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    ttl?: number,
    tags?: string[]
  ): Promise<T> {
    // Tenta buscar do cache primeiro
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    // Se não estiver em cache, executa a função
    try {
      const data = await fetchFn();
      this.set(key, data, ttl, tags);
      return data;
    } catch (error) {
      // Em caso de erro, não armazena em cache
      throw error;
    }
  }

  /**
   * Helper methods para invalidação por operações CRUD
   */
  invalidateProducts(): void {
    this.invalidateByTag('products');
  }

  invalidateChambers(): void {
    this.invalidateByTag('chambers');
  }

  invalidateLocations(): void {
    this.invalidateByTag('locations');
  }

  invalidateUsers(): void {
    this.invalidateByTag('users');
  }

  invalidateSeedTypes(): void {
    this.invalidateByTag('seedTypes');
  }

  invalidateMovements(): void {
    this.invalidateByTag('movements');
  }

  invalidateDashboard(): void {
    this.invalidateByTag('dashboard');
  }

  invalidateReports(): void {
    this.invalidateByTag('reports');
  }
}

// Instância singleton do cache
export const cacheService = new CacheService();

// Configurar limpeza automática do cache a cada 10 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    cacheService.cleanup();
  }, 10 * 60 * 1000); // 10 minutos
}

export default cacheService; 