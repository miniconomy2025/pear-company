
ALTER TABLE machine_purchases
MODIFY COLUMN ratio VARCHAR(100) NOT NULL;

ALTER TABLE consumer_deliveries 
MODIFY COLUMN delivery_reference TYPE VARCHAR(100);