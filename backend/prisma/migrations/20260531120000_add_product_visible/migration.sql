-- Add visible column to Product table
ALTER TABLE `Product` ADD COLUMN `visible` BOOLEAN NOT NULL DEFAULT true;
