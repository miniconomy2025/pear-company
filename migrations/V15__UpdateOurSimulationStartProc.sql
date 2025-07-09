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
    DELETE from system_settings;
    
    UPDATE inventory SET quantity_available = 0;
    UPDATE stock SET quantity_available = 0, quantity_reserved = 0, updated_at = NOW();
    UPDATE suppliers SET cost = 0;
    
    UPDATE phones SET price = 0.00;
    
    RAISE NOTICE 'All transactional data cleared. Inventory, stock, and prices reset to 0.';
END;
$$;