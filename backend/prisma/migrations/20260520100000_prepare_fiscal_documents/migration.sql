CREATE TABLE `FiscalDocument` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `orderId` INTEGER NOT NULL,
  `provider` VARCHAR(191) NULL,
  `documentType` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
  `externalId` VARCHAR(191) NULL,
  `number` VARCHAR(191) NULL,
  `series` VARCHAR(191) NULL,
  `accessKey` VARCHAR(80) NULL,
  `protocol` VARCHAR(191) NULL,
  `xmlUrl` TEXT NULL,
  `danfeUrl` TEXT NULL,
  `pdfUrl` TEXT NULL,
  `requestPayload` JSON NULL,
  `responsePayload` JSON NULL,
  `errorMessage` TEXT NULL,
  `issuedAt` DATETIME(3) NULL,
  `canceledAt` DATETIME(3) NULL,
  `lastSyncedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `FiscalDocument_orderId_createdAt_idx`(`orderId`, `createdAt`),
  INDEX `FiscalDocument_provider_externalId_idx`(`provider`, `externalId`),
  INDEX `FiscalDocument_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `FiscalDocument_accessKey_idx`(`accessKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `FiscalDocument`
  ADD CONSTRAINT `FiscalDocument_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
