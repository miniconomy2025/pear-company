ALTER TABLE bulk_deliveries
ADD COLUMN account_number VARCHAR(100) NOT NULL;

ALTER TABLE consumer_deliveries
ADD COLUMN account_number VARCHAR(100) NOT NULL;

ALTER TABLE machines
ADD COLUMN date_acquired TIMESTAMP,
ADD COLUMN date_retired TIMESTAMP;

CREATE TABLE machine_deliveries (
    machine_deliveries_id SERIAL PRIMARY KEY,
    machine_id INT NOT NULL REFERENCES machines(machine_id),
    delivery_reference INT NOT NULL,
    cost DECIMAL NOT NULL,
    address VARCHAR(100) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS parts_purchases_items;
DROP TABLE IF EXISTS parts_supplier;

ALTER TABLE parts_purchases
ADD COLUMN part_id INT NOT NULL REFERENCES parts(part_id),
ADD COLUMN quantity INT NOT NULL DEFAULT 0;

ALTER TABLE suppliers
ADD COLUMN part_id INT NOT NULL REFERENCES parts(part_id),
ADD COLUMN cost DECIMAL NOT NULL DEFAULT 0;

INSERT INTO status (description) VALUES 
    ('PendingDeliveryDropOff');