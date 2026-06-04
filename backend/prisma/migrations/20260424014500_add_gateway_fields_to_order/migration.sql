ALTER TABLE `Order`
  ADD COLUMN `gatewayProvider` VARCHAR(191) NULL,
  ADD COLUMN `paymentMethod` VARCHAR(191) NULL,
  ADD COLUMN `gatewayOrderId` VARCHAR(191) NULL,
  ADD COLUMN `gatewayChargeId` VARCHAR(191) NULL,
  ADD COLUMN `paymentReference` TEXT NULL,
  ADD COLUMN `paymentStatusDetail` VARCHAR(191) NULL,
  ADD COLUMN `paymentExpiresAt` DATETIME(3) NULL,
  ADD COLUMN `paidAt` DATETIME(3) NULL;
