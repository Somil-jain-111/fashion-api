import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKycVerificationTables1787800200000 implements MigrationInterface {
  name = 'CreateKycVerificationTables1787800200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`kyc_verifications\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`user_id\` BIGINT NOT NULL,
        \`type\` ENUM('AADHAAR', 'PAN', 'GST', 'NAME_MATCH', 'BANK', 'UPI', 'BENE_PAN', 'BENE_AADHAAR') NOT NULL,
        \`status\` ENUM('PENDING', 'VERIFIED', 'FAILED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
        \`reference_id\` VARCHAR(255) NULL,
        \`document_number\` VARCHAR(500) NULL,
        \`masked_document_number\` VARCHAR(255) NULL,
        \`verified_name\` VARCHAR(500) NULL,
        \`provider\` VARCHAR(100) NULL,
        \`provider_request\` JSON NULL,
        \`provider_response\` JSON NULL,
        \`metadata\` JSON NULL,
        \`failure_reason\` VARCHAR(500) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_KYC_VERIFICATIONS_REFERENCE_ID\` (\`reference_id\`),
        INDEX \`IDX_KYC_VERIFICATIONS_USER\` (\`user_id\`),
        INDEX \`IDX_KYC_VERIFICATIONS_TYPE_STATUS\` (\`type\`, \`status\`),
        CONSTRAINT \`FK_KYC_VERIFICATIONS_USER\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`kyc_verification_logs\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`user_id\` BIGINT NULL,
        \`type\` ENUM('AADHAAR', 'PAN', 'GST', 'NAME_MATCH', 'BANK', 'UPI', 'BENE_PAN', 'BENE_AADHAAR') NOT NULL,
        \`status\` ENUM('OTP_SENT', 'VERIFIED', 'FAILED', 'EXPIRED', 'PROVIDER_ERROR', 'SUBMITTED') NOT NULL,
        \`reference_id\` VARCHAR(255) NULL,
        \`document_number\` VARCHAR(500) NULL,
        \`provider\` VARCHAR(100) NULL,
        \`request_payload\` JSON NULL,
        \`response_payload\` JSON NULL,
        \`failure_reason\` VARCHAR(500) NULL,
        \`journey_id\` VARCHAR(255) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_KYC_LOGS_USER_TYPE\` (\`user_id\`, \`type\`),
        INDEX \`IDX_KYC_LOGS_REFERENCE_ID\` (\`reference_id\`),
        INDEX \`IDX_KYC_LOGS_STATUS\` (\`status\`),
        CONSTRAINT \`FK_KYC_LOGS_USER\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`api_responses\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`type\` VARCHAR(100) NOT NULL,
        \`transaction_id\` VARCHAR(500) NULL,
        \`request_url\` TEXT NULL,
        \`request_payload\` JSON NULL,
        \`response_payload\` JSON NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_API_RESPONSES_TYPE\` (\`type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`api_responses\``);
    await queryRunner.query(`DROP TABLE \`kyc_verification_logs\``);
    await queryRunner.query(`DROP TABLE \`kyc_verifications\``);
  }
}
