-- Enhanced water towers schema with better structure for real data
-- This migration adds additional fields for comprehensive tower data

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS images CASCADE;
DROP TABLE IF EXISTS water_towers CASCADE;
DROP TABLE IF EXISTS counties CASCADE;

-- Counties table for organizing towers by UK regions
CREATE TABLE counties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(2) NOT NULL, -- EN=England, WA=Wales, SC=Scotland, NI=Northern Ireland
    fips_code VARCHAR(10) UNIQUE, -- Using GB- prefix for UK counties
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced water towers table
CREATE TABLE water_towers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    county_id INTEGER REFERENCES counties(id),
    
    -- OpenStreetMap data fields
    osm_id VARCHAR(50) UNIQUE,
    osm_type VARCHAR(20), -- 'node', 'way', 'relation'
    
    -- Physical properties
    height FLOAT, -- in meters
    material VARCHAR(100), -- steel, concrete, etc.
    capacity INTEGER, -- in gallons/liters
    construction_year INTEGER,
    
    -- Status and condition
    operational BOOLEAN DEFAULT true,
    condition VARCHAR(50), -- excellent, good, fair, poor
    last_inspection DATE,
    
    -- Additional metadata
    tags JSONB, -- Store OSM tags and other flexible data
    address TEXT,
    owner VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Images table for tower photos
CREATE TABLE tower_images (
    id SERIAL PRIMARY KEY,
    tower_id INTEGER REFERENCES water_towers(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    uploaded_by UUID, -- Will reference auth.users
    created_at TIMESTAMP DEFAULT NOW()
);

-- User visits table for tracking tower visits
CREATE TABLE tower_visits (
    id SERIAL PRIMARY KEY,
    tower_id INTEGER REFERENCES water_towers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    visited_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure one visit per user per tower (can be updated)
    UNIQUE(tower_id, user_id)
);

-- Comments/reviews table
CREATE TABLE tower_comments (
    id SERIAL PRIMARY KEY,
    tower_id INTEGER REFERENCES water_towers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    comment TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_water_towers_location ON water_towers USING GIST (
    ll_to_earth(latitude, longitude)
);
CREATE INDEX idx_water_towers_county ON water_towers(county_id);
CREATE INDEX idx_water_towers_osm ON water_towers(osm_id);
CREATE INDEX idx_tower_visits_user ON tower_visits(user_id);
CREATE INDEX idx_tower_visits_tower ON tower_visits(tower_id);
CREATE INDEX idx_tower_comments_tower ON tower_comments(tower_id);

-- Enable Row Level Security
ALTER TABLE water_towers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tower_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE tower_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tower_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE counties ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Everyone can read tower data
CREATE POLICY "Everyone can view towers" ON water_towers FOR SELECT USING (true);
CREATE POLICY "Everyone can view counties" ON counties FOR SELECT USING (true);

-- Only authenticated users can add/edit tower visits
CREATE POLICY "Users can manage their visits" ON tower_visits 
    FOR ALL USING (auth.uid() = user_id);

-- Only authenticated users can add comments
CREATE POLICY "Users can manage their comments" ON tower_comments 
    FOR ALL USING (auth.uid() = user_id);

-- Everyone can view comments and images
CREATE POLICY "Everyone can view comments" ON tower_comments FOR SELECT USING (true);
CREATE POLICY "Everyone can view images" ON tower_images FOR SELECT USING (true);

-- Users can upload images
CREATE POLICY "Authenticated users can upload images" ON tower_images 
    FOR INSERT WITH CHECK (auth.uid() = uploaded_by);