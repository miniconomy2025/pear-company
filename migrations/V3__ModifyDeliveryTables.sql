ALTER TABLE bulk_deliveries
DROP COLUMN status,
ADD COLUMN units_received INT NOT NULL DEFAULT 0;

ALTER TABLE consumer_deliveries
DROP COLUMN status,
ADD COLUMN units_collected INT NOT NULL DEFAULT 0;
