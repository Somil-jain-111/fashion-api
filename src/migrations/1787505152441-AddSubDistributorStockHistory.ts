import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubDistributorStockHistory1787505152441 implements MigrationInterface {
  name = 'AddSubDistributorStockHistory1787505152441';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`sub_distributor_stock_history\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`sub_distributor_id\` BIGINT NOT NULL,
        \`invoice_id\` BIGINT NOT NULL,
        \`item_code\` VARCHAR(150) NOT NULL,
        \`item_name\` VARCHAR(255) NULL,
        \`quantity_added\` INT NOT NULL,
        \`total_quantity_after\` INT NOT NULL,
        \`submission_id\` VARCHAR(100) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`idx_sub_distributor_stock_history_sub_distributor_id\` (\`sub_distributor_id\`),
        INDEX \`idx_sub_distributor_stock_history_invoice_id\` (\`invoice_id\`),
        CONSTRAINT \`fk_sub_distributor_stock_history_user\`
          FOREIGN KEY (\`sub_distributor_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_sub_distributor_stock_history_invoice\`
          FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`sub_distributor_stock_history_details\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`pair_uid\` VARCHAR(100) NOT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`history_id\` BIGINT NOT NULL,
        \`pair_id\` BIGINT NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_sub_distributor_stock_history_details_history_id\` (\`history_id\`),
        UNIQUE INDEX \`uq_sub_distributor_stock_history_detail_pair_id\` (\`pair_id\`),
        CONSTRAINT \`fk_sub_distributor_stock_history_details_history\`
          FOREIGN KEY (\`history_id\`) REFERENCES \`sub_distributor_stock_history\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_sub_distributor_stock_history_details_pair\`
          FOREIGN KEY (\`pair_id\`) REFERENCES \`invoice_pair_details\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`sub_distributor_stock_history_details\``);
    await queryRunner.query(`DROP TABLE \`sub_distributor_stock_history\``);
  }
}
