const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'wheel_inventory',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'wheel_secure_pass_2024',
});

// Initialize database
const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS wheels (
        id SERIAL PRIMARY KEY,
        sku VARCHAR(50) UNIQUE NOT NULL,
        year INTEGER NOT NULL,
        make VARCHAR(50) NOT NULL,
        model VARCHAR(100) NOT NULL,
        wheel_size VARCHAR(20) NOT NULL,
        offset VARCHAR(20),
        bolt_pattern VARCHAR(20),
        condition VARCHAR(50) NOT NULL,
        quantity INTEGER DEFAULT 1,
        location VARCHAR(100),
        notes TEXT,
        qr_code TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    client.release();
  }
};

// Generate SKU based on wheel data
const generateSKU = (wheelData) => {
  const { year, make, model, wheel_size, condition } = wheelData;
  
  // Format: SUB-YY-MODEL-SIZE-COND-RANDOM
  const makeCode = make.substring(0, 3).toUpperCase();
  const yearCode = year.toString().slice(-2);
  const modelCode = model.replace(/\s+/g, '').substring(0, 4).toUpperCase();
  const sizeCode = wheel_size.replace(/[^0-9]/g, '');
  const condCode = condition.charAt(0).toUpperCase();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${makeCode}-${yearCode}-${modelCode}-${sizeCode}-${condCode}-${random}`;
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get all wheels
app.get('/api/wheels', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM wheels ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching wheels:', error);
    res.status(500).json({ error: 'Failed to fetch wheels' });
  }
});

// Get single wheel by ID
app.get('/api/wheels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM wheels WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wheel not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching wheel:', error);
    res.status(500).json({ error: 'Failed to fetch wheel' });
  }
});

// Get wheel by SKU
app.get('/api/wheels/sku/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const result = await pool.query('SELECT * FROM wheels WHERE sku = $1', [sku]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wheel not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching wheel by SKU:', error);
    res.status(500).json({ error: 'Failed to fetch wheel' });
  }
});

// Add new wheel
app.post('/api/wheels', async (req, res) => {
  try {
    const wheelData = req.body;
    
    // Generate SKU
    const sku = generateSKU(wheelData);
    
    // Generate QR Code
    const qrCodeDataURL = await QRCode.toDataURL(sku, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1,
      margin: 1,
      width: 300
    });
    
    const result = await pool.query(
      `INSERT INTO wheels 
       (sku, year, make, model, wheel_size, offset, bolt_pattern, condition, quantity, location, notes, qr_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        sku,
        wheelData.year,
        wheelData.make,
        wheelData.model,
        wheelData.wheel_size,
        wheelData.offset || null,
        wheelData.bolt_pattern || null,
        wheelData.condition,
        wheelData.quantity || 1,
        wheelData.location || null,
        wheelData.notes || null,
        qrCodeDataURL
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding wheel:', error);
    res.status(500).json({ error: 'Failed to add wheel' });
  }
});

// Update wheel
app.put('/api/wheels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const wheelData = req.body;
    
    const result = await pool.query(
      `UPDATE wheels 
       SET year = $1, make = $2, model = $3, wheel_size = $4, offset = $5, 
           bolt_pattern = $6, condition = $7, quantity = $8, location = $9, 
           notes = $10, updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        wheelData.year,
        wheelData.make,
        wheelData.model,
        wheelData.wheel_size,
        wheelData.offset || null,
        wheelData.bolt_pattern || null,
        wheelData.condition,
        wheelData.quantity || 1,
        wheelData.location || null,
        wheelData.notes || null,
        id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wheel not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating wheel:', error);
    res.status(500).json({ error: 'Failed to update wheel' });
  }
});

// Delete wheel
app.delete('/api/wheels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM wheels WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wheel not found' });
    }
    
    res.json({ message: 'Wheel deleted successfully', wheel: result.rows[0] });
  } catch (error) {
    console.error('Error deleting wheel:', error);
    res.status(500).json({ error: 'Failed to delete wheel' });
  }
});

// Search wheels
app.get('/api/wheels/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const result = await pool.query(
      `SELECT * FROM wheels 
       WHERE sku ILIKE $1 
          OR make ILIKE $1 
          OR model ILIKE $1 
          OR CAST(year AS TEXT) ILIKE $1
          OR location ILIKE $1
       ORDER BY created_at DESC`,
      [`%${query}%`]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching wheels:', error);
    res.status(500).json({ error: 'Failed to search wheels' });
  }
});

// Start server
const startServer = async () => {
  await initDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
