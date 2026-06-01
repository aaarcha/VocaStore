CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    price NUMERIC,
    stock INTEGER
);

CREATE TABLE sales_transactions (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(100),
    quantity INTEGER,
    total_price NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);