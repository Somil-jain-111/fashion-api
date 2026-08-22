import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Generic append-only change log for admin-managed resources (CMS pages, FAQs, announcements,
 * banners, app versions, and any future module) — records who created/updated/deleted a row,
 * and for updates, which fields changed (`changes` holds a { field: { from, to } } diff).
 */
export class CreateAuditLogs1787382569844 implements MigrationInterface {
  name = 'CreateAuditLogs1787382569844';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`audit_logs\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`module\` varchar(50) NOT NULL,
        \`entity_id\` varchar(50) NOT NULL,
        \`action\` enum('CREATE','UPDATE','DELETE') NOT NULL,
        \`changes\` json NULL,
        \`performed_by\` bigint NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_audit_logs_performed_by\` FOREIGN KEY (\`performed_by\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(
      `CREATE INDEX \`idx_audit_logs_module_entity\` ON \`audit_logs\` (\`module\`, \`entity_id\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_audit_logs_performed_by\` ON \`audit_logs\` (\`performed_by\`)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`audit_logs\``);
  }
}
