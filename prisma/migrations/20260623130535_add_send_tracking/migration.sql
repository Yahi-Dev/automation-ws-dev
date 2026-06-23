-- AlterTable
ALTER TABLE `message` ADD COLUMN `deliveredAt` DATETIME(3) NULL,
    ADD COLUMN `errorCode` VARCHAR(32) NULL,
    ADD COLUMN `errorMessage` TEXT NULL,
    ADD COLUMN `providerSid` VARCHAR(64) NULL,
    ADD COLUMN `readAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `message_providerSid_idx` ON `message`(`providerSid`);

-- CreateIndex
CREATE INDEX `message_status_idx` ON `message`(`status`);

-- RenameIndex
ALTER TABLE `message` RENAME INDEX `message_postId_fkey` TO `message_postId_idx`;
