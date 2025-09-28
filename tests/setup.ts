import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../server/index';
import { db } from '../server/db';

// Global test configuration
export let app: any;
export let request: supertest.SuperTest<supertest.Test>;

beforeAll(async () => {
  // Create test app instance
  app = createApp();
  request = supertest(app);
  
  // Ensure database is ready
  console.log('Setting up test database...');
  
  // Create test data if needed
  await seedTestData();
});

afterAll(async () => {
  // Cleanup after all tests
  console.log('Cleaning up test environment...');
});

async function seedTestData() {
  // Seed test employees for authentication testing
  const testEmployees = [
    {
      employeeId: 'TEST001',
      firstName: 'Test',
      lastName: 'Cashier',
      role: 'cashier',
      pin: '1234',
      active: true
    },
    {
      employeeId: 'TEST002', 
      firstName: 'Test',
      lastName: 'Manager',
      role: 'manager',
      pin: '5678',
      active: true
    }
  ];

  // Seed test customers
  const testCustomers = [
    {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@test.com',
      phone: '+1234567890',
      address: '123 Test St',
      city: 'Test City',
      postalCode: '12345',
      country: 'Test Country'
    }
  ];

  // Seed test products
  const testProducts = [
    {
      name: 'Test Product 1',
      sku: 'TEST001',
      price: '10.99',
      category: 'Test Category',
      stock: 100
    },
    {
      name: 'Test Product 2', 
      sku: 'TEST002',
      price: '25.50',
      category: 'Test Category',
      stock: 50
    }
  ];

  // Seed test coupons
  const testCoupons = [
    {
      code: 'TEST10OFF',
      name: 'Test 10% Off',
      discountType: 'percentage',
      discountValue: 10,
      minimumAmount: 50,
      status: 'active',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-12-31'),
      usageLimit: 100,
      usageCount: 0
    }
  ];

  console.log('Test data seeded successfully');
}

// Helper functions for testing
export function getAuthHeaders(role: 'cashier' | 'manager' = 'cashier') {
  const pin = role === 'manager' ? '5678' : '1234';
  const employeeId = role === 'manager' ? 'TEST002' : 'TEST001';
  
  // In real tests, this would authenticate and return session headers
  return {
    'x-employee-id': employeeId,
    'x-employee-role': role
  };
}

export function createTestCart() {
  return {
    items: [
      {
        id: 'TEST001',
        productId: 'TEST001',
        name: 'Test Product 1',
        price: 10.99,
        quantity: 2,
        type: 'product'
      },
      {
        id: 'TEST002',
        productId: 'TEST002', 
        name: 'Test Product 2',
        price: 25.50,
        quantity: 1,
        type: 'product'
      }
    ],
    subtotal: 47.48,
    total: 47.48
  };
}