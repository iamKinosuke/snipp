CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    -- COLLATE utf8mb4_bin: case-sensitive.
    `short_code` VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    `target_url` VARCHAR(2048) NOT NULL,
    `target_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `user_id` INTEGER NULL,
    `expires_at` DATETIME(3) NULL,
    `click_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `links_short_code_key`(`short_code`),
    INDEX `links_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `links_user_id_target_hash_idx`(`user_id`, `target_hash`),
    INDEX `links_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `clicks` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `link_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `device` VARCHAR(32) NULL,
    `browser` VARCHAR(32) NULL,
    `referrer` VARCHAR(255) NULL,

    INDEX `clicks_link_id_created_at_idx`(`link_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `click_daily` (
    `link_id` INTEGER NOT NULL,
    `dimension` VARCHAR(16) NOT NULL,
    `date` DATE NOT NULL,
    `value` VARCHAR(255) NOT NULL,
    `clicks` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`link_id`, `dimension`, `date`, `value`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `links` ADD CONSTRAINT `links_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `clicks` ADD CONSTRAINT `clicks_link_id_fkey` FOREIGN KEY (`link_id`) REFERENCES `links`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `click_daily` ADD CONSTRAINT `click_daily_link_id_fkey` FOREIGN KEY (`link_id`) REFERENCES `links`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
