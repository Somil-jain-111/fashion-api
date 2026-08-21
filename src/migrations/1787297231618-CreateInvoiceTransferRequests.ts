import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * New table for the distributor-to-distributor invoice transfer flow: one row per transfer
 * request, carrying a relation back to the invoice being transferred plus a snapshot of its
 * totals at request time (total_pairs/sku_count/billing_estimate). `invoice_id` is bigint
 * unsigned to match `invoices.id`; `from_distributor_id`/`to_distributor_id` are plain
 * (signed) bigint to match `users.id`. `to_distributor_id` is nullable — a request is created
 * against just the invoice, open for any other distributor to allocate themselves to.
 */
export class CreateInvoiceTransferRequests1787297231618 implements MigrationInterface {
  name = 'CreateInvoiceTransferRequests1787297231618';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`invoice_transfer_requests\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`request_no\` varchar(50) NOT NULL,
        \`invoice_id\` bigint unsigned NOT NULL,
        \`invoice_no\` varchar(100) NOT NULL,
        \`from_distributor_id\` bigint NOT NULL,
        \`to_distributor_id\` bigint NULL,
        \`total_pairs\` int NOT NULL DEFAULT 0,
        \`sku_count\` int NOT NULL DEFAULT 0,
        \`billing_estimate\` decimal(15,2) NOT NULL DEFAULT 0,
        \`status\` enum('PENDING_APPROVAL', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING_APPROVAL',
        \`remarks\` varchar(255) NULL,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX \`uq_invoice_transfer_request_no\` ON \`invoice_transfer_requests\` (\`request_no\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_invoice_transfer_requests_invoice_id\` ON \`invoice_transfer_requests\` (\`invoice_id\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_invoice_transfer_requests_from_distributor_id\` ON \`invoice_transfer_requests\` (\`from_distributor_id\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_invoice_transfer_requests_to_distributor_id\` ON \`invoice_transfer_requests\` (\`to_distributor_id\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_invoice_transfer_requests_status\` ON \`invoice_transfer_requests\` (\`status\`)`
    );

    await queryRunner.query(`
      ALTER TABLE \`invoice_transfer_requests\`
      ADD CONSTRAINT \`FK_invoice_transfer_requests_invoice_id\`
      FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\`(\`id\`) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE \`invoice_transfer_requests\`
      ADD CONSTRAINT \`FK_invoice_transfer_requests_from_distributor_id\`
      FOREIGN KEY (\`from_distributor_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE \`invoice_transfer_requests\`
      ADD CONSTRAINT \`FK_invoice_transfer_requests_to_distributor_id\`
      FOREIGN KEY (\`to_distributor_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`invoice_transfer_requests\` DROP FOREIGN KEY \`FK_invoice_transfer_requests_to_distributor_id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invoice_transfer_requests\` DROP FOREIGN KEY \`FK_invoice_transfer_requests_from_distributor_id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invoice_transfer_requests\` DROP FOREIGN KEY \`FK_invoice_transfer_requests_invoice_id\``
    );
    await queryRunner.query(`DROP TABLE \`invoice_transfer_requests\``);
  }
}
