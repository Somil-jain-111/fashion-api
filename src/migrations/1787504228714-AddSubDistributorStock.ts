import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubDistributorStock1787504228714 implements MigrationInterface {
  name = 'AddSubDistributorStock1787504228714';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`invoices\`
      ADD COLUMN \`user_type\` ENUM('retailer', 'sub_distributor') NULL AFTER \`status\`
    `);

    // Every invoice claimed before this migration went through the retailer flow — no other
    // flow existed until now — so this backfill is accurate, not a guess.
    await queryRunner.query(`
      UPDATE \`invoices\`
      SET \`user_type\` = 'retailer'
      WHERE \`user_id\` IS NOT NULL AND \`user_type\` IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`invoice_pair_details\`
      MODIFY COLUMN \`status\`
      ENUM('UNSCANNED', 'SCANNED', 'INVALID', 'EXPIRED', 'REDEEMED', 'USED', 'STOCKED')
      NOT NULL DEFAULT 'UNSCANNED'
    `);

    await queryRunner.query(`
      CREATE TABLE \`sub_distributor_stock\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`sub_distributor_id\` BIGINT NOT NULL,
        \`item_code\` VARCHAR(150) NOT NULL,
        \`item_name\` VARCHAR(255) NULL,
        \`quantity\` INT NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_sub_distributor_stock_item\` (\`sub_distributor_id\`, \`item_code\`),
        CONSTRAINT \`fk_sub_distributor_stock_user\`
          FOREIGN KEY (\`sub_distributor_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`sub_distributor_stock\``);

    await queryRunner.query(`
      ALTER TABLE \`invoice_pair_details\`
      MODIFY COLUMN \`status\`
      ENUM('UNSCANNED', 'SCANNED', 'INVALID', 'EXPIRED', 'REDEEMED', 'USED')
      NOT NULL DEFAULT 'UNSCANNED'
    `);

    await queryRunner.query(`ALTER TABLE \`invoices\` DROP COLUMN \`user_type\``);
  }
}
