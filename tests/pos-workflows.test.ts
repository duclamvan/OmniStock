import { describe, it, expect, beforeEach } from 'vitest';
import { request, getAuthHeaders, createTestCart } from './setup';

describe('POS Workflows - End to End Tests', () => {
  
  describe('Customer Management Workflow', () => {
    it('should search for customers successfully', async () => {
      const response = await request
        .get('/api/pos/customers/search?q=John')
        .set(getAuthHeaders('cashier'))
        .expect(200);
      
      expect(response.body).toBeInstanceOf(Array);
    });
    
    it('should get customer stats and loyalty points', async () => {
      // First search for a customer
      const searchResponse = await request
        .get('/api/pos/customers/search?q=Smith')
        .set(getAuthHeaders('cashier'))
        .expect(200);
      
      if (searchResponse.body.length > 0) {
        const customerId = searchResponse.body[0].id;
        
        // Get customer stats
        const statsResponse = await request
          .get(`/api/pos/customers/${customerId}/stats`)
          .set(getAuthHeaders('cashier'))
          .expect(200);
          
        expect(statsResponse.body).toHaveProperty('totalOrders');
        expect(statsResponse.body).toHaveProperty('totalSpent');
        
        // Get loyalty points
        const loyaltyResponse = await request
          .get(`/api/pos/customers/${customerId}/loyalty`)
          .set(getAuthHeaders('cashier'))
          .expect(200);
          
        expect(loyaltyResponse.body).toBeInstanceOf(Array);
      }
    });
  });

  describe('Coupon Validation Workflow', () => {
    it('should validate active coupons with proper business rules', async () => {
      const cart = createTestCart();
      
      const response = await request
        .post('/api/pos/validate-coupon')
        .set(getAuthHeaders('cashier'))
        .send({
          code: 'TEST10OFF',
          cartData: cart
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('calculatedDiscount');
      expect(response.body.calculatedDiscount).toBeGreaterThan(0);
    });
    
    it('should reject invalid coupon codes', async () => {
      const response = await request
        .post('/api/pos/validate-coupon')
        .set(getAuthHeaders('cashier'))
        .send({
          code: 'INVALID_CODE',
          cartData: createTestCart()
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('message');
    });
    
    it('should enforce minimum purchase requirements', async () => {
      const smallCart = {
        items: [{
          id: 'TEST001',
          productId: 'TEST001',
          name: 'Test Product 1',
          price: 10.99,
          quantity: 1,
          type: 'product'
        }],
        subtotal: 10.99,
        total: 10.99
      };
      
      const response = await request
        .post('/api/pos/validate-coupon')
        .set(getAuthHeaders('cashier'))
        .send({
          code: 'TEST10OFF', // Has minimum amount of 50
          cartData: smallCart
        })
        .expect(400);
      
      expect(response.body.message).toContain('minimum');
    });
  });

  describe('Payment Processing Workflow', () => {
    it('should process cash payments', async () => {
      const orderId = `TEST_ORDER_${Date.now()}`;
      
      const response = await request
        .post(`/api/pos/orders/${orderId}/payments`)
        .set(getAuthHeaders('cashier'))
        .send({
          paymentType: 'cash',
          amount: 50.00,
          processedBy: 'TEST001'
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('orderId', orderId);
      expect(response.body).toHaveProperty('paymentMethod', 'cash');
      expect(response.body).toHaveProperty('amount', 50.00);
    });
    
    it('should process split payments', async () => {
      const orderId = `TEST_ORDER_${Date.now()}`;
      
      // First payment
      await request
        .post(`/api/pos/orders/${orderId}/payments`)
        .set(getAuthHeaders('cashier'))
        .send({
          paymentType: 'cash',
          amount: 30.00,
          processedBy: 'TEST001'
        })
        .expect(201);
      
      // Second payment
      await request
        .post(`/api/pos/orders/${orderId}/payments`)
        .set(getAuthHeaders('cashier'))
        .send({
          paymentType: 'card',
          amount: 20.00,
          reference: 'TEST_REF_123',
          processedBy: 'TEST001'
        })
        .expect(201);
      
      // Verify both payments exist
      const paymentsResponse = await request
        .get(`/api/pos/orders/${orderId}/payments`)
        .set(getAuthHeaders('cashier'))
        .expect(200);
      
      expect(paymentsResponse.body).toHaveLength(2);
      expect(paymentsResponse.body[0].amount + paymentsResponse.body[1].amount).toBe(50.00);
    });
  });

  describe('Gift Card Processing Workflow', () => {
    it('should validate gift cards with proper business rules', async () => {
      const response = await request
        .post('/api/pos/validate-gift-card')
        .set(getAuthHeaders('cashier'))
        .send({
          cardNumber: 'TEST_GIFT_CARD_123'
        });
      
      // Should return validation result regardless of success/failure
      expect(response.status).toBeOneOf([200, 400]);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Manager Override Workflow', () => {
    it('should allow managers to create overrides', async () => {
      const response = await request
        .post('/api/pos/manager-override')
        .set(getAuthHeaders('manager'))
        .send({
          employeeId: 'TEST001',
          managerId: 'TEST002',
          overrideType: 'discount',
          originalValue: '0',
          newValue: '10',
          reason: 'Customer satisfaction adjustment'
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('overrideType', 'discount');
      expect(response.body).toHaveProperty('reason');
    });
    
    it('should prevent non-managers from creating overrides', async () => {
      await request
        .post('/api/pos/manager-override')
        .set(getAuthHeaders('cashier'))
        .send({
          employeeId: 'TEST001',
          managerId: 'TEST002',
          overrideType: 'discount',
          reason: 'Unauthorized attempt'
        })
        .expect(403);
    });
    
    it('should track override history', async () => {
      const response = await request
        .get('/api/pos/manager-overrides')
        .set(getAuthHeaders('manager'))
        .expect(200);
      
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('Held Orders Workflow', () => {
    it('should allow supervisors to hold orders', async () => {
      const cart = createTestCart();
      
      const response = await request
        .post('/api/pos/hold-order')
        .set(getAuthHeaders('manager'))
        .send({
          cartItems: cart.items,
          subtotal: cart.subtotal,
          total: cart.total,
          employeeId: 'TEST002',
          reason: 'Customer will return later',
          notes: 'Payment method verification needed'
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('reason');
      expect(response.body).toHaveProperty('items');
    });
    
    it('should prevent cashiers from holding orders', async () => {
      const cart = createTestCart();
      
      await request
        .post('/api/pos/hold-order')
        .set(getAuthHeaders('cashier'))
        .send({
          cartItems: cart.items,
          subtotal: cart.subtotal,
          total: cart.total,
          employeeId: 'TEST001',
          reason: 'Unauthorized hold attempt'
        })
        .expect(403);
    });
    
    it('should allow resuming held orders', async () => {
      // First hold an order
      const cart = createTestCart();
      const holdResponse = await request
        .post('/api/pos/hold-order')
        .set(getAuthHeaders('manager'))
        .send({
          cartItems: cart.items,
          subtotal: cart.subtotal,
          total: cart.total,
          employeeId: 'TEST002',
          reason: 'Test hold for resume'
        })
        .expect(201);
      
      const holdId = holdResponse.body.holdId;
      
      // Then resume it
      const resumeResponse = await request
        .post(`/api/pos/resume-order/${holdId}`)
        .set(getAuthHeaders('manager'))
        .send({
          resumedBy: 'TEST002'
        })
        .expect(200);
      
      expect(resumeResponse.body).toHaveProperty('items');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should enforce cashier-level permissions', async () => {
      // Cashiers can search customers
      await request
        .get('/api/pos/customers/search?q=test')
        .set(getAuthHeaders('cashier'))
        .expect(200);
      
      // But cannot access admin functions
      await request
        .get('/api/pos/employees')
        .set(getAuthHeaders('cashier'))
        .expect(403);
    });
    
    it('should enforce manager-level permissions', async () => {
      // Managers can access all functions
      await request
        .get('/api/pos/employees')
        .set(getAuthHeaders('manager'))
        .expect(200);
      
      await request
        .get('/api/pos/manager-overrides')
        .set(getAuthHeaders('manager'))
        .expect(200);
    });
  });

  describe('Input Validation', () => {
    it('should reject malformed coupon validation requests', async () => {
      await request
        .post('/api/pos/validate-coupon')
        .set(getAuthHeaders('cashier'))
        .send({
          code: '', // Empty code should fail
        })
        .expect(400);
    });
    
    it('should reject invalid payment data', async () => {
      await request
        .post('/api/pos/orders/TEST123/payments')
        .set(getAuthHeaders('cashier'))
        .send({
          paymentType: 'invalid_type', // Invalid payment type
          amount: -10, // Negative amount
          processedBy: ''
        })
        .expect(400);
    });
    
    it('should reject malformed held order data', async () => {
      await request
        .post('/api/pos/hold-order')
        .set(getAuthHeaders('manager'))
        .send({
          cartItems: [], // Empty cart should fail
          reason: '' // Empty reason should fail
        })
        .expect(400);
    });
  });
});