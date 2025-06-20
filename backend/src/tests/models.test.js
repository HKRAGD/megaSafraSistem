/**
 * Teste básico para verificar se todos os models estão carregando corretamente
 * Este é um teste inicial para validar a estrutura dos models
 */

const mongoose = require('mongoose');

// Importar todos os models
const User = require('../models/User');
const SeedType = require('../models/SeedType');
const Chamber = require('../models/Chamber');
const Location = require('../models/Location');
const Product = require('../models/Product');
const Movement = require('../models/Movement');

describe('Models Loading Test', () => {
  
  test('User model should be defined', () => {
    expect(User).toBeDefined();
    expect(User.modelName).toBe('User');
  });

  test('SeedType model should be defined', () => {
    expect(SeedType).toBeDefined();
    expect(SeedType.modelName).toBe('SeedType');
  });

  test('Chamber model should be defined', () => {
    expect(Chamber).toBeDefined();
    expect(Chamber.modelName).toBe('Chamber');
  });

  test('Location model should be defined', () => {
    expect(Location).toBeDefined();
    expect(Location.modelName).toBe('Location');
  });

  test('Product model should be defined', () => {
    expect(Product).toBeDefined();
    expect(Product.modelName).toBe('Product');
  });

  test('Movement model should be defined', () => {
    expect(Movement).toBeDefined();
    expect(Movement.modelName).toBe('Movement');
  });

  test('All models should have required methods', () => {
    // Verificar se todos os models têm os métodos básicos do Mongoose
    const models = [User, SeedType, Chamber, Location, Product, Movement];
    
    models.forEach(model => {
      expect(typeof model.find).toBe('function');
      expect(typeof model.findById).toBe('function');
      expect(typeof model.create).toBe('function');
      expect(typeof model.updateOne).toBe('function');
      expect(typeof model.deleteOne).toBe('function');
    });
  });

  test('Models should have custom static methods', () => {
    // User
    expect(typeof User.findByEmail).toBe('function');
    expect(typeof User.findActive).toBe('function');
    expect(typeof User.getStats).toBe('function');

    // SeedType
    expect(typeof SeedType.findActive).toBe('function');
    expect(typeof SeedType.searchByText).toBe('function');
    expect(typeof SeedType.getStats).toBe('function');

    // Chamber
    expect(typeof Chamber.findActive).toBe('function');
    expect(typeof Chamber.findWithAlerts).toBe('function');
    expect(typeof Chamber.getStats).toBe('function');

    // Location
    expect(typeof Location.findAvailable).toBe('function');
    expect(typeof Location.generateForChamber).toBe('function');
    expect(typeof Location.getStats).toBe('function');

    // Product
    expect(typeof Product.findByStatus).toBe('function');
    expect(typeof Product.findNearExpiration).toBe('function');
    expect(typeof Product.getInventoryReport).toBe('function');

    // Movement
    expect(typeof Movement.findByProduct).toBe('function');
    expect(typeof Movement.getMovementReport).toBe('function');
    expect(typeof Movement.getStats).toBe('function');
  });

  test('User model should have instance methods', () => {
    const user = new User();
    expect(typeof user.comparePassword).toBe('function');
    expect(typeof user.isAdmin).toBe('function');
    expect(typeof user.canOperate).toBe('function');
  });

  test('Product model should have instance methods', () => {
    const product = new Product();
    expect(typeof product.moveTo).toBe('function');
    expect(typeof product.remove).toBe('function');
    expect(typeof product.reserve).toBe('function');
  });

  test('Location model should have instance methods', () => {
    const location = new Location();
    expect(typeof location.canAccommodateWeight).toBe('function');
    expect(typeof location.addWeight).toBe('function');
    expect(typeof location.removeWeight).toBe('function');
    expect(typeof location.release).toBe('function');
  });

  test('Models should have proper schema validation', () => {
    // User validations
    const userSchema = User.schema;
    expect(userSchema.paths.name.isRequired).toBe(true);
    expect(userSchema.paths.email.isRequired).toBe(true);
    expect(userSchema.paths.password.isRequired).toBe(true);

    // Chamber validations
    const chamberSchema = Chamber.schema;
    expect(chamberSchema.paths.name.isRequired).toBe(true);
    expect(chamberSchema.paths['dimensions.quadras'].isRequired).toBe(true);
    expect(chamberSchema.paths['dimensions.lados'].isRequired).toBe(true);

    // Product validations
    const productSchema = Product.schema;
    expect(productSchema.paths.name.isRequired).toBe(true);
    expect(productSchema.paths.lot.isRequired).toBe(true);
    expect(productSchema.paths.seedTypeId.isRequired).toBe(true);
  });

});

describe('Model Relationships Test', () => {
  
  test('Product should reference SeedType and Location', () => {
    const productSchema = Product.schema;
    expect(productSchema.paths.seedTypeId.instance).toBe('ObjectId');
    expect(productSchema.paths.locationId.instance).toBe('ObjectId');
  });

  test('Location should reference Chamber', () => {
    const locationSchema = Location.schema;
    expect(locationSchema.paths.chamberId.instance).toBe('ObjectId');
  });

  test('Movement should reference Product, Location and User', () => {
    const movementSchema = Movement.schema;
    expect(movementSchema.paths.productId.instance).toBe('ObjectId');
    expect(movementSchema.paths.userId.instance).toBe('ObjectId');
    expect(movementSchema.paths.fromLocationId.instance).toBe('ObjectId');
    expect(movementSchema.paths.toLocationId.instance).toBe('ObjectId');
  });

});

describe('Virtual Properties Test', () => {
  
  test('Chamber should have virtual properties', () => {
    const chamber = new Chamber({
      name: 'Test Chamber',
      dimensions: { quadras: 2, lados: 3, filas: 4, andares: 5 }
    });
    
    expect(chamber.totalLocations).toBe(120); // 2*3*4*5
  });

  test('Location should have virtual properties', () => {
    const location = new Location({
      coordinates: { quadra: 1, lado: 2, fila: 3, andar: 4 },
      maxCapacityKg: 1000,
      currentWeightKg: 250
    });
    
    expect(location.availableCapacityKg).toBe(750);
    expect(location.occupancyPercentage).toBe(25);
    expect(location.capacityStatus).toBe('low');
  });

  test('Product should have virtual properties', () => {
    const product = new Product({
      quantity: 10,
      weightPerUnit: 25.5
    });
    
    expect(product.calculatedTotalWeight).toBe(255);
  });

});

console.log('✅ Models loading test suite created successfully!'); 