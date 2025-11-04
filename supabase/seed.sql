-- SQL commands to seed the database with initial water tower data

-- Create a table for water towers
CREATE TABLE IF NOT EXISTS water_towers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    county VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial water tower data
INSERT INTO water_towers (name, latitude, longitude, county) VALUES
('Tower 1', 51.8389962, -0.0635921, 'County A'),
('Tower 2', 52.2534909, 0.3015661, 'County B'),
('Tower 3', 51.9190428, -1.2037503, 'County C'),
('Tower 4', 51.5556125, -0.4719584, 'County D'),
('Tower 5', 51.9301989, -1.1220296, 'County E');

-- Create a table for user visits
CREATE TABLE IF NOT EXISTS user_visits (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    tower_id INT REFERENCES water_towers(id) ON DELETE CASCADE,
    visited_at TIMESTAMP DEFAULT NOW(),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    photo_url VARCHAR(255)
);

-- Create a table for counties
CREATE TABLE IF NOT EXISTS counties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

-- Insert initial county data
INSERT INTO counties (name) VALUES
('County A'),
('County B'),
('County C'),
('County D'),
('County E');