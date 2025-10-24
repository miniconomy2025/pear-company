ALTER TABLE consumer_deliveries 
DROP CONSTRAINT IF EXISTS consumer_deliveries_delivery_reference_key;

ALTER TABLE consumer_deliveries 
ALTER COLUMN delivery_reference TYPE VARCHAR(100);

ALTER TABLE consumer_deliveries 
ADD CONSTRAINT uq_consumer_deliveries_delivery_reference UNIQUE (delivery_reference);