-- AlterTable
ALTER TABLE `posts` ADD COLUMN `contentTemplateId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `twilio_content_templates` (
    `id` VARCHAR(191) NOT NULL,
    `sid` VARCHAR(64) NOT NULL,
    `accountSid` VARCHAR(34) NOT NULL,
    `friendlyName` VARCHAR(191) NOT NULL,
    `language` VARCHAR(16) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `dateCreated` DATETIME(3) NOT NULL,
    `dateUpdated` DATETIME(3) NOT NULL,
    `links` JSON NOT NULL,
    `types` JSON NOT NULL,
    `variables` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `twilio_content_templates_sid_key`(`sid`),
    INDEX `twilio_content_templates_accountSid_idx`(`accountSid`),
    INDEX `twilio_content_templates_friendlyName_idx`(`friendlyName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `posts_contentTemplateId_idx` ON `posts`(`contentTemplateId`);

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_contentTemplateId_fkey` FOREIGN KEY (`contentTemplateId`) REFERENCES `twilio_content_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
