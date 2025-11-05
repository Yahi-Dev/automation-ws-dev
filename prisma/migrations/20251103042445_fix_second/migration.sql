-- AlterTable
ALTER TABLE `contacts` ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `message` ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `posts` ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false;
