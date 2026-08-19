import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a real FK (item_id) from invoice_assortments to invoice_items, so an assortment
 * (carton) can be traced back to its parent line item without matching on parent_item_code
 * strings. Column is added nullable, backfilled by matching (invoice_id, parent_item_code)
 * to (invoice_id, item_code), then tightened to NOT NULL once every existing row is backfilled.
 */
export class AddItemIdToInvoiceAssortments1787049364421 implements MigrationInterface {
  name = 'AddItemIdToInvoiceAssortments1787049364421';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`invoice_assortments\` ADD \`item_id\` bigint unsigned NULL`
    );

    await queryRunner.query(
      `UPDATE \`invoice_assortments\` a
       INNER JOIN \`invoice_items\` i
         ON i.invoice_id = a.invoice_id AND i.item_code = a.parent_item_code
       SET a.item_id = i.id`
    );

    const [{ unmatched }] = await queryRunner.query(
      `SELECT COUNT(*) as unmatched FROM \`invoice_assortments\` WHERE \`item_id\` IS NULL`
    );
    if (Number(unmatched) > 0) {
      throw new Error(
        `AddItemIdToInvoiceAssortments: ${unmatched} invoice_assortments row(s) could not be ` +
          `matched to an invoice_items row by (invoice_id, parent_item_code = item_code). ` +
          `Fix the data before this column can be made NOT NULL.`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`invoice_assortments\` MODIFY \`item_id\` bigint unsigned NOT NULL`
    );

    await queryRunner.query(
      `CREATE INDEX \`idx_invoice_assortments_item_id\` ON \`invoice_assortments\` (\`item_id\`)`
    );

    await queryRunner.query(
      `ALTER TABLE \`invoice_assortments\`
       ADD CONSTRAINT \`FK_invoice_assortments_item_id\`
       FOREIGN KEY (\`item_id\`) REFERENCES \`invoice_items\`(\`id\`) ON DELETE CASCADE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`invoice_assortments\` DROP FOREIGN KEY \`FK_invoice_assortments_item_id\``
    );
    await queryRunner.query(
      `DROP INDEX \`idx_invoice_assortments_item_id\` ON \`invoice_assortments\``
    );
    await queryRunner.query(`ALTER TABLE \`invoice_assortments\` DROP COLUMN \`item_id\``);
  }
}
