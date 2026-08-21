import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DB-backed dropdown options for the support "Issue Type" field — seeded to match the
 * SupportIssueType TS enum exactly (support_tickets.issue_type stays that fixed enum column;
 * this table only drives what the client shows as selectable options).
 */
export class CreateSupportIssueTypes1787305486568 implements MigrationInterface {
  name = 'CreateSupportIssueTypes1787305486568';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`support_issue_types\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`code\` varchar(50) NOT NULL,
        \`label\` varchar(100) NOT NULL,
        \`display_order\` int NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX \`uq_support_issue_type_code\` ON \`support_issue_types\` (\`code\`)`
    );

    await queryRunner.query(`
      INSERT INTO \`support_issue_types\` (\`code\`, \`label\`, \`display_order\`) VALUES
        ('QR_ISSUE', 'QR Issue', 1),
        ('REWARD_ISSUE', 'Reward Issue', 2),
        ('PAYMENT_ISSUE', 'Payment Issue', 3),
        ('KYC_ISSUE', 'KYC Issue', 4),
        ('ORDER_ISSUE', 'Order Issue', 5),
        ('OTHER', 'Other', 6)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`support_issue_types\``);
  }
}
