const request = require('supertest');
const app = require('../server');

describe('Wheel Inventory API Tests', () => {
  let createdWheelId;

  // Health Check Tests
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('database');
    });
  });

  // GET All Wheels Tests
  describe('GET /api/wheels', () => {
    it('should get all wheels', async () => {
      const res = await request(app).get('/api/wheels');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // GET Summary Tests
  describe('GET /api/summary', () => {
    it('should get inventory summary', async () => {
      const res = await request(app).get('/api/summary');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('availableCount');
      expect(res.body).toHaveProperty('soldCount');
      expect(res.body).toHaveProperty('availableValue');
      expect(res.body).toHaveProperty('soldValue');
    });

    it('should return numbers for all summary fields', async () => {
      const res = await request(app).get('/api/summary');
      expect(typeof res.body.availableCount).toBe('number');
      expect(typeof res.body.soldCount).toBe('number');
      expect(typeof res.body.availableValue).toBe('number');
      expect(typeof res.body.soldValue).toBe('number');
    });
  });

  // POST Create Wheel Tests
  describe('POST /api/wheels', () => {
    it('should create a new wheel', async () => {
      const newWheel = {
        part_number: '68999',
        size: '17x8',
        offset: '48',
        model: 'Outback',
        year: 2022,
        finish: 'Silver',
        grade: 'A',
        retail_price: 180.00
      };

      const res = await request(app)
        .post('/api/wheels')
        .send(newWheel);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('sku');
      expect(res.body.part_number).toBe(newWheel.part_number);
      expect(res.body.offset).toBe('+48'); // Should auto-add + prefix
      
      createdWheelId = res.body.id; // Save for later tests
    });

    it('should reject wheel with missing required fields', async () => {
      const incompleteWheel = {
        part_number: '68999',
        size: '17x8'
        // Missing required fields
      };

      const res = await request(app)
        .post('/api/wheels')
        .send(incompleteWheel);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should auto-generate unique SKU for duplicate wheels', async () => {
      const wheel1 = {
        part_number: '68888',
        size: '18x8',
        offset: '50',
        model: 'Legacy',
        year: 2021,
        finish: 'Black',
        grade: 'B',
        retail_price: 160.00
      };

      const res1 = await request(app).post('/api/wheels').send(wheel1);
      expect(res1.statusCode).toBe(201);
      const sku1 = res1.body.sku;

      // Create duplicate
      const res2 = await request(app).post('/api/wheels').send(wheel1);
      expect(res2.statusCode).toBe(201);
      const sku2 = res2.body.sku;

      // SKUs should be different
      expect(sku1).not.toBe(sku2);
      expect(sku2).toContain('-2'); // Second one should have -2 suffix
    });
  });

  // PATCH Update Status Tests
  describe('PATCH /api/wheels/:id/status', () => {
    it('should update wheel status to sold', async () => {
      if (!createdWheelId) {
        // Create a wheel if we don't have one
        const newWheel = {
          part_number: '68777',
          size: '19x8.5',
          offset: '55',
          model: 'Forester',
          year: 2023,
          finish: 'Gray',
          grade: 'A',
          retail_price: 190.00
        };
        const createRes = await request(app).post('/api/wheels').send(newWheel);
        createdWheelId = createRes.body.id;
      }

      const res = await request(app)
        .patch(`/api/wheels/${createdWheelId}/status`)
        .send({ status: 'sold' });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('sold');
      expect(res.body.sold_at).not.toBeNull();
    });

    it('should update wheel status back to available', async () => {
      const res = await request(app)
        .patch(`/api/wheels/${createdWheelId}/status`)
        .send({ status: 'available' });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('available');
    });

    it('should return 404 for non-existent wheel', async () => {
      const res = await request(app)
        .patch('/api/wheels/999999/status')
        .send({ status: 'sold' });

      expect(res.statusCode).toBe(404);
    });
  });

  // PDF Generation Tests
  describe('PDF Generation', () => {
    it('should generate a label PDF', async () => {
      if (!createdWheelId) {
        const newWheel = {
          part_number: '68666',
          size: '17x7',
          offset: '45',
          model: 'Impreza',
          year: 2020,
          finish: 'Silver',
          grade: 'A',
          retail_price: 150.00
        };
        const createRes = await request(app).post('/api/wheels').send(newWheel);
        createdWheelId = createRes.body.id;
      }

      const res = await request(app).get(`/api/wheels/${createdWheelId}/label`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
    });

    it('should generate an invoice PDF', async () => {
      const res = await request(app).get(`/api/wheels/${createdWheelId}/invoice`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
    });

    it('should return 404 for non-existent wheel label', async () => {
      const res = await request(app).get('/api/wheels/999999/label');
      expect(res.statusCode).toBe(404);
    });
  });

  // DELETE Wheel Tests
  describe('DELETE /api/wheels/:id', () => {
    it('should delete a wheel', async () => {
      // Create a wheel to delete
      const newWheel = {
        part_number: '68555',
        size: '16x7',
        offset: '50',
        model: 'Crosstrek',
        year: 2019,
        finish: 'Black',
        grade: 'C',
        retail_price: 120.00
      };
      const createRes = await request(app).post('/api/wheels').send(newWheel);
      const wheelToDelete = createRes.body.id;

      const res = await request(app).delete(`/api/wheels/${wheelToDelete}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');

      // Verify it's deleted
      const getRes = await request(app).get('/api/wheels');
      const deletedWheel = getRes.body.find(w => w.id === wheelToDelete);
      expect(deletedWheel).toBeUndefined();
    });

    it('should return 404 when deleting non-existent wheel', async () => {
      const res = await request(app).delete('/api/wheels/999999');
      expect(res.statusCode).toBe(404);
    });
  });
});

// Performance Tests
describe('Performance Tests', () => {
  it('should respond to health check within 100ms', async () => {
    const start = Date.now();
    await request(app).get('/api/health');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should handle multiple concurrent requests', async () => {
    const requests = Array(10).fill(null).map(() => 
      request(app).get('/api/wheels')
    );

    const responses = await Promise.all(requests);
    responses.forEach(res => {
      expect(res.statusCode).toBe(200);
    });
  });
});
