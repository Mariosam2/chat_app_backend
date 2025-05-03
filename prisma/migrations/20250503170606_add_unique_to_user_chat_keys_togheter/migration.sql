/*
  Warnings:

  - A unique constraint covering the columns `[user_id,chat_id]` on the table `chat_user` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `chat_user_chat_id_key` ON `chat_user`;

-- DropIndex
DROP INDEX `chat_user_user_id_key` ON `chat_user`;

-- DropIndex
DROP INDEX `messages_chat_id_fkey` ON `messages`;

-- DropIndex
DROP INDEX `messages_receiver_id_fkey` ON `messages`;

-- DropIndex
DROP INDEX `messages_sender_id_fkey` ON `messages`;

-- CreateIndex
CREATE UNIQUE INDEX `chat_user_user_id_chat_id_key` ON `chat_user`(`user_id`, `chat_id`);

-- AddForeignKey
ALTER TABLE `chat_user` ADD CONSTRAINT `chat_user_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_user` ADD CONSTRAINT `chat_user_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_receiver_id_fkey` FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
