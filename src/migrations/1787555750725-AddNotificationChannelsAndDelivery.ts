import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationChannelsAndDelivery1787555750725 implements MigrationInterface {
  name = 'AddNotificationChannelsAndDelivery1787555750725';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- notification_preferences: add channel, widen the unique index ---
    await queryRunner.query(`
      ALTER TABLE \`notification_preferences\`
      ADD COLUMN \`channel\` ENUM('IN_APP', 'PUSH') NOT NULL DEFAULT 'IN_APP' AFTER \`event_type\`
    `);
    // Add the new index BEFORE dropping the old one — the old index backs the user_id FK
    // constraint, and MySQL refuses to drop it unless another index already covers user_id
    // as a leading column. The new index does (user_id, event_type, channel), so this order
    // lets MySQL pivot the FK onto it automatically.
    await queryRunner.query(`
      ALTER TABLE \`notification_preferences\`
      ADD UNIQUE INDEX \`uq_notification_preferences_user_event_channel\` (\`user_id\`, \`event_type\`, \`channel\`)
    `);
    await queryRunner.query(`
      ALTER TABLE \`notification_preferences\`
      DROP INDEX \`uq_notification_preferences_user_event\`
    `);

    // --- notification_deliveries ---
    await queryRunner.query(`
      CREATE TABLE \`notification_deliveries\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`notification_id\` BIGINT NOT NULL,
        \`channel\` ENUM('IN_APP', 'PUSH') NOT NULL,
        \`status\` ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
        \`attempts\` INT NOT NULL DEFAULT 0,
        \`last_error\` VARCHAR(500) NULL,
        \`sent_at\` DATETIME NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`idx_notification_deliveries_notification_id\` (\`notification_id\`),
        CONSTRAINT \`fk_notification_deliveries_notification\`
          FOREIGN KEY (\`notification_id\`) REFERENCES \`notifications\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // --- user_devices ---
    await queryRunner.query(`
      CREATE TABLE \`user_devices\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`user_id\` BIGINT NOT NULL,
        \`device_token\` VARCHAR(500) NOT NULL,
        \`platform\` ENUM('ANDROID', 'IOS', 'WEB') NOT NULL,
        \`last_seen_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_user_devices_token\` (\`device_token\`(255)),
        INDEX \`idx_user_devices_user_id\` (\`user_id\`),
        CONSTRAINT \`fk_user_devices_user\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`user_devices\``);
    await queryRunner.query(`DROP TABLE \`notification_deliveries\``);
    await queryRunner.query(`
      ALTER TABLE \`notification_preferences\`
      ADD UNIQUE INDEX \`uq_notification_preferences_user_event\` (\`user_id\`, \`event_type\`)
    `);
    await queryRunner.query(`
      ALTER TABLE \`notification_preferences\`
      DROP INDEX \`uq_notification_preferences_user_event_channel\`
    `);
    await queryRunner.query(`ALTER TABLE \`notification_preferences\` DROP COLUMN \`channel\``);
  }
}
