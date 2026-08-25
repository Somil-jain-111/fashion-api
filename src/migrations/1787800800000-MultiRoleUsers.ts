import { MigrationInterface, QueryRunner } from 'typeorm';

export class MultiRoleUsers1787800800000 implements MigrationInterface {
  name = 'MultiRoleUsers1787800800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`user_roles\` (
        \`user_id\` BIGINT NOT NULL,
        \`role_id\` BIGINT NOT NULL,
        PRIMARY KEY (\`user_id\`, \`role_id\`),
        CONSTRAINT \`FK_USER_ROLES_USER\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_USER_ROLES_ROLE\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Backfill: every existing single role_id becomes that user's first row here.
    await queryRunner.query(`
      INSERT INTO \`user_roles\` (\`user_id\`, \`role_id\`)
      SELECT \`id\`, \`role_id\` FROM \`users\` WHERE \`role_id\` IS NOT NULL
    `);

    // users.role_id's FK constraint name is auto-generated per-environment — look it
    // up rather than hardcoding it, so this migration is portable.
    const [fk] = await queryRunner.query(`
      SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role_id'
        AND REFERENCED_TABLE_NAME = 'roles'
      LIMIT 1
    `);

    if (fk?.CONSTRAINT_NAME) {
      await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
    }

    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`role_id\``);

    await queryRunner.query(`
      CREATE TABLE \`store_information\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`seller_id\` BIGINT NOT NULL,
        \`store_name\` VARCHAR(150) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_STORE_INFORMATION_SELLER\` (\`seller_id\`),
        CONSTRAINT \`FK_STORE_INFORMATION_SELLER\` FOREIGN KEY (\`seller_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`store_information\``);

    await queryRunner.query(`
      ALTER TABLE \`users\` ADD COLUMN \`role_id\` BIGINT NULL AFTER \`points\`
    `);

    // Restore a single role_id per user from whichever role they were granted first —
    // lossy if they hold more than one role by the time this ever runs down, but that's
    // an inherent, unavoidable consequence of reverting a multi-role model to single-role.
    await queryRunner.query(`
      UPDATE \`users\` u
      SET u.role_id = (
        SELECT ur.role_id FROM \`user_roles\` ur WHERE ur.user_id = u.id ORDER BY ur.role_id LIMIT 1
      )
    `);

    await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD CONSTRAINT \`FK_USERS_ROLE\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`)
    `);

    await queryRunner.query(`DROP TABLE \`user_roles\``);
  }
}
