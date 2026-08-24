import { MigrationInterface, QueryRunner } from 'typeorm';

const EVENT_TYPES = [
  'INVOICE_CREATED',
  'INVOICE_SUBMITTED',
  'POINTS_ALLOCATED',
  'ORDER_PLACED',
  'REWARD_REDEEMED',
  'PRODUCT_RETURNED',
] as const;

export class CreateNotifications1787554381037 implements MigrationInterface {
  name = 'CreateNotifications1787554381037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const eventTypeEnum = `ENUM(${EVENT_TYPES.map((type) => `'${type}'`).join(', ')})`;

    await queryRunner.query(`
      CREATE TABLE \`notification_templates\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`event_type\` ${eventTypeEnum} NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`body\` VARCHAR(1000) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_notification_templates_event_type\` (\`event_type\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`notification_preferences\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`user_id\` BIGINT NOT NULL,
        \`event_type\` ${eventTypeEnum} NOT NULL,
        \`enabled\` TINYINT NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_notification_preferences_user_event\` (\`user_id\`, \`event_type\`),
        CONSTRAINT \`fk_notification_preferences_user\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`notifications\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`user_id\` BIGINT NOT NULL,
        \`event_type\` ${eventTypeEnum} NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`body\` VARCHAR(1000) NOT NULL,
        \`reference_type\` VARCHAR(50) NULL,
        \`reference_id\` VARCHAR(100) NULL,
        \`is_read\` TINYINT NOT NULL DEFAULT 0,
        \`read_at\` DATETIME NULL,
        \`metadata\` JSON NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_notifications_user_id\` (\`user_id\`),
        INDEX \`idx_notifications_event_type\` (\`event_type\`),
        CONSTRAINT \`fk_notifications_user\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      INSERT INTO \`notification_templates\` (\`event_type\`, \`title\`, \`body\`) VALUES
      ('INVOICE_CREATED', 'New Invoice Available', 'Invoice {{invoiceNumber}} has been added to your account with {{totalPairs}} pairs.'),
      ('INVOICE_SUBMITTED', 'Invoice Submitted', 'Your invoice {{invoiceNumber}} has been submitted successfully with {{scannedPairs}} pairs scanned.'),
      ('POINTS_ALLOCATED', 'Points Credited', 'You earned {{points}} points from invoice {{invoiceNumber}}.'),
      ('ORDER_PLACED', 'Order Placed', 'Your order {{orderNumber}} has been placed successfully.'),
      ('REWARD_REDEEMED', 'Redemption Successful', 'Your redemption for order {{orderNumber}} is complete. {{points}} points redeemed.'),
      ('PRODUCT_RETURNED', 'Return Processed', 'Your return {{returnNo}} for invoice {{invoiceNumber}} has been processed. {{points}} points reversed.')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`notifications\``);
    await queryRunner.query(`DROP TABLE \`notification_preferences\``);
    await queryRunner.query(`DROP TABLE \`notification_templates\``);
  }
}
