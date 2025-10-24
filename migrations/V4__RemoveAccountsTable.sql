ALTER TABLE suppliers
DROP COLUMN account_id;

ALTER TABLE bulk_deliveries
DROP COLUMN account_id;

ALTER TABLE consumer_deliveries
DROP COLUMN account_id;

ALTER TABLE parts_purchases
ADD COLUMN account_number VARCHAR(100) NOT NULL;

DROP TABLE accounts;