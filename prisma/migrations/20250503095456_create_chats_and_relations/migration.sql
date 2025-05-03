-- CreateTable
CREATE TABLE `Chat` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_user` (
    `user_id` BIGINT NOT NULL,
    `chat_id` BIGINT NOT NULL,

    UNIQUE INDEX `chat_user_user_id_key`(`user_id`),
    UNIQUE INDEX `chat_user_chat_id_key`(`chat_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `chat_user` ADD CONSTRAINT `chat_user_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_user` ADD CONSTRAINT `chat_user_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `Chat`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
