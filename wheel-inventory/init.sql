-- Enhanced Wheel Inventory Database Schema with Performance Optimizations

CREATE TABLE IF NOT EXISTS wheels (
    id SERIAL PRIMARY KEY,
    part_number VARCHAR(100) NOT NULL,
    size VARCHAR(50) NOT NULL,
    "offset" VARCHAR(20),
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    finish VARCHAR(100),
    grade VARCHAR(50),
    retail_price DECIMAL(10, 2) NOT NULL,
    sku VARCHAR(200) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'available',
    sold_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_wheels_status ON wheels(status);
CREATE INDEX IF NOT EXISTS idx_wheels_sku ON wheels(sku);
CREATE INDEX IF NOT EXISTS idx_wheels_part_number ON wheels(part_number);
CREATE INDEX IF NOT EXISTS idx_wheels_model ON wheels(model);
CREATE INDEX IF NOT EXISTS idx_wheels_year ON wheels(year);
CREATE INDEX IF NOT EXISTS idx_wheels_created_at ON wheels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wheels_sold_at ON wheels(sold_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_wheels_status_created ON wheels(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wheels_model_year ON wheels(model, year);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_wheels_updated_at ON wheels;
CREATE TRIGGER update_wheels_updated_at
    BEFORE UPDATE ON wheels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Audit table for tracking changes
CREATE TABLE IF NOT EXISTS wheel_audit (
    audit_id SERIAL PRIMARY KEY,
    wheel_id INTEGER,
    action VARCHAR(20),
    old_data JSONB,
    new_data JSONB,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_wheel_id ON wheel_audit(wheel_id);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON wheel_audit(changed_at DESC);

-- Insert some sample data for testing
INSERT INTO wheels (part_number, size, "offset", model, year, finish, grade, retail_price, sku, status) 
VALUES 
    ('68811', '17x7.5', '+55', 'Crosstrek', 2018, 'Silver', 'A', 150.00, '68811-17x7.5-2018A', 'available'),
    ('68812', '18x8.5', '+48', 'WRX', 2020, 'Black', 'A', 200.00, '68812-18x8.5-2020A', 'available'),
    ('68813', '19x8.5', '+55', 'Forester', 2021, 'Silver', 'B', 175.00, '68813-19x8.5-2021B', 'sold')
ON CONFLICT (sku) DO NOTHING;
