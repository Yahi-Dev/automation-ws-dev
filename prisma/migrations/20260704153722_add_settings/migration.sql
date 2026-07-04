-- CreateTable
CREATE TABLE `app_settings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `twilioAccountSid` VARCHAR(191) NULL,
    `twilioAuthTokenEnc` TEXT NULL,
    `twilioApiKeySid` VARCHAR(191) NULL,
    `twilioApiKeySecretEnc` TEXT NULL,
    `whatsappFrom` VARCHAR(191) NULL,
    `messagingServiceSid` VARCHAR(191) NULL,
    `contentBaseUrl` VARCHAR(191) NULL,
    `templateLanguage` VARCHAR(16) NULL,
    `batchSize` INTEGER NULL,
    `delayMs` INTEGER NULL,
    `webhookBaseUrl` VARCHAR(191) NULL,
    `webhookSecretEnc` TEXT NULL,
    `requireOptIn` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
