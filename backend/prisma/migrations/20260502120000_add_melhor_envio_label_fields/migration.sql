ALTER TABLE `Order`
  ADD COLUMN `shippingAddress` JSON NULL,
  ADD COLUMN `melhorEnvioOrderId` VARCHAR(191) NULL,
  ADD COLUMN `melhorEnvioProtocol` VARCHAR(191) NULL,
  ADD COLUMN `melhorEnvioStatus` VARCHAR(191) NULL,
  ADD COLUMN `melhorEnvioLabelUrl` TEXT NULL,
  ADD COLUMN `melhorEnvioServiceId` INTEGER NULL;
