/*
  Warnings:

  - You are about to alter the column `username` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `email` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `chat_user_chat_id_fkey` ON `chat_user`;

-- DropIndex
DROP INDEX `messages_chat_id_fkey` ON `messages`;

-- DropIndex
DROP INDEX `messages_receiver_id_fkey` ON `messages`;

-- DropIndex
DROP INDEX `messages_sender_id_fkey` ON `messages`;

-- AlterTable
ALTER TABLE `users` MODIFY `username` VARCHAR(191) NOT NULL,
    MODIFY `email` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_username_key` ON `users`(`username`);

-- CreateIndex
CREATE UNIQUE INDEX `users_email_key` ON `users`(`email`);

-- AddForeignKey
ALTER TABLE `chat_user` ADD CONSTRAINT `chat_user_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_user` ADD CONSTRAINT `chat_user_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_receiver_id_fkey` FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
