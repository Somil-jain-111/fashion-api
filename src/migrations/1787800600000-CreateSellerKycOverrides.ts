import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSellerKycOverrides1787800600000 implements MigrationInterface {
  name = 'CreateSellerKycOverrides1787800600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`seller_kyc_overrides\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`seller_id\` BIGINT NOT NULL,
        \`status\` ENUM('APPROVED', 'REJECTED') NOT NULL,
        \`reason\` TEXT NULL,
        \`reviewed_by\` BIGINT NOT NULL,
        \`reviewed_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_SELLER_KYC_OVERRIDE_SELLER\` (\`seller_id\`),
        CONSTRAINT \`FK_SELLER_KYC_OVERRIDE_SELLER\` FOREIGN KEY (\`seller_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_SELLER_KYC_OVERRIDE_REVIEWER\` FOREIGN KEY (\`reviewed_by\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`seller_kyc_overrides\``);
  }
}
