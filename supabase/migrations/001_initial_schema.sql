CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE water_towers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    visited BOOLEAN DEFAULT FALSE,
    rating INTEGER CHECK (rating >= 0 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    water_tower_id INTEGER REFERENCES water_towers(id),
    image_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);