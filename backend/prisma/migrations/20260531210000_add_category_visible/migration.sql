-- Add visible column to Category table
ALTER TABLE Category ADD COLUMN visible BOOLEAN NOT NULL DEFAULT true;
