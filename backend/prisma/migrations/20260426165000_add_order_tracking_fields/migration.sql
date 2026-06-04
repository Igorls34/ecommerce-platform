ALTER TABLE `Order`
  ADD COLUMN `trackingToken` VARCHAR(191) NULL,
  ADD COLUMN `trackingCode` VARCHAR(191) NULL,
  ADD COLUMN `shippingNotes` TEXT NULL,
  ADD COLUMN `shippedAt` DATETIME(3) NULL,
  ADD COLUMN `deliveredAt` DATETIME(3) NULL;

CREATE UNIQUE INDEX `Order_trackingToken_key` ON `Order`(`trackingToken`);
