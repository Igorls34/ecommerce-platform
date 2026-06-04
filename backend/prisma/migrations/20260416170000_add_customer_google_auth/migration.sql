ALTER TABLE `Customer`
  ADD COLUMN `googleId` VARCHAR(191) NULL,
  ADD COLUMN `avatarUrl` VARCHAR(191) NULL,
  ADD COLUMN `leadSource` VARCHAR(191) NULL,
  ADD COLUMN `lastLoginAt` DATETIME(3) NULL;

CREATE UNIQUE INDEX `Customer_googleId_key` ON `Customer`(`googleId`);
