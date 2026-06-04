ALTER TABLE `Order`
  ADD COLUMN `expiredAt` DATETIME(3) NULL,
  ADD COLUMN `checkoutAttemptId` VARCHAR(64) NULL;

ALTER TABLE `Order`
  ADD UNIQUE INDEX `Order_customerId_checkoutAttemptId_key` (`customerId`, `checkoutAttemptId`),
  ADD INDEX `Order_customerId_status_idx` (`customerId`, `status`),
  ADD INDEX `Order_paymentExpiresAt_idx` (`paymentExpiresAt`);

ALTER TABLE `Order`
  MODIFY `status` ENUM(
    'PENDING',
    'PAID',
    'PAID_STOCK_ISSUE',
    'PREPARING',
    'PACKED',
    'LABEL_GENERATED',
    'POSTED',
    'SHIPPED',
    'DELIVERED',
    'CANCELED'
  ) NOT NULL DEFAULT 'PENDING';

CREATE TABLE `OrderEvent` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `orderId` INTEGER NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `message` VARCHAR(191) NOT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `OrderEvent_orderId_createdAt_idx` (`orderId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `OrderEvent`
  ADD CONSTRAINT `OrderEvent_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
