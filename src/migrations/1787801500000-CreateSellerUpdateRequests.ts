import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSellerUpdateRequests1787801500000 implements MigrationInterface {
  name = 'CreateSellerUpdateRequests1787801500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`seller_update_requests\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`seller_id\` BIGINT NOT NULL,
        \`section\` ENUM('PROFILE','PAN','AADHAAR','GST','BANK_DETAILS','ESIGN') NOT NULL,
        \`reason\` VARCHAR(500) NOT NULL,
        \`status\` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_SELLER_UPDATE_REQUEST_STATUS\` (\`seller_id\`, \`status\`),
        CONSTRAINT \`FK_SELLER_UPDATE_REQUEST_SELLER\` FOREIGN KEY (\`seller_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `seller_update_requests`');
  }
}
