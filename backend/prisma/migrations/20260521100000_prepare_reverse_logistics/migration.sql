CREATE TABLE `ReverseLogisticsRequest` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `orderId` INTEGER NOT NULL,
  `provider` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
  `reason` VARCHAR(191) NULL,
  `customerNotes` TEXT NULL,
  `internalNotes` TEXT NULL,
  `externalId` VARCHAR(191) NULL,
  `protocol` VARCHAR(191) NULL,
  `serviceId` INTEGER NULL,
  `trackingCode` VARCHAR(191) NULL,
  `labelUrl` TEXT NULL,
  `authorizationCode` VARCHAR(191) NULL,
  `pickupAddress` JSON NULL,
  `returnAddress` JSON NULL,
  `items` JSON NULL,
  `requestPayload` JSON NULL,
  `responsePayload` JSON NULL,
  `errorMessage` TEXT NULL,
  `requestedAt` DATETIME(3) NULL,
  `authorizedAt` DATETIME(3) NULL,
  `labelGeneratedAt` DATETIME(3) NULL,
  `postedAt` DATETIME(3) NULL,
  `receivedAt` DATETIME(3) NULL,
  `canceledAt` DATETIME(3) NULL,
  `lastSyncedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `ReverseLogisticsRequest_orderId_createdAt_idx`(`orderId`, `createdAt`),
  INDEX `ReverseLogisticsRequest_provider_externalId_idx`(`provider`, `externalId`),
  INDEX `ReverseLogisticsRequest_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `ReverseLogisticsRequest_trackingCode_idx`(`trackingCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ReverseLogisticsRequest`
  ADD CONSTRAINT `ReverseLogisticsRequest_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
