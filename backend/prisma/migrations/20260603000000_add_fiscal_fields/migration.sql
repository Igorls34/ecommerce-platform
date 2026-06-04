-- AlterTable Product
ALTER TABLE `Product`
    ADD COLUMN `sku` VARCHAR(191) NULL,
    ADD COLUMN `weight` DECIMAL(8, 3) NULL,
    ADD COLUMN `unit` VARCHAR(191) NULL DEFAULT 'UN',
    ADD COLUMN `ncm` VARCHAR(10) NULL,
    ADD COLUMN `cfop` VARCHAR(6) NULL;

-- AlterTable Order
ALTER TABLE `Order`
    ADD COLUMN `fiscalStatus` VARCHAR(191) NULL DEFAULT 'pending';

-- AlterTable OrderItem
ALTER TABLE `OrderItem`
    ADD COLUMN `ncm` VARCHAR(10) NULL,
    ADD COLUMN `cfop` VARCHAR(6) NULL,
    ADD COLUMN `unit` VARCHAR(191) NULL;

-- AlterTable StoreSettings
ALTER TABLE `StoreSettings`
    ADD COLUMN `companyName` VARCHAR(191) NULL,
    ADD COLUMN `companyCnpj` VARCHAR(191) NULL,
    ADD COLUMN `stateRegistration` VARCHAR(191) NULL,
    ADD COLUMN `taxRegime` VARCHAR(191) NULL;
