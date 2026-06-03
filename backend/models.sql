CREATE EXTENSION IF NOT EXISTS vector;

-- Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price NUMERIC DEFAULT 0,
    stock INTEGER DEFAULT 0,
    image TEXT DEFAULT ''
);

-- Sales transactions table
CREATE TABLE sales_transactions (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    total_price NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (authentication)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- Store settings table
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT
);

-- AI command memory (pgvector)
CREATE TABLE command_memory (
    id SERIAL PRIMARY KEY,
    command TEXT,
    intent TEXT,
    product TEXT,
    embedding vector(32)
);

-- Index for faster sales lookups by product
CREATE INDEX idx_sales_product_name ON sales_transactions(product_name);

-- Index for faster stock queries
CREATE INDEX idx_products_stock ON products(stock);