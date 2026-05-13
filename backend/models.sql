CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    price NUMERIC,
    stock INTEGER
);

CREATE TABLE sales_transactions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER,
    quantity INTEGER,
    total_price NUMERIC,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);