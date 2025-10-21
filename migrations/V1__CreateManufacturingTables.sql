-- Pear Company Manufacturing Database Schema
-- V1: Initial table creation for phone manufacturing business

-- Create accounts table first (referenced by other tables)
CREATE TABLE accounts (
    account_id SERIAL PRIMARY KEY,
    account_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(100) NOT NULL UNIQUE
);

-- Create status lookup table
CREATE TABLE status (
    status_id SERIAL PRIMARY KEY,
    description VARCHAR(100) NOT NULL UNIQUE
);

-- Insert default status values
INSERT INTO status (description) VALUES 
    ('Pending'),
    ('Processing'),
    ('Completed'),
    ('Cancelled'),
    ('Shipped'),
    ('Delivered'),
    ('Failed');

-- Create phones table (product catalog)
CREATE TABLE phones (
    phone_id SERIAL PRIMARY KEY,
    model VARCHAR(100) NOT NULL UNIQUE,
    price DECIMAL(100,2) NOT NULL CHECK (price > 0)
);

-- Create stock table for phone inventory
CREATE TABLE stock (
    stock_id SERIAL PRIMARY KEY,
    phone_id INTEGER NOT NULL REFERENCES phones(phone_id) ON DELETE CASCADE,
    quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
    quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(phone_id)
);

-- Create machines table (manufacturing equipment)
CREATE TABLE machines (
    machine_id SERIAL PRIMARY KEY,
    phone_id INTEGER NOT NULL REFERENCES phones(phone_id) ON DELETE CASCADE,
    rate_per_day INTEGER NOT NULL CHECK (rate_per_day > 0)
);

-- Create parts table (components for manufacturing)
CREATE TABLE parts (
    part_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Create machine_ratios table (manufacturing recipes)
CREATE TABLE machine_ratios (
    machine_ratio_id SERIAL PRIMARY KEY,
    machine_id INTEGER NOT NULL REFERENCES machines(machine_id) ON DELETE CASCADE,
    part_id INTEGER NOT NULL REFERENCES parts(part_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    UNIQUE(machine_id, part_id)
);

-- Create inventory table (parts stock)
CREATE TABLE inventory (
    inventory_id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL REFERENCES parts(part_id) ON DELETE CASCADE,
    quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
    UNIQUE(part_id)
);

-- Create suppliers table
CREATE TABLE suppliers (
    supplier_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE RESTRICT,
    address VARCHAR(100) NOT NULL
);

-- Create parts_supplier table (supplier catalog with pricing)
CREATE TABLE parts_supplier (
    parts_supplier_id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL REFERENCES parts(part_id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    cost DECIMAL(100,2) NOT NULL CHECK (cost > 0),
    UNIQUE(part_id, supplier_id)
);

-- Create parts_purchases table (purchase orders to suppliers)
CREATE TABLE parts_purchases (
    parts_purchase_id SERIAL PRIMARY KEY,
    reference_number INTEGER NOT NULL UNIQUE,
    cost DECIMAL(100,2) NOT NULL CHECK (cost >= 0),
    status INTEGER NOT NULL REFERENCES status(status_id) DEFAULT 1,
    purchased_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create parts_purchases_items table (line items for purchase orders)
CREATE TABLE parts_purchases_items (
    parts_purchases_items_id SERIAL PRIMARY KEY,
    part_supplier_id INTEGER NOT NULL REFERENCES parts_supplier(parts_supplier_id) ON DELETE CASCADE,
    parts_purchase_id INTEGER NOT NULL REFERENCES parts_purchases(parts_purchase_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- Create bulk_deliveries table (incoming parts deliveries)
CREATE TABLE bulk_deliveries (
    bulk_delivery_id SERIAL PRIMARY KEY,
    parts_purchase_id INTEGER NOT NULL REFERENCES parts_purchases(parts_purchase_id) ON DELETE CASCADE,
    delivery_reference INTEGER NOT NULL UNIQUE,
    cost DECIMAL(100,2) NOT NULL CHECK (cost >= 0),
    status INTEGER NOT NULL REFERENCES status(status_id) DEFAULT 1,
    address VARCHAR(100) NOT NULL,
    account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE RESTRICT
);

-- Create orders table (customer orders)
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    price DECIMAL(100,2) NOT NULL CHECK (price >= 0),
    amount_paid DECIMAL(100,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    status INTEGER NOT NULL REFERENCES status(status_id) DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table (line items for customer orders)
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    phone_id INTEGER NOT NULL REFERENCES phones(phone_id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- Create consumer_deliveries table (outgoing phone deliveries)
CREATE TABLE consumer_deliveries (
    consumer_delivery_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    delivery_reference INTEGER NOT NULL UNIQUE,
    cost DECIMAL(100,2) NOT NULL CHECK (cost >= 0),
    status INTEGER NOT NULL REFERENCES status(status_id) DEFAULT 1,
    account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE RESTRICT
);

-- Create system_settings table (configuration)
CREATE TABLE system_settings (
    system_setting_id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value VARCHAR(100) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_stock_phone_id ON stock(phone_id);
CREATE INDEX idx_machines_phone_id ON machines(phone_id);
CREATE INDEX idx_machine_ratios_machine_id ON machine_ratios(machine_id);
CREATE INDEX idx_machine_ratios_part_id ON machine_ratios(part_id);
CREATE INDEX idx_inventory_part_id ON inventory(part_id);
CREATE INDEX idx_parts_supplier_part_id ON parts_supplier(part_id);
CREATE INDEX idx_parts_supplier_supplier_id ON parts_supplier(supplier_id);
CREATE INDEX idx_parts_purchases_status ON parts_purchases(status);
CREATE INDEX idx_parts_purchases_purchased_at ON parts_purchases(purchased_at);
CREATE INDEX idx_bulk_deliveries_status ON bulk_deliveries(status);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_phone_id ON order_items(phone_id);
CREATE INDEX idx_consumer_deliveries_status ON consumer_deliveries(status);

-- Create triggers to automatically update stock.updated_at
CREATE OR REPLACE FUNCTION update_stock_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_timestamp
    BEFORE UPDATE ON stock
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_timestamp();

-- Insert initial system settings
INSERT INTO system_settings (key, value) VALUES 
    ('company_name', 'Pear Company'),
    ('currency', 'D'),
    ('timezone', 'UTC'),
    ('manufacturing_enabled', 'true'),
    ('auto_fulfill_orders', 'false');

-- Insert default account for the company
INSERT INTO accounts (account_name, account_number) VALUES 
    ('Pear Company Main', 'PEAR001');

COMMENT ON TABLE phones IS 'Product catalog for Pear phone models';
COMMENT ON TABLE machines IS 'Manufacturing machines and their daily production rates';
COMMENT ON TABLE machine_ratios IS 'Manufacturing recipes - parts required per phone per machine';
COMMENT ON TABLE parts IS 'Components used in phone manufacturing';
COMMENT ON TABLE inventory IS 'Current stock levels of manufacturing parts';
COMMENT ON TABLE stock IS 'Current inventory of finished phones';
COMMENT ON TABLE suppliers IS 'External suppliers for purchasing parts';
COMMENT ON TABLE parts_supplier IS 'Supplier catalog with part pricing';
COMMENT ON TABLE parts_purchases IS 'Purchase orders sent to suppliers';
COMMENT ON TABLE orders IS 'Customer orders for phones';
COMMENT ON TABLE bulk_deliveries IS 'Incoming deliveries of purchased parts';
COMMENT ON TABLE consumer_deliveries IS 'Outgoing deliveries of sold phones';
