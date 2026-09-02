import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSellerOnboardingWorkflow1787800900000 implements MigrationInterface {
  name = 'CreateSellerOnboardingWorkflow1787800900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`store_information\`
        ADD COLUMN \`business_type\` ENUM('INDIVIDUAL','SOLE_PROPRIETORSHIP','PARTNERSHIP','LLP','PRIVATE_LIMITED','PUBLIC_LIMITED') NULL,
        ADD COLUMN \`pan_number\` TEXT NULL,
        ADD COLUMN \`gstin_number\` TEXT NULL,
        ADD COLUMN \`street_address\` VARCHAR(255) NULL,
        ADD COLUMN \`city\` VARCHAR(100) NULL,
        ADD COLUMN \`state\` VARCHAR(100) NULL,
        ADD COLUMN \`pincode\` VARCHAR(6) NULL,
        ADD COLUMN \`contact_name\` VARCHAR(150) NULL,
        ADD COLUMN \`contact_email\` VARCHAR(255) NULL,
        ADD COLUMN \`contact_phone\` VARCHAR(15) NULL,
        ADD COLUMN \`agreement_version\` VARCHAR(50) NULL,
        ADD COLUMN \`agreement_accepted_at\` DATETIME NULL,
        ADD COLUMN \`agreement_ip\` VARCHAR(64) NULL,
        ADD COLUMN \`bank_account_holder_name\` TEXT NULL,
        ADD COLUMN \`bank_account_number\` TEXT NULL,
        ADD COLUMN \`bank_ifsc_code\` TEXT NULL,
        ADD COLUMN \`bank_name\` VARCHAR(150) NULL,
        ADD COLUMN \`bank_branch\` VARCHAR(150) NULL,
        ADD COLUMN \`bank_state\` VARCHAR(100) NULL,
        ADD COLUMN \`cancelled_cheque_url\` TEXT NULL,
        ADD COLUMN \`signature_url\` TEXT NULL,
        ADD COLUMN \`esign_document_id\` VARCHAR(100) NULL,
        ADD COLUMN \`signed_at\` DATETIME NULL,
        ADD COLUMN \`onboarding_status\` ENUM('AGREEMENT_PENDING','KYC_PENDING','BANK_DETAILS_PENDING','ESIGN_PENDING','PENDING_APPROVAL','APPROVED','REJECTED') NOT NULL DEFAULT 'AGREEMENT_PENDING',
        ADD INDEX \`IDX_STORE_INFORMATION_ONBOARDING_STATUS\` (\`onboarding_status\`)
    `);

    await queryRunner.query(`
      CREATE INDEX \`IDX_KYC_USER_STATUS_TYPE_DELETED\`
      ON \`kyc_verifications\` (\`user_id\`, \`status\`, \`type\`, \`deleted_at\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_KYC_USER_STATUS_TYPE_DELETED\` ON \`kyc_verifications\``
    );
    await queryRunner.query(`
      ALTER TABLE \`store_information\`
        DROP INDEX \`IDX_STORE_INFORMATION_ONBOARDING_STATUS\`,
        DROP COLUMN \`onboarding_status\`,
        DROP COLUMN \`signed_at\`,
        DROP COLUMN \`esign_document_id\`,
        DROP COLUMN \`signature_url\`,
        DROP COLUMN \`cancelled_cheque_url\`,
        DROP COLUMN \`bank_state\`,
        DROP COLUMN \`bank_branch\`,
        DROP COLUMN \`bank_name\`,
        DROP COLUMN \`bank_ifsc_code\`,
        DROP COLUMN \`bank_account_number\`,
        DROP COLUMN \`bank_account_holder_name\`,
        DROP COLUMN \`agreement_ip\`,
        DROP COLUMN \`agreement_accepted_at\`,
        DROP COLUMN \`agreement_version\`,
        DROP COLUMN \`contact_phone\`,
        DROP COLUMN \`contact_email\`,
        DROP COLUMN \`contact_name\`,
        DROP COLUMN \`pincode\`,
        DROP COLUMN \`state\`,
        DROP COLUMN \`city\`,
        DROP COLUMN \`street_address\`,
        DROP COLUMN \`gstin_number\`,
        DROP COLUMN \`pan_number\`,
        DROP COLUMN \`business_type\`
    `);
  }
}
