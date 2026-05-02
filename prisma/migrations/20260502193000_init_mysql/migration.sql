-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('manager', 'supervisor', 'admin') NOT NULL DEFAULT 'manager',
    `department` VARCHAR(191) NULL,
    `supervisor_id` INTEGER NULL,
    `signature_image_path` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `auth_sessions_token_key`(`token`),
    INDEX `auth_sessions_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `budget_categories_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_periods` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `status` ENUM('planning', 'active', 'closed') NOT NULL DEFAULT 'planning',
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `budget_periods_status_idx`(`status`),
    UNIQUE INDEX `budget_periods_year_month_key`(`year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_allocations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `period_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,
    `department` VARCHAR(191) NULL,
    `allocated_amount` DECIMAL(15, 2) NOT NULL,
    `notes` TEXT NULL,
    `status` ENUM('active', 'locked', 'closed') NOT NULL DEFAULT 'active',
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `budget_allocations_status_idx`(`status`),
    UNIQUE INDEX `budget_allocations_period_id_category_id_department_key`(`period_id`, `category_id`, `department`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_reallocations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('transfer', 'topup', 'reversal') NOT NULL,
    `source_allocation_id` INTEGER NOT NULL,
    `target_allocation_id` INTEGER NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `reason` TEXT NOT NULL,
    `related_proposal_id` INTEGER NULL,
    `related_lpj_id` INTEGER NULL,
    `reversal_of_id` INTEGER NULL,
    `status` ENUM('draft', 'submitted', 'supervisor_reviewed', 'admin_approved', 'rejected') NOT NULL DEFAULT 'draft',
    `snapshot_before` LONGTEXT NULL,
    `snapshot_after` LONGTEXT NULL,
    `effective_date` DATETIME(3) NOT NULL,
    `requested_by` INTEGER NOT NULL,
    `reviewed_at` DATETIME(3) NULL,
    `approved_at` DATETIME(3) NULL,
    `rejection_note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `budget_reallocations_status_idx`(`status`),
    INDEX `budget_reallocations_source_allocation_id_idx`(`source_allocation_id`),
    INDEX `budget_reallocations_target_allocation_id_idx`(`target_allocation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proposals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `number` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `objective` TEXT NULL,
    `goal` TEXT NULL,
    `allocation_id` INTEGER NOT NULL,
    `total_budget` DECIMAL(15, 2) NOT NULL,
    `event_start_date` DATETIME(3) NOT NULL,
    `event_end_date` DATETIME(3) NOT NULL,
    `status` ENUM('draft', 'final', 'cancelled') NOT NULL DEFAULT 'draft',
    `created_by` INTEGER NOT NULL,
    `finalized_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `cancel_reason` TEXT NULL,
    `pdf_path` VARCHAR(191) NULL,
    `form_data` LONGTEXT NULL,
    `kantor` VARCHAR(191) NULL,
    `gm_cluster_name` VARCHAR(191) NULL,
    `program_type` TEXT NULL,
    `description` TEXT NULL,
    `usage_note` TEXT NULL,
    `product_info` TEXT NULL,
    `applicant_name` VARCHAR(191) NULL,
    `applicant_phone` VARCHAR(191) NULL,
    `applicant_address` TEXT NULL,
    `signature_city` VARCHAR(191) NULL,
    `approver_name` VARCHAR(191) NULL,
    `approver_title` VARCHAR(191) NULL,
    `witness_name` VARCHAR(191) NULL,
    `witness_title` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `proposals_number_key`(`number`),
    INDEX `proposals_allocation_id_status_idx`(`allocation_id`, `status`),
    INDEX `proposals_created_by_status_idx`(`created_by`, `status`),
    INDEX `proposals_finalized_at_idx`(`finalized_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proposal_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `proposal_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `qty` INTEGER NOT NULL,
    `unit_price` DECIMAL(15, 2) NOT NULL,
    `total` DECIMAL(15, 2) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    INDEX `proposal_items_proposal_id_idx`(`proposal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proposal_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `proposal_id` INTEGER NOT NULL,
    `file_path` VARCHAR(191) NOT NULL,
    `file_type` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `uploaded_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `proposal_attachments_proposal_id_idx`(`proposal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_name` VARCHAR(191) NOT NULL,
    `brand_line_1` VARCHAR(191) NOT NULL,
    `brand_line_2` VARCHAR(191) NOT NULL,
    `brand_line_3` VARCHAR(191) NULL,
    `logo_text` VARCHAR(191) NULL,
    `default_institution` VARCHAR(191) NULL,
    `default_address` TEXT NULL,
    `default_phone` VARCHAR(191) NULL,
    `vp_name` VARCHAR(191) NULL,
    `vp_title` VARCHAR(191) NULL,
    `fin_dir_name` VARCHAR(191) NULL,
    `fin_dir_title` VARCHAR(191) NULL,
    `default_kantor` VARCHAR(191) NULL,
    `default_gm_cluster` VARCHAR(191) NULL,
    `default_signature_city` VARCHAR(191) NULL,
    `approver_signature_path` VARCHAR(191) NULL,
    `witness_signature_path` VARCHAR(191) NULL,
    `vp_signature_path` VARCHAR(191) NULL,
    `fin_dir_signature_path` VARCHAR(191) NULL,
    `logo_image_path` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `numbering_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `format_string` VARCHAR(191) NOT NULL,
    `reset_period` ENUM('never', 'year', 'month') NOT NULL DEFAULT 'year',
    `current_sequence` INTEGER NOT NULL DEFAULT 0,
    `last_reset_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `numbering_configs_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lpjs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `proposal_id` INTEGER NOT NULL,
    `narrative` TEXT NULL,
    `evaluation` TEXT NULL,
    `total_realized` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `variance` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `status` ENUM('draft', 'submitted', 'supervisor_reviewed', 'admin_approved', 'rejected') NOT NULL DEFAULT 'draft',
    `created_by` INTEGER NOT NULL,
    `submitted_at` DATETIME(3) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `approved_at` DATETIME(3) NULL,
    `rejection_note` TEXT NULL,
    `form_data` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lpjs_proposal_id_key`(`proposal_id`),
    INDEX `lpjs_status_idx`(`status`),
    INDEX `lpjs_approved_at_idx`(`approved_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lpj_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lpj_id` INTEGER NOT NULL,
    `proposal_item_id` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `qty` INTEGER NOT NULL,
    `unit_price` DECIMAL(15, 2) NOT NULL,
    `total` DECIMAL(15, 2) NOT NULL,
    `variance` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `receipt_attachment_id` INTEGER NULL,

    INDEX `lpj_items_lpj_id_idx`(`lpj_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lpj_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lpj_id` INTEGER NOT NULL,
    `type` ENUM('receipt', 'documentation', 'plan', 'signature', 'report') NOT NULL,
    `file_path` VARCHAR(191) NOT NULL,
    `file_type` VARCHAR(191) NOT NULL,
    `item_ref` VARCHAR(191) NULL,
    `label` VARCHAR(191) NULL,
    `uploaded_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lpj_attachments_lpj_id_idx`(`lpj_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entity_type` VARCHAR(191) NOT NULL,
    `entity_id` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `actor_id` INTEGER NULL,
    `before` LONGTEXT NULL,
    `after` LONGTEXT NULL,
    `note` TEXT NULL,
    `at_timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `audit_logs_at_timestamp_idx`(`at_timestamp` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NULL,
    `link` VARCHAR(191) NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_read_at_idx`(`user_id`, `read_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_supervisor_id_fkey` FOREIGN KEY (`supervisor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_periods` ADD CONSTRAINT `budget_periods_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_allocations` ADD CONSTRAINT `budget_allocations_period_id_fkey` FOREIGN KEY (`period_id`) REFERENCES `budget_periods`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_allocations` ADD CONSTRAINT `budget_allocations_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `budget_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_allocations` ADD CONSTRAINT `budget_allocations_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_reallocations` ADD CONSTRAINT `budget_reallocations_source_allocation_id_fkey` FOREIGN KEY (`source_allocation_id`) REFERENCES `budget_allocations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_reallocations` ADD CONSTRAINT `budget_reallocations_target_allocation_id_fkey` FOREIGN KEY (`target_allocation_id`) REFERENCES `budget_allocations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_reallocations` ADD CONSTRAINT `budget_reallocations_related_proposal_id_fkey` FOREIGN KEY (`related_proposal_id`) REFERENCES `proposals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_reallocations` ADD CONSTRAINT `budget_reallocations_related_lpj_id_fkey` FOREIGN KEY (`related_lpj_id`) REFERENCES `lpjs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_reallocations` ADD CONSTRAINT `budget_reallocations_reversal_of_id_fkey` FOREIGN KEY (`reversal_of_id`) REFERENCES `budget_reallocations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_reallocations` ADD CONSTRAINT `budget_reallocations_requested_by_fkey` FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_allocation_id_fkey` FOREIGN KEY (`allocation_id`) REFERENCES `budget_allocations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proposal_items` ADD CONSTRAINT `proposal_items_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proposal_attachments` ADD CONSTRAINT `proposal_attachments_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proposal_attachments` ADD CONSTRAINT `proposal_attachments_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lpjs` ADD CONSTRAINT `lpjs_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lpjs` ADD CONSTRAINT `lpjs_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lpj_items` ADD CONSTRAINT `lpj_items_lpj_id_fkey` FOREIGN KEY (`lpj_id`) REFERENCES `lpjs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lpj_items` ADD CONSTRAINT `lpj_items_proposal_item_id_fkey` FOREIGN KEY (`proposal_item_id`) REFERENCES `proposal_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lpj_items` ADD CONSTRAINT `lpj_items_receipt_attachment_id_fkey` FOREIGN KEY (`receipt_attachment_id`) REFERENCES `lpj_attachments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lpj_attachments` ADD CONSTRAINT `lpj_attachments_lpj_id_fkey` FOREIGN KEY (`lpj_id`) REFERENCES `lpjs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lpj_attachments` ADD CONSTRAINT `lpj_attachments_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

