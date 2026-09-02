import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaintenanceModeConfig1787801000000 implements MigrationInterface {
  name = 'AddMaintenanceModeConfig1787801000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`system_config\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`config_key\` VARCHAR(100) NOT NULL,
        \`config_value\` VARCHAR(255) NOT NULL,
        \`updated_by\` BIGINT UNSIGNED NULL,
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_system_config_key\` (\`config_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      INSERT INTO \`system_config\` (\`config_key\`, \`config_value\`)
      VALUES ('MAINTENANCE_MODE', 'false'), ('MAINTENANCE_MESSAGE', 'Application is under maintenance')
      ON DUPLICATE KEY UPDATE \`config_key\` = VALUES(\`config_key\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`system_config\`
      WHERE \`config_key\` IN ('MAINTENANCE_MODE', 'MAINTENANCE_MESSAGE')
    `);
  }
}
