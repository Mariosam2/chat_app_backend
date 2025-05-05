-- DropIndex
DROP INDEX `chat_user_chat_id_fkey` ON `chat_user`;

-- DropIndex
DROP INDEX `messages_chat_id_fkey` ON `messages`;

-- DropIndex
DROP INDEX `messages_receiver_id_fkey` ON `messages`;

-- DropIndex
DROP INDEX `messages_sender_id_fkey` ON `messages`;

-- AlterTable
ALTER TABLE `chat_user` ADD PRIMARY KEY (`user_id`, `chat_id`);

-- DropIndex
DROP INDEX `chat_user_user_id_chat_id_key` ON `chat_user`;

-- AddForeignKey
ALTER TABLE `chat_user` ADD CONSTRAINT `chat_user_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_user` ADD CONSTRAINT `chat_user_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_receiver_id_fkey` FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
