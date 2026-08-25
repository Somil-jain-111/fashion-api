import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCatalogSupport1787800500000 implements MigrationInterface {
  name = 'AddCatalogSupport1787800500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD COLUMN \`rating_average\` DECIMAL(3,2) NOT NULL DEFAULT 0 AFTER \`image_url\`,
      ADD COLUMN \`rating_count\` INT NOT NULL DEFAULT 0 AFTER \`rating_average\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`products\`
      ADD INDEX \`IDX_PRODUCTS_STATUS_CATEGORY\` (\`status\`, \`category_id\`),
      ADD INDEX \`IDX_PRODUCTS_BASE_PRICE\` (\`base_price\`),
      ADD FULLTEXT INDEX \`FTX_PRODUCTS_NAME_DESCRIPTION\` (\`name\`, \`description\`)
    `);

    await queryRunner.query(`
      ALTER TABLE \`product_variants\`
      ADD INDEX \`IDX_PRODUCT_VARIANTS_SIZE_STOCK\` (\`size\`, \`stock_quantity\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`product_variants\` DROP INDEX \`IDX_PRODUCT_VARIANTS_SIZE_STOCK\``);
    await queryRunner.query(`
      ALTER TABLE \`products\`
      DROP INDEX \`IDX_PRODUCTS_STATUS_CATEGORY\`,
      DROP INDEX \`IDX_PRODUCTS_BASE_PRICE\`,
      DROP INDEX \`FTX_PRODUCTS_NAME_DESCRIPTION\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`users\`
      DROP COLUMN \`rating_average\`,
      DROP COLUMN \`rating_count\`
    `);
  }
}
