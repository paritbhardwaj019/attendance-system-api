-- DropForeignKey
ALTER TABLE `visitor` DROP FOREIGN KEY `Visitor_visitorSignupId_fkey`;

-- AlterTable
ALTER TABLE `visitor` MODIFY `visitorSignupId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Visitor` ADD CONSTRAINT `Visitor_visitorSignupId_fkey` FOREIGN KEY (`visitorSignupId`) REFERENCES `VisitorSignup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
