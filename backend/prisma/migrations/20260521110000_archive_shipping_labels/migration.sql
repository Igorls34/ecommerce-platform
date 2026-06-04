ALTER TABLE `Order`
  ADD COLUMN `melhorEnvioLabelFilePath` TEXT NULL,
  ADD COLUMN `melhorEnvioLabelDownloadedAt` DATETIME(3) NULL;
