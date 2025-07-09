CREATE OR REPLACE PROCEDURE clear_all_except_status_and_phones()
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM machine_deliveries;
    DELETE FROM machine_purchases;
    DELETE FROM consumer_deliveries;
    DELETE FROM bulk_deliveries;
    DELETE FROM parts_purchases;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM machines;
    DELETE FROM machine_ratios;
    
    UPDATE inventory SET quantity_available = 0;
    UPDATE stock SET quantity_available = 0, quantity_reserved = 0, updated_at = NOW();
    UPDATE suppliers SET cost = 0;
    
    UPDATE phones SET price = 0.00;
    
    RAISE NOTICE 'All transactional data cleared. Inventory, stock, and prices reset to 0.';
END;
$$;

INSERT INTO system_settings (key, value) VALUES 
    ('company_name', 'Pear Company'),
    ('currency', 'D'),
    ('timezone', 'UTC'),
    ('manufacturing_enabled', 'true'),
    ('auto_fulfill_orders', 'false')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value;

COMMENT ON PROCEDURE clear_all_except_status_and_phones() IS 'Clears all transactional data for simulation reset while preserving status and phones tables';

DO $$
BEGIN
    RAISE NOTICE 'Simulation initialization complete';
    RAISE NOTICE 'Phones: ePhone, ePhone plus, ePhone pro max (prices set to 0.00)';
    RAISE NOTICE 'Parts: Cases, Screens, Electronics (from V9)';
    RAISE NOTICE 'Suppliers: case-supplier, screen-supplier, electronics-supplier (costs set to 0)';
    RAISE NOTICE 'Inventory: All parts reset to 0 quantity';
    RAISE NOTICE 'Stock: All phones reset to 0 available/reserved';
    RAISE NOTICE 'Cleanup procedure: clear_all_except_status_and_phones() ready';
END $$;
