import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces the flat invoice_pair_returns table with a parent/child pair — a distributor can
 * now process pairs from multiple invoices (and multiple retailers) in one request.
 * distributor_returns holds one row per invoice per return batch; distributor_return_details
 * holds one row per physical pair within that batch. The old table has no production data
 * (dev-only, 0 rows), so it's dropped outright rather than migrated.
 */
export class CreateDistributorReturns1787470252934 implements MigrationInterface {
  name = 'CreateDistributorReturns1787470252934';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`invoice_pair_returns\``);

    await queryRunner.query(`
      CREATE TABLE \`distributor_returns\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`return_no\` varchar(50) NOT NULL,
        \`total_pairs\` int NOT NULL DEFAULT '0',
        \`total_points_refunded\` int NOT NULL DEFAULT '0',
        \`remarks\` varchar(255) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`invoice_id\` bigint NOT NULL,
        \`retailer_id\` bigint NOT NULL,
        \`distributor_id\` bigint NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_distributor_returns_invoice_id\` FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_distributor_returns_retailer_id\` FOREIGN KEY (\`retailer_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_distributor_returns_distributor_id\` FOREIGN KEY (\`distributor_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`uq_distributor_return_no\` ON \`distributor_returns\` (\`return_no\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_distributor_returns_invoice_id\` ON \`distributor_returns\` (\`invoice_id\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_distributor_returns_retailer_id\` ON \`distributor_returns\` (\`retailer_id\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_distributor_returns_distributor_id\` ON \`distributor_returns\` (\`distributor_id\`)`
    );

    await queryRunner.query(`
      CREATE TABLE \`distributor_return_details\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`pair_uid\` varchar(100) NOT NULL,
        \`points_refunded\` int NOT NULL DEFAULT '0',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`return_id\` bigint NOT NULL,
        \`pair_id\` bigint NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_distributor_return_details_return_id\` FOREIGN KEY (\`return_id\`) REFERENCES \`distributor_returns\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_distributor_return_details_pair_id\` FOREIGN KEY (\`pair_id\`) REFERENCES \`invoice_pair_details\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`uq_distributor_return_detail_pair_id\` ON \`distributor_return_details\` (\`pair_id\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_distributor_return_details_return_id\` ON \`distributor_return_details\` (\`return_id\`)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`distributor_return_details\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`distributor_returns\``);

    await queryRunner.query(`
      CREATE TABLE \`invoice_pair_returns\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`active\` tinyint NOT NULL DEFAULT '1',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`pair_uid\` varchar(100) NOT NULL,
        \`points_refunded\` int NOT NULL DEFAULT '0',
        \`remarks\` varchar(255) NULL,
        \`invoice_id\` bigint NULL,
        \`pair_id\` bigint NULL,
        \`retailer_id\` bigint NULL,
        \`distributor_id\` bigint NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_invoice_pair_return_pair_id\` (\`pair_id\`),
        CONSTRAINT \`fk_invoice_pair_returns_invoice_id\` FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_invoice_pair_returns_pair_id\` FOREIGN KEY (\`pair_id\`) REFERENCES \`invoice_pair_details\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_invoice_pair_returns_distributor_id\` FOREIGN KEY (\`distributor_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_invoice_pair_returns_retailer_id\` FOREIGN KEY (\`retailer_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }
}
