CREATE TABLE `PasswordResetToken` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `tokenHash` VARCHAR(64) NOT NULL,
  `customerId` INTEGER NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `PasswordResetToken_tokenHash_key`(`tokenHash`),
  INDEX `PasswordResetToken_customerId_idx`(`customerId`),
  INDEX `PasswordResetToken_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PasswordResetToken`
  ADD CONSTRAINT `PasswordResetToken_customerId_fkey`
  FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
