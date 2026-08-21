import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * New table for the distributor-return flow: one row per returned pair, guarded by a
 * unique `pair_id` index (FK to invoice_pair_details.id) so the same physical pair can never
 * be returned twice. `invoice_id`/`pair_id` are bigint unsigned to match `invoices.id` /
 * `invoice_pair_details.id`; `retailer_id`/`distributor_id` are plain (signed) bigint to
 * match `users.id`.
 */
export class CreateInvoicePairReturns1787230110848 implements MigrationInterface {
  name = 'CreateInvoicePairReturns1787230110848';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`invoice_pair_returns\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`invoice_id\` bigint unsigned NOT NULL,
        \`pair_id\` bigint unsigned NOT NULL,
        \`pair_uid\` varchar(100) NOT NULL,
        \`retailer_id\` bigint NOT NULL,
        \`distributor_id\` bigint NOT NULL,
        \`points_refunded\` int NOT NULL DEFAULT 0,
        \`remarks\` varchar(255) NULL,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX \`uq_invoice_pair_return_pair_id\` ON \`invoice_pair_returns\` (\`pair_id\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_invoice_pair_returns_invoice_id\` ON \`invoice_pair_returns\` (\`invoice_id\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_invoice_pair_returns_retailer_id\` ON \`invoice_pair_returns\` (\`retailer_id\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_invoice_pair_returns_distributor_id\` ON \`invoice_pair_returns\` (\`distributor_id\`)`
    );

    await queryRunner.query(`
      ALTER TABLE \`invoice_pair_returns\`
      ADD CONSTRAINT \`FK_invoice_pair_returns_invoice_id\`
      FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\`(\`id\`) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE \`invoice_pair_returns\`
      ADD CONSTRAINT \`FK_invoice_pair_returns_pair_id\`
      FOREIGN KEY (\`pair_id\`) REFERENCES \`invoice_pair_details\`(\`id\`) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE \`invoice_pair_returns\`
      ADD CONSTRAINT \`FK_invoice_pair_returns_retailer_id\`
      FOREIGN KEY (\`retailer_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE \`invoice_pair_returns\`
      ADD CONSTRAINT \`FK_invoice_pair_returns_distributor_id\`
      FOREIGN KEY (\`distributor_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`invoice_pair_returns\` DROP FOREIGN KEY \`FK_invoice_pair_returns_distributor_id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invoice_pair_returns\` DROP FOREIGN KEY \`FK_invoice_pair_returns_retailer_id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invoice_pair_returns\` DROP FOREIGN KEY \`FK_invoice_pair_returns_pair_id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invoice_pair_returns\` DROP FOREIGN KEY \`FK_invoice_pair_returns_invoice_id\``
    );
    await queryRunner.query(`DROP TABLE \`invoice_pair_returns\``);
  }
}
