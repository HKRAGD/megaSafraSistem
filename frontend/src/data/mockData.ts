import { User, Chamber, Location, Product, Movement, SeedType } from '../types';

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Administrador',
    email: 'admin@sistema-sementes.com',
    role: 'ADMIN',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Operador Silva',
    email: 'operador@sistema-sementes.com', 
    role: 'OPERATOR',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Mock Chambers
export const mockChambers: Chamber[] = [
  {
    id: '1',
    name: 'Câmara A1',
    description: 'Câmara principal para sementes de milho',
    currentTemperature: 15,
    currentHumidity: 45,
    dimensions: {
      quadras: 4,
      lados: 2,
      filas: 10,
      andares: 5
    },
    status: 'active',
    settings: {
      targetTemperature: 15,
      targetHumidity: 45,
      alertThresholds: {
        temperatureMin: 10,
        temperatureMax: 20,
        humidityMin: 40,
        humidityMax: 50
      }
    },
    totalLocations: 400,
    temperatureStatus: 'normal',
    humidityStatus: 'normal',
    conditionsStatus: 'optimal',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Câmara B1',
    description: 'Câmara secundária para sementes de soja',
    currentTemperature: 12,
    currentHumidity: 50,
    dimensions: {
      quadras: 3,
      lados: 2,
      filas: 8,
      andares: 4
    },
    status: 'active',
    settings: {
      targetTemperature: 12,
      targetHumidity: 50
    },
    totalLocations: 192,
    temperatureStatus: 'normal',
    humidityStatus: 'normal',
    conditionsStatus: 'optimal',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Mock Locations
export const mockLocations: Location[] = [
  {
    id: '1',
    chamberId: '1',
    coordinates: { quadra: 1, lado: 'A', fila: 1, andar: 1 },
    code: 'Q1-LA-F1-A1',
    isOccupied: true,
    maxCapacityKg: 1500,
    currentWeightKg: 750,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    chamberId: '1',
    coordinates: { quadra: 1, lado: 'A', fila: 1, andar: 2 },
    code: 'Q1-LA-F1-A2',
    isOccupied: false,
    maxCapacityKg: 1500,
    currentWeightKg: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Mock Seed Types
export const mockSeedTypes: SeedType[] = [
  {
    id: '1',
    name: 'Milho Híbrido',
    description: 'Sementes de milho híbrido para plantio comercial',
    optimalTemperature: 15,
    optimalHumidity: 45,
    maxStorageTimeDays: 365,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Soja Transgênica',
    description: 'Sementes de soja transgênica resistente a herbicidas',
    optimalTemperature: 12,
    optimalHumidity: 50,
    maxStorageTimeDays: 270,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Feijão Comum',
    description: 'Sementes de feijão comum para agricultura familiar',
    optimalTemperature: 18,
    optimalHumidity: 40,
    maxStorageTimeDays: 180,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Mock Products
export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Milho Pioneer 3069',
    lot: 'LOT001',
    seedTypeId: '1',
    quantity: 150,
    storageType: 'saco',
    weightPerUnit: 5,
    totalWeight: 750,
    locationId: '1',
    entryDate: '2024-01-15T00:00:00Z',
    expirationDate: '2025-01-15T00:00:00Z',
    status: 'LOCADO',
    notes: 'Lote de alta qualidade',
    tracking: {
      batchNumber: 'BATCH001',
      origin: 'Fazenda São José',
      supplier: 'Pioneer',
      qualityGrade: 'A'
    },
    calculatedTotalWeight: 750,
    isNearExpiration: false,
    expirationStatus: 'good',
    storageTimeDays: 45,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  }
];

// Mock Movements
export const mockMovements: Movement[] = [
  {
    id: '1',
    productId: '1',
    type: 'entry',
    toLocationId: '1',
    quantity: 150,
    weight: 750,
    userId: '2',
    reason: 'Entrada de estoque',
    timestamp: '2024-01-15T10:00:00Z',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2', 
    productId: '1',
    type: 'adjustment',
    toLocationId: '1',
    quantity: 145,
    weight: 725,
    userId: '1',
    reason: 'Ajuste de inventário',
    notes: 'Contagem física encontrou diferença',
    timestamp: '2024-01-20T14:30:00Z',
    createdAt: '2024-01-20T14:30:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  }
];

export const mockData = {
  users: mockUsers,
  chambers: mockChambers,
  locations: mockLocations,
  seedTypes: mockSeedTypes,
  products: mockProducts,
  movements: mockMovements
}; 