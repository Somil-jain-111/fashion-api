import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductPricingFields1787800700000 implements MigrationInterface {
  name = 'AddProductPricingFields1787800700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`products\`
      ADD COLUMN \`mrp\` DECIMAL(10,2) NULL AFTER \`wholesale_price\`,
      ADD COLUMN \`discount_percentage\` DECIMAL(5,2) NULL AFTER \`mrp\`,
      ADD COLUMN \`current_price\` DECIMAL(10,2) NULL AFTER \`discount_percentage\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`products\`
      DROP COLUMN \`mrp\`,
      DROP COLUMN \`discount_percentage\`,
      DROP COLUMN \`current_price\`
    `);
  }
}
