-- V17: Add simulation date tracking and update timestamp columns

INSERT INTO system_settings (key, value) VALUES 
    ('current_simulation_date', '2050-01-01'),
    ('current_simulation_day_offset', '0')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

ALTER TABLE machines 
ALTER COLUMN date_retired DROP NOT NULL;

-- Add a comment to clarify the business logic
COMMENT ON COLUMN machines.date_retired IS 'Date when machine was retired from service. NULL indicates machine is still active.';


CREATE OR REPLACE FUNCTION get_current_simulation_date()
RETURNS TIMESTAMP AS $$
DECLARE
    sim_date TEXT;
BEGIN
    SELECT value INTO sim_date 
    FROM system_settings 
    WHERE key = 'current_simulation_date';
    
    IF sim_date IS NULL THEN
        RETURN '2050-01-01 00:00:00'::TIMESTAMP;
    END IF;
    
    RETURN (sim_date || ' 00:00:00')::TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_current_simulation_day_offset()
RETURNS INTEGER AS $$
DECLARE
    day_offset TEXT;
BEGIN
    SELECT value INTO day_offset 
    FROM system_settings 
    WHERE key = 'current_simulation_day_offset';
    
    IF day_offset IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN day_offset::INTEGER;
END;
$$ LANGUAGE plpgsql;

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
    UPDATE stock SET quantity_available = 0, quantity_reserved = 0, updated_at = '2050-01-01 00:00:00';
    UPDATE suppliers SET cost = 0;

    UPDATE phones p SET price = 10000.00 WHERE p.model = 'ePhone';
    UPDATE phones p SET price = 7500.00 WHERE p.model = 'ePhone plus';
    UPDATE phones p SET price = 5000.00 WHERE p.model = 'ePhone pro max';
    
    UPDATE system_settings SET value = '2050-01-01' WHERE key = 'current_simulation_date';
    UPDATE system_settings SET value = '0' WHERE key = 'current_simulation_day_offset';
    
    RAISE NOTICE 'All transactional data cleared. Simulation date reset to 2050-01-01 (Day 0).';
END;
$$;

COMMENT ON FUNCTION get_current_simulation_date() IS 'Returns the current simulation date from system_settings';
COMMENT ON FUNCTION get_current_simulation_day_offset() IS 'Returns the current simulation day offset from system_settings';

DO $$
BEGIN
    RAISE NOTICE 'Simulation date tracking added';
    RAISE NOTICE 'Current simulation date: 2050-01-01 (Day 0)';
    RAISE NOTICE 'Database functions: get_current_simulation_date(), get_current_simulation_day_offset()';
    RAISE NOTICE 'Cleanup procedure updated to reset simulation dates';
END $$;
