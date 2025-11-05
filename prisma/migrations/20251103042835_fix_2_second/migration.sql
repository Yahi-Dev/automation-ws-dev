/*
  Warnings:

  - Added the required column `createdBy` to the `contacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `posts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `contacts` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL,
    ADD COLUMN `updatedBy` VARCHAR(191) NULL,
    MODIFY `updatedAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `message` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL,
    ADD COLUMN `updatedBy` VARCHAR(191) NULL,
    MODIFY `updatedAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `posts` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL,
    ADD COLUMN `updatedBy` VARCHAR(191) NULL,
    MODIFY `updatedAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3);
