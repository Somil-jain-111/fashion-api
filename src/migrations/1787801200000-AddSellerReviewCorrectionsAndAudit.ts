import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSellerReviewCorrectionsAndAudit1787801200000 implements MigrationInterface {
  name = 'AddSellerReviewCorrectionsAndAudit1787801200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`seller_review_issues\` (
      \`id\` BIGINT NOT NULL AUTO_INCREMENT, \`active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      \`deleted_at\` DATETIME(6) NULL, \`seller_id\` BIGINT NOT NULL,
      \`section\` ENUM('PROFILE','PAN','AADHAAR','GST','BANK_DETAILS','ESIGN') NOT NULL,
      \`remark\` TEXT NOT NULL, \`status\` ENUM('OPEN','RESOLVED') NOT NULL DEFAULT 'OPEN',
      \`review_cycle\` INT NOT NULL, \`reviewed_by\` BIGINT NOT NULL, \`resolved_at\` DATETIME NULL,
      PRIMARY KEY (\`id\`), INDEX \`IDX_SELLER_REVIEW_ISSUE_STATUS\` (\`seller_id\`,\`status\`),
      CONSTRAINT \`FK_SELLER_REVIEW_ISSUE_SELLER\` FOREIGN KEY (\`seller_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_SELLER_REVIEW_ISSUE_REVIEWER\` FOREIGN KEY (\`reviewed_by\`) REFERENCES \`users\`(\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`CREATE TABLE \`seller_onboarding_audits\` (
      \`id\` BIGINT NOT NULL AUTO_INCREMENT, \`active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      \`deleted_at\` DATETIME(6) NULL, \`seller_id\` BIGINT NOT NULL, \`actor_id\` BIGINT NOT NULL,
      \`actor_role\` VARCHAR(50) NOT NULL, \`action\` VARCHAR(100) NOT NULL,
      \`section\` ENUM('PROFILE','PAN','AADHAAR','GST','BANK_DETAILS','ESIGN') NULL,
      \`from_status\` ENUM('AGREEMENT_PENDING','KYC_PENDING','BANK_DETAILS_PENDING','ESIGN_PENDING','PENDING_APPROVAL','APPROVED','REJECTED') NULL,
      \`to_status\` ENUM('AGREEMENT_PENDING','KYC_PENDING','BANK_DETAILS_PENDING','ESIGN_PENDING','PENDING_APPROVAL','APPROVED','REJECTED') NULL,
      \`metadata\` JSON NULL, PRIMARY KEY (\`id\`),
      INDEX \`IDX_SELLER_ONBOARDING_AUDIT\` (\`seller_id\`,\`created_at\`),
      CONSTRAINT \`FK_SELLER_AUDIT_SELLER\` FOREIGN KEY (\`seller_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_SELLER_AUDIT_ACTOR\` FOREIGN KEY (\`actor_id\`) REFERENCES \`users\`(\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `seller_onboarding_audits`');
    await queryRunner.query('DROP TABLE `seller_review_issues`');
  }
}
