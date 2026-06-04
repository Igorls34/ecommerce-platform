CREATE TABLE `ProductVariant` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `productId` INTEGER NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `stock` INTEGER NOT NULL DEFAULT 0,
  `sku` VARCHAR(191) NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `position` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `ProductVariant_productId_idx`(`productId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ProductVariant`
  ADD CONSTRAINT `ProductVariant_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `OrderItem`
  ADD COLUMN `variantId` INTEGER NULL,
  ADD INDEX `OrderItem_variantId_idx`(`variantId`);

ALTER TABLE `OrderItem`
  ADD CONSTRAINT `OrderItem_variantId_fkey`
  FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
