-- AlterTable
ALTER TABLE `Customer` ADD COLUMN `dateOfBirth` DATETIME(3) NULL,
    ADD COLUMN `notifyWhatsApp` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `preferredContact` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Order` ADD COLUMN `orderNotes` TEXT NULL;
