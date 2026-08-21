import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retailer support ticket system: one row per ticket (support_tickets, extends BaseEntity —
 * hence the active/created_at/updated_at/deleted_at columns matching that convention) plus a
 * child table of image attachment URLs (support_ticket_attachments). `user_id`/`updated_by`
 * are plain (signed) bigint to match `users.id`.
 */
export class CreateSupportTickets1787303997952 implements MigrationInterface {
  name = 'CreateSupportTickets1787303997952';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`support_tickets\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`ticket_no\` varchar(50) NOT NULL,
        \`user_id\` bigint NOT NULL,
        \`issue_type\` enum('QR_ISSUE', 'REWARD_ISSUE', 'PAYMENT_ISSUE', 'KYC_ISSUE', 'ORDER_ISSUE', 'OTHER') NOT NULL,
        \`description\` text NOT NULL,
        \`status\` enum('OPEN', 'IN_PROGRESS', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
        \`resolution_remarks\` text NULL,
        \`updated_by\` bigint NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX \`uq_support_ticket_no\` ON \`support_tickets\` (\`ticket_no\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_support_tickets_user_id\` ON \`support_tickets\` (\`user_id\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_support_tickets_status\` ON \`support_tickets\` (\`status\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_support_tickets_issue_type\` ON \`support_tickets\` (\`issue_type\`)`
    );

    await queryRunner.query(`
      ALTER TABLE \`support_tickets\`
      ADD CONSTRAINT \`FK_support_tickets_user_id\`
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE \`support_tickets\`
      ADD CONSTRAINT \`FK_support_tickets_updated_by\`
      FOREIGN KEY (\`updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TABLE \`support_ticket_attachments\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`ticket_id\` bigint NOT NULL,
        \`url\` varchar(500) NOT NULL,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(
      `CREATE INDEX \`idx_support_ticket_attachments_ticket_id\` ON \`support_ticket_attachments\` (\`ticket_id\`)`
    );

    await queryRunner.query(`
      ALTER TABLE \`support_ticket_attachments\`
      ADD CONSTRAINT \`FK_support_ticket_attachments_ticket_id\`
      FOREIGN KEY (\`ticket_id\`) REFERENCES \`support_tickets\`(\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`support_ticket_attachments\` DROP FOREIGN KEY \`FK_support_ticket_attachments_ticket_id\``
    );
    await queryRunner.query(`DROP TABLE \`support_ticket_attachments\``);

    await queryRunner.query(
      `ALTER TABLE \`support_tickets\` DROP FOREIGN KEY \`FK_support_tickets_updated_by\``
    );
    await queryRunner.query(
      `ALTER TABLE \`support_tickets\` DROP FOREIGN KEY \`FK_support_tickets_user_id\``
    );
    await queryRunner.query(`DROP TABLE \`support_tickets\``);
  }
}
