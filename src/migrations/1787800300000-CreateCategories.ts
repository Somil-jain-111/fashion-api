import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategories1787800300000 implements MigrationInterface {
  name = 'CreateCategories1787800300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`categories\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`name\` VARCHAR(150) NOT NULL,
        \`slug\` VARCHAR(170) NOT NULL,
        \`parent_id\` BIGINT NULL,
        \`image_url\` VARCHAR(500) NULL,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_CATEGORY_SLUG\` (\`slug\`),
        INDEX \`IDX_CATEGORIES_PARENT_ID\` (\`parent_id\`),
        CONSTRAINT \`FK_CATEGORIES_PARENT\` FOREIGN KEY (\`parent_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`categories\``);
  }
}
