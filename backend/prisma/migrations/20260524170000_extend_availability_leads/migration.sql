ALTER TABLE `ProductAvailabilityLead`
  ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'waiting',
  ADD COLUMN `preferredContact` VARCHAR(191) NULL,
  ADD COLUMN `source` VARCHAR(191) NULL,
  ADD COLUMN `notes` TEXT NULL,
  ADD COLUMN `variantId` INTEGER NULL,
  ADD COLUMN `variantKey` VARCHAR(191) NOT NULL DEFAULT 'product',
  ADD COLUMN `customerId` INTEGER NULL,
  ADD COLUMN `notifiedAt` DATETIME(3) NULL,
  ADD COLUMN `convertedAt` DATETIME(3) NULL,
  ADD COLUMN `archivedAt` DATETIME(3) NULL,
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

UPDATE `ProductAvailabilityLead`
SET `variantKey` = CAST(`variantId` AS CHAR)
WHERE `variantId` IS NOT NULL;

DELETE duplicateLead FROM `ProductAvailabilityLead` duplicateLead
INNER JOIN `ProductAvailabilityLead` keeperLead
  ON keeperLead.`productId` = duplicateLead.`productId`
  AND keeperLead.`email` = duplicateLead.`email`
  AND keeperLead.`variantKey` = duplicateLead.`variantKey`
  AND keeperLead.`id` < duplicateLead.`id`;

ALTER TABLE `ProductAvailabilityLead`
  ADD INDEX `ProductAvailabilityLead_productId_status_idx`(`productId`, `status`),
  ADD INDEX `ProductAvailabilityLead_variantId_idx`(`variantId`),
  ADD INDEX `ProductAvailabilityLead_customerId_idx`(`customerId`),
  ADD INDEX `ProductAvailabilityLead_status_createdAt_idx`(`status`, `createdAt`),
  ADD UNIQUE INDEX `ProductAvailabilityLead_productId_email_variantKey_key`(`productId`, `email`, `variantKey`);

ALTER TABLE `ProductAvailabilityLead`
  ADD CONSTRAINT `ProductAvailabilityLead_variantId_fkey`
  FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ProductAvailabilityLead`
  ADD CONSTRAINT `ProductAvailabilityLead_customerId_fkey`
  FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
