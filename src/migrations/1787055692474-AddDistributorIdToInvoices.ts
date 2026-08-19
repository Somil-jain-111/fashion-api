import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds distributor_id to invoices — the distributor that issued the invoice, as opposed
 * to user_id (the retailer it was ingested for). Nullable: existing invoices predate this
 * concept and have no known distributor to backfill. Used by the retailer-invoice validate
 * flow to confirm an invoice actually belongs to a distributor the retailer is mapped to.
 */
export class AddDistributorIdToInvoices1787055692474 implements MigrationInterface {
  name = 'AddDistributorIdToInvoices1787055692474';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`invoices\` ADD \`distributor_id\` bigint NULL`);

    await queryRunner.query(
      `CREATE INDEX \`idx_invoice_distributor_id\` ON \`invoices\` (\`distributor_id\`)`
    );

    await queryRunner.query(
      `ALTER TABLE \`invoices\`
       ADD CONSTRAINT \`FK_invoices_distributor_id\`
       FOREIGN KEY (\`distributor_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`invoices\` DROP FOREIGN KEY \`FK_invoices_distributor_id\``);
    await queryRunner.query(`DROP INDEX \`idx_invoice_distributor_id\` ON \`invoices\``);
    await queryRunner.query(`ALTER TABLE \`invoices\` DROP COLUMN \`distributor_id\``);
  }
}
