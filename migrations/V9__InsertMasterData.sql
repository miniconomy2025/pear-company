INSERT INTO parts (part_id, name) VALUES 
    (1, 'Cases'),
    (2, 'Screens'),
    (3, 'Electronics');

INSERT INTO suppliers (part_id, cost, name, address) VALUES 
    (1, 0, 'case-supplier', 'case-supplier'),
    (2, 0, 'screen-supplier', 'screen-supplier'),
    (3, 0, 'electronics-supplier', 'electronics-supplier');

INSERT INTO inventory (part_id, quantity_available) VALUES 
    (1, 0),
    (2, 0),
    (3, 0)
ON CONFLICT (part_id) DO UPDATE SET 
    quantity_available = EXCLUDED.quantity_available;

ALTER TABLE phones DROP CONSTRAINT phones_price_check;
INSERT INTO phones (phone_id, model, price) VALUES 
    (1, 'ePhone', 0.00),
    (2, 'ePhone plus', 0.00),
    (3, 'ePhone pro max', 0.00)
ON CONFLICT (model) DO UPDATE SET 
    price = EXCLUDED.price;
ALTER TABLE phones ADD CONSTRAINT phones_price_check CHECK (price >= 0);

INSERT INTO stock (phone_id, quantity_available, quantity_reserved, updated_at) VALUES 
    (1, 0, 0, NOW()),
    (2, 0, 0, NOW()),
    (3, 0, 0, NOW())
ON CONFLICT (phone_id) DO UPDATE SET 
    quantity_available = EXCLUDED.quantity_available,
    quantity_reserved = EXCLUDED.quantity_reserved,
    updated_at = EXCLUDED.updated_at;
