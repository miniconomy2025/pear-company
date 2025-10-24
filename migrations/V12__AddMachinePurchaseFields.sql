ALTER TABLE machine_purchases
ADD COLUMN status INT NOT NULL REFERENCES status(status_id);

ALTER TABLE machine_purchases
ADD COLUMN ratio VARCHAR(100) NOT NULL;

ALTER TABLE machine_purchases
ADD COLUMN account_number VARCHAR(100) NOT NULL;

ALTER TABLE machine_purchases
ADD COLUMN reference_number INT NOT NULL;

INSERT INTO status (description) VALUES 
    ('Completed')
ON CONFLICT (description) DO NOTHING;