-- AlterTable
ALTER TABLE `twilio_content_templates` ADD COLUMN `approvalStatus` VARCHAR(16) NULL,
    ADD COLUMN `category` VARCHAR(16) NULL,
    ADD COLUMN `rejectionReason` TEXT NULL;
