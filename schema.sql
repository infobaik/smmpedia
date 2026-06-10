-- schema.sql
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    balance REAL DEFAULT 0.0,
    role TEXT DEFAULT 'member',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS services;
CREATE TABLE services (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    rate REAL NOT NULL,
    margin REAL DEFAULT 0.0,
    min_order INTEGER NOT NULL,
    max_order INTEGER NOT NULL,
    status TEXT DEFAULT 'active'
);

DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    provider_order_id TEXT,
    link TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    charge REAL NOT NULL,
    reference_media_url TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
);

DROP TABLE IF EXISTS idempotency_store;
CREATE TABLE idempotency_store (
    key TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS custom_providers;
CREATE TABLE custom_providers (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    request_method TEXT DEFAULT 'POST',
    content_type TEXT DEFAULT 'application/json',
    headers_template TEXT DEFAULT '{}',
    order_body_template TEXT NOT NULL,
    check_body_template TEXT NOT NULL,
    response_mapping TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pembuatan akun admin default (Password: admin123)
-- Pastikan mengganti password ini setelah instalasi pertama
INSERT INTO users (id, email, password_hash, balance, role) 
VALUES ('admin-001', 'admin@panel.com', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 1000000.0, 'admin');
