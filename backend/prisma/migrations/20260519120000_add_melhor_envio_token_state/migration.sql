CREATE TABLE `MelhorEnvioTokenState` (
  `id` INTEGER NOT NULL DEFAULT 1,
  `accessTokenEncrypted` TEXT NOT NULL,
  `refreshTokenEncrypted` TEXT NOT NULL,
  `accessTokenExpiresAt` DATETIME(3) NOT NULL,
  `refreshTokenExpiresAt` DATETIME(3) NULL,
  `lastRefreshAttemptAt` DATETIME(3) NULL,
  `lastRefreshSuccessAt` DATETIME(3) NULL,
  `lastRefreshError` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MelhorEnvioTokenEvent` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `status` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `MelhorEnvioTokenEvent_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
