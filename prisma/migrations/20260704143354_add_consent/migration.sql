-- AlterTable
ALTER TABLE `contacts` ADD COLUMN `consentAt` DATETIME(3) NULL,
    ADD COLUMN `consentSource` VARCHAR(32) NULL,
    ADD COLUMN `consentState` VARCHAR(16) NOT NULL DEFAULT 'unknown',
    ADD COLUMN `optOutAt` DATETIME(3) NULL,
    ADD COLUMN `optOutKeyword` VARCHAR(32) NULL;

-- CreateTable
CREATE TABLE `consent_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contactId` INTEGER NOT NULL,
    `event` VARCHAR(16) NOT NULL,
    `source` VARCHAR(32) NULL,
    `keyword` VARCHAR(64) NULL,
    `raw` TEXT NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `consent_events_contactId_idx`(`contactId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `contacts_consentState_idx` ON `contacts`(`consentState`);

-- AddForeignKey
ALTER TABLE `consent_events` ADD CONSTRAINT `consent_events_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
