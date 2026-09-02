import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCatalogApprovalAndContentAudit1787801300000 implements MigrationInterface {
  name = 'AddCatalogApprovalAndContentAudit1787801300000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`categories\`
      ADD COLUMN \`status\` ENUM('PENDING_APPROVAL','APPROVED','REJECTED') NOT NULL DEFAULT 'APPROVED',
      ADD COLUMN \`created_by\` BIGINT NULL,
      ADD COLUMN \`rejection_reason\` TEXT NULL,
      ADD COLUMN \`reviewed_by\` BIGINT NULL,
      ADD COLUMN \`reviewed_at\` DATETIME NULL,
      ADD INDEX \`IDX_CATEGORY_STATUS\` (\`status\`),
      ADD CONSTRAINT \`FK_CATEGORY_CREATED_BY\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`),
      ADD CONSTRAINT \`FK_CATEGORY_REVIEWED_BY\` FOREIGN KEY (\`reviewed_by\`) REFERENCES \`users\`(\`id\`)`);

    await queryRunner.query(`CREATE TABLE \`content_audits\` (
      \`id\` BIGINT NOT NULL AUTO_INCREMENT, \`active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      \`deleted_at\` DATETIME(6) NULL,
      \`resource_type\` ENUM('CATEGORY','PRODUCT') NOT NULL, \`resource_id\` BIGINT NOT NULL,
      \`actor_id\` BIGINT NOT NULL, \`actor_role\` VARCHAR(50) NOT NULL,
      \`action\` VARCHAR(50) NOT NULL, \`changes\` JSON NULL,
      PRIMARY KEY (\`id\`), INDEX \`IDX_CONTENT_AUDIT_RESOURCE\` (\`resource_type\`,\`resource_id\`,\`created_at\`),
      CONSTRAINT \`FK_CONTENT_AUDIT_ACTOR\` FOREIGN KEY (\`actor_id\`) REFERENCES \`users\`(\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `content_audits`');
    await queryRunner.query(`ALTER TABLE \`categories\`
      DROP FOREIGN KEY \`FK_CATEGORY_REVIEWED_BY\`, DROP FOREIGN KEY \`FK_CATEGORY_CREATED_BY\`,
      DROP INDEX \`IDX_CATEGORY_STATUS\`, DROP COLUMN \`reviewed_at\`, DROP COLUMN \`reviewed_by\`,
      DROP COLUMN \`rejection_reason\`, DROP COLUMN \`created_by\`, DROP COLUMN \`status\``);
  }
}
