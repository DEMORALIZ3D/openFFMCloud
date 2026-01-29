
-- Printers Table
CREATE TABLE IF NOT EXISTS printers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    power_watts REAL DEFAULT 0,
    config_content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Filaments Table
CREATE TABLE IF NOT EXISTS filaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    density REAL DEFAULT 1.24, -- g/cm3
    cost_per_kg REAL DEFAULT 20.0,
    diameter REAL DEFAULT 1.75,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- User Settings Table (for global calculator settings)
CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    electricity_cost_kwh REAL DEFAULT 0.15,
    vat_rate REAL DEFAULT 20.0,
    currency_symbol TEXT DEFAULT '$',
    FOREIGN KEY(user_id) REFERENCES users(id)
);
