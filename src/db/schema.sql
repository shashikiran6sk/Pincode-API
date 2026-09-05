-- Create post_offices table
CREATE TABLE IF NOT EXISTS post_offices (
    id SERIAL PRIMARY KEY,
    office_name VARCHAR(150) NOT NULL,
    pincode VARCHAR(6) NOT NULL,
    branch_type VARCHAR(50) NOT NULL,
    delivery_status VARCHAR(30) NOT NULL,
    circle VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    division VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    block VARCHAR(100),
    state VARCHAR(100) NOT NULL,
    country VARCHAR(50) DEFAULT 'India',
    description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_post_offices_pincode ON post_offices (pincode);
CREATE INDEX IF NOT EXISTS idx_post_offices_district ON post_offices (LOWER(district));
CREATE INDEX IF NOT EXISTS idx_post_offices_state ON post_offices (LOWER(state));
CREATE INDEX IF NOT EXISTS idx_post_offices_name ON post_offices (LOWER(office_name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_office_pincode ON post_offices (pincode, office_name);

-- Create API keys table for dynamic key management if desired
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(128) NOT NULL UNIQUE,
    key_prefix VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash);
