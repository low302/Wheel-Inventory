const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const PDFDocument = require('pdfkit');
const compression = require('compression');
const helmet = require('helmet');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'wheeluser',
  password: process.env.DB_PASSWORD || 'wheelpass',
  database: process.env.DB_NAME || 'wheel_inventory',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

let redisClient = null;
let cacheEnabled = false;

(async () => {
  try {
    redisClient = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379,
      }
    });
    
    redisClient.on('error', (err) => {
      console.log('Redis Client Error (cache disabled):', err.message);
      cacheEnabled = false;
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis cache connected');
      cacheEnabled = true;
    });

    await redisClient.connect();
  } catch (err) {
    console.log('ℹ️  Redis not available - running without cache');
    cacheEnabled = false;
  }
})();

const CACHE_TTL = 300;

async function getCache(key) {
  if (!cacheEnabled || !redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Cache get error:', err.message);
    return null;
  }
}

async function setCache(key, value, ttl = CACHE_TTL) {
  if (!cacheEnabled || !redisClient) return;
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.error('Cache set error:', err.message);
  }
}

async function invalidateCache(pattern = '*') {
  if (!cacheEnabled || !redisClient) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    console.error('Cache invalidation error:', err.message);
  }
}

async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    return res;
  } catch (err) {
    console.error('Database error:', err.message);
    throw err;
  }
}

function calculateUPCACheckDigit(code) {
  let sum = 0;
  for (let i = 0; i < code.length; i++) {
    const digit = parseInt(code[i]);
    if (i % 2 === 0) {
      sum += digit * 3;
    } else {
      sum += digit;
    }
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

async function generateIntelligentUPCASKU(partNumber, year, grade) {
  // Extract numeric part from part number and pad to 5 digits
  const numericPartNumber = partNumber.replace(/\D/g, '');
  const partDigits = numericPartNumber.substring(0, 5).padStart(5, '0');
  
  // Get last 2 digits of year
  const yearDigits = String(year).slice(-2);
  
  // Convert grade to number (A=1, B=2, C=3)
  const gradeMap = { 'A': '1', 'B': '2', 'C': '3' };
  const gradeDigit = gradeMap[grade] || '1';
  
  // Create base code: partNumber(5) + year(2) + grade(1) = 8 digits
  const baseCode = partDigits + yearDigits + gradeDigit;
  
  // Find the highest sequence number for this base code
  const result = await query(
    `SELECT sku FROM wheels 
     WHERE sku LIKE $1 
     ORDER BY sku DESC 
     LIMIT 1`,
    [`${baseCode}%`]
  );

  let sequenceNumber = 1;
  if (result.rows.length > 0) {
    const lastSKU = result.rows[0].sku;
    // Extract sequence number (positions 8-10, which is index 8-10 in 0-based)
    const lastSequence = parseInt(lastSKU.substring(8, 11));
    if (!isNaN(lastSequence)) {
      sequenceNumber = lastSequence + 1;
    }
  }
  
  // Pad sequence to 3 digits (001, 002, etc.)
  const sequenceDigits = String(sequenceNumber).padStart(3, '0');
  
  // Create 11-digit code
  const elevenDigitCode = baseCode + sequenceDigits;
  
  // Calculate and add check digit
  const checkDigit = calculateUPCACheckDigit(elevenDigitCode);
  const upcaSKU = elevenDigitCode + checkDigit;

  return upcaSKU;
}

async function logAudit(wheelId, action, oldData, newData) {
  try {
    await query(
      `INSERT INTO wheel_audit (wheel_id, action, old_data, new_data) 
       VALUES ($1, $2, $3, $4)`,
      [wheelId, action, oldData ? JSON.stringify(oldData) : null, newData ? JSON.stringify(newData) : null]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({
      status: 'healthy',
      database: 'connected',
      cache: cacheEnabled ? 'enabled' : 'disabled',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/wheels', async (req, res) => {
  try {
    const cacheKey = 'wheels:all';
    const cached = await getCache(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    const result = await query(
      `SELECT * FROM wheels 
       ORDER BY created_at DESC`,
      []
    );

    await setCache(cacheKey, result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching wheels:', err);
    res.status(500).json({ error: 'Failed to fetch wheels' });
  }
});

app.get('/api/summary', async (req, res) => {
  try {
    const cacheKey = 'summary';
    const cached = await getCache(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    const result = await query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'available') as available_count,
         COUNT(*) FILTER (WHERE status = 'sold') as sold_count,
         COALESCE(SUM(retail_price) FILTER (WHERE status = 'available'), 0) as available_value,
         COALESCE(SUM(retail_price) FILTER (WHERE status = 'sold'), 0) as sold_value
       FROM wheels`,
      []
    );

    const summary = {
      availableCount: parseInt(result.rows[0].available_count) || 0,
      soldCount: parseInt(result.rows[0].sold_count) || 0,
      availableValue: parseFloat(result.rows[0].available_value) || 0,
      soldValue: parseFloat(result.rows[0].sold_value) || 0,
    };

    await setCache(cacheKey, summary, 60);
    res.json(summary);
  } catch (err) {
    console.error('Error fetching summary:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

app.post('/api/wheels', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { part_number, size, offset, model, year, finish, grade, retail_price } = req.body;

    if (!part_number || !size || !model || !year || !grade || !retail_price) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const formattedOffset = offset && !offset.startsWith('+') && !offset.startsWith('-') 
      ? `+${offset}` 
      : offset;

    // Generate intelligent UPC-A SKU with wheel info encoded
    const sku = await generateIntelligentUPCASKU(part_number, year, grade);

    const result = await client.query(
      `INSERT INTO wheels (part_number, size, "offset", model, year, finish, grade, retail_price, sku, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'available') 
       RETURNING *`,
      [part_number, size, formattedOffset, model, year, finish, grade, retail_price, sku]
    );

    await logAudit(result.rows[0].id, 'INSERT', null, result.rows[0]);
    await client.query('COMMIT');
    
    await invalidateCache('wheels:*');
    await invalidateCache('summary');

    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding wheel:', err);
    res.status(500).json({ error: 'Failed to add wheel' });
  } finally {
    client.release();
  }
});

app.patch('/api/wheels/:id/status', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { status } = req.body;

    const oldData = await client.query('SELECT * FROM wheels WHERE id = $1', [id]);
    if (oldData.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Wheel not found' });
    }

    const soldAt = status === 'sold' ? 'CURRENT_TIMESTAMP' : 'NULL';
    
    const result = await client.query(
      `UPDATE wheels 
       SET status = $1, sold_at = ${soldAt}
       WHERE id = $2 
       RETURNING *`,
      [status, id]
    );

    await logAudit(id, 'UPDATE', oldData.rows[0], result.rows[0]);
    await client.query('COMMIT');

    await invalidateCache('wheels:*');
    await invalidateCache('summary');

    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  } finally {
    client.release();
  }
});

app.delete('/api/wheels/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    const oldData = await client.query('SELECT * FROM wheels WHERE id = $1', [id]);
    if (oldData.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Wheel not found' });
    }

    await client.query('DELETE FROM wheels WHERE id = $1', [id]);
    await logAudit(id, 'DELETE', oldData.rows[0], null);
    await client.query('COMMIT');

    await invalidateCache('wheels:*');
    await invalidateCache('summary');

    res.json({ message: 'Wheel deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting wheel:', err);
    res.status(500).json({ error: 'Failed to delete wheel' });
  } finally {
    client.release();
  }
});

app.get('/api/wheels/:id/label', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM wheels WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wheel not found' });
    }

    const wheel = result.rows[0];

    const doc = new PDFDocument({ size: [288, 216] });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="wheel_label_${wheel.sku}.pdf"`);
    
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text('OEM SUBARU WHEEL', 20, 20);
    doc.fontSize(12).font('Helvetica');
    
    doc.text(`SKU: ${wheel.sku}`, 20, 50);
    doc.text(`Part #: ${wheel.part_number}`, 20, 70);
    doc.text(`Size: ${wheel.size}`, 20, 90);
    if (wheel.offset) doc.text(`Offset: ${wheel.offset}`, 20, 110);
    doc.text(`Model: ${wheel.model}`, 20, 130);
    doc.text(`Year: ${wheel.year}`, 20, 150);
    if (wheel.finish) doc.text(`Finish: ${wheel.finish}`, 20, 170);
    doc.text(`Grade: ${wheel.grade}`, 20, 190);
    
    doc.fontSize(18).font('Helvetica-Bold').text(`$${parseFloat(wheel.retail_price).toFixed(2)}`, 180, 170);

    doc.end();
  } catch (err) {
    console.error('Error generating label:', err);
    res.status(500).json({ error: 'Failed to generate label' });
  }
});

app.get('/api/wheels/:id/invoice', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM wheels WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wheel not found' });
    }

    const wheel = result.rows[0];

    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${wheel.sku}.pdf"`);
    
    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text('INVOICE', 50, 50);
    doc.fontSize(10).font('Helvetica').text(`Date: ${new Date().toLocaleDateString()}`, 50, 80);
    doc.text(`Invoice #: INV-${wheel.id}`, 50, 95);

    doc.moveDown(2);
    doc.fontSize(12).font('Helvetica-Bold').text('Item Details:', 50, 130);
    doc.fontSize(10).font('Helvetica');
    doc.text(`SKU: ${wheel.sku}`, 50, 150);
    doc.text(`Description: ${wheel.model} ${wheel.year} ${wheel.size} OEM Wheel`, 50, 165);
    doc.text(`Part Number: ${wheel.part_number}`, 50, 180);
    doc.text(`Finish: ${wheel.finish || 'N/A'}`, 50, 195);
    doc.text(`Grade: ${wheel.grade}`, 50, 210);

    doc.moveDown(2);
    doc.fontSize(12).font('Helvetica-Bold').text('Amount:', 50, 250);
    doc.fontSize(14).text(`$${parseFloat(wheel.retail_price).toFixed(2)}`, 50, 270);

    doc.fontSize(8).font('Helvetica').text('Thank you for your business!', 50, 700);

    doc.end();
  } catch (err) {
    console.error('Error generating invoice:', err);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  if (redisClient) await redisClient.quit();
  await pool.end();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
  console.log(`🗄️  Cache: ${cacheEnabled ? 'Enabled (Redis)' : 'Disabled'}`);
  console.log(`🔢 SKU Format: Intelligent UPC-A (Part# + Year + Grade + Sequence)`);
});

module.exports = app;
