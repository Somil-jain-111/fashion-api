import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductFormMetadata1787801400000 implements MigrationInterface {
  name = 'AddProductFormMetadata1787801400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`product_options\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`group\` ENUM('BRAND','PRODUCT_TYPE','GENDER','COUNTRY','MATERIAL','FIT','NECK_TYPE','SLEEVE','OCCASION','COLOR','SIZE') NOT NULL,
        \`code\` VARCHAR(80) NOT NULL,
        \`label\` VARCHAR(120) NOT NULL,
        \`category_id\` BIGINT NULL,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_PRODUCT_OPTION_GROUP_CODE\` (\`group\`, \`code\`),
        INDEX \`IDX_PRODUCT_OPTIONS_FILTER\` (\`group\`, \`is_active\`, \`sort_order\`),
        INDEX \`IDX_PRODUCT_OPTIONS_CATEGORY\` (\`category_id\`),
        CONSTRAINT \`FK_PRODUCT_OPTIONS_CATEGORY\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      ALTER TABLE \`categories\`
      ADD COLUMN \`commission_rate\` DECIMAL(5,2) NOT NULL DEFAULT 8.00
    `);

    await queryRunner.query(`
      ALTER TABLE \`products\`
      ADD COLUMN \`seller_sku\` VARCHAR(100) NULL AFTER \`name\`,
      ADD COLUMN \`brand_option_id\` BIGINT UNSIGNED NULL AFTER \`seller_sku\`,
      ADD COLUMN \`product_type_option_id\` BIGINT UNSIGNED NULL AFTER \`brand_option_id\`,
      ADD COLUMN \`gender_option_id\` BIGINT UNSIGNED NULL AFTER \`product_type_option_id\`,
      ADD COLUMN \`country_option_id\` BIGINT UNSIGNED NULL AFTER \`gender_option_id\`,
      ADD COLUMN \`short_description\` VARCHAR(500) NULL AFTER \`country_option_id\`,
      ADD COLUMN \`highlights\` TEXT NULL AFTER \`description\`,
      ADD COLUMN \`material_and_fabric\` TEXT NULL AFTER \`highlights\`,
      ADD COLUMN \`care_instructions\` TEXT NULL AFTER \`material_and_fabric\`,
      ADD COLUMN \`attribute_values\` JSON NULL AFTER \`care_instructions\`,
      ADD UNIQUE INDEX \`UQ_PRODUCTS_SELLER_SKU\` (\`seller_id\`, \`seller_sku\`),
      ADD CONSTRAINT \`FK_PRODUCTS_BRAND_OPTION\` FOREIGN KEY (\`brand_option_id\`) REFERENCES \`product_options\`(\`id\`) ON DELETE RESTRICT,
      ADD CONSTRAINT \`FK_PRODUCTS_TYPE_OPTION\` FOREIGN KEY (\`product_type_option_id\`) REFERENCES \`product_options\`(\`id\`) ON DELETE RESTRICT,
      ADD CONSTRAINT \`FK_PRODUCTS_GENDER_OPTION\` FOREIGN KEY (\`gender_option_id\`) REFERENCES \`product_options\`(\`id\`) ON DELETE RESTRICT,
      ADD CONSTRAINT \`FK_PRODUCTS_COUNTRY_OPTION\` FOREIGN KEY (\`country_option_id\`) REFERENCES \`product_options\`(\`id\`) ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE \`product_variants\`
      ADD COLUMN \`color_option_id\` BIGINT UNSIGNED NULL AFTER \`product_id\`,
      ADD COLUMN \`size_option_id\` BIGINT UNSIGNED NULL AFTER \`color_option_id\`,
      ADD CONSTRAINT \`FK_VARIANTS_COLOR_OPTION\` FOREIGN KEY (\`color_option_id\`) REFERENCES \`product_options\`(\`id\`) ON DELETE RESTRICT,
      ADD CONSTRAINT \`FK_VARIANTS_SIZE_OPTION\` FOREIGN KEY (\`size_option_id\`) REFERENCES \`product_options\`(\`id\`) ON DELETE RESTRICT
    `);

    const values: Array<[string, string, string, number]> = [
      ['BRAND', 'UNBRANDED', 'Unbranded', 1],
      ['PRODUCT_TYPE', 'DRESS', 'Dress', 1],
      ['PRODUCT_TYPE', 'TOP', 'Top', 2],
      ['PRODUCT_TYPE', 'SHIRT', 'Shirt', 3],
      ['PRODUCT_TYPE', 'TSHIRT', 'T-Shirt', 4],
      ['GENDER', 'WOMEN', 'Women', 1],
      ['GENDER', 'MEN', 'Men', 2],
      ['GENDER', 'UNISEX', 'Unisex', 3],
      ['GENDER', 'KIDS', 'Kids', 4],
      ['COUNTRY', 'IN', 'India', 1],
      ['MATERIAL', 'COTTON', 'Cotton', 1],
      ['MATERIAL', 'LINEN', 'Linen', 2],
      ['MATERIAL', 'POLYESTER', 'Polyester', 3],
      ['MATERIAL', 'SILK', 'Silk', 4],
      ['FIT', 'SLIM', 'Slim Fit', 1],
      ['FIT', 'REGULAR', 'Regular Fit', 2],
      ['FIT', 'RELAXED', 'Relaxed Fit', 3],
      ['NECK_TYPE', 'ROUND', 'Round Neck', 1],
      ['NECK_TYPE', 'V_NECK', 'V-Neck', 2],
      ['NECK_TYPE', 'COLLARED', 'Collared', 3],
      ['SLEEVE', 'SLEEVELESS', 'Sleeveless', 1],
      ['SLEEVE', 'SHORT', 'Short Sleeve', 2],
      ['SLEEVE', 'LONG', 'Long Sleeve', 3],
      ['OCCASION', 'CASUAL', 'Casual', 1],
      ['OCCASION', 'FORMAL', 'Formal', 2],
      ['OCCASION', 'PARTY', 'Party', 3],
      ['COLOR', 'BLACK', 'Black', 1],
      ['COLOR', 'RUST', 'Rust', 2],
      ['COLOR', 'IVORY', 'Ivory', 3],
      ['COLOR', 'EMERALD', 'Emerald', 4],
      ['SIZE', 'XS', 'XS', 1],
      ['SIZE', 'S', 'S', 2],
      ['SIZE', 'M', 'M', 3],
      ['SIZE', 'L', 'L', 4],
      ['SIZE', 'XL', 'XL', 5],
      ['SIZE', 'XXL', 'XXL', 6],
    ];
    for (const value of values) {
      await queryRunner.query(
        'INSERT INTO `product_options` (`group`,`code`,`label`,`sort_order`) VALUES (?,?,?,?)',
        value
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`product_variants\` DROP FOREIGN KEY \`FK_VARIANTS_SIZE_OPTION\`, DROP FOREIGN KEY \`FK_VARIANTS_COLOR_OPTION\`, DROP COLUMN \`size_option_id\`, DROP COLUMN \`color_option_id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`products\` DROP FOREIGN KEY \`FK_PRODUCTS_COUNTRY_OPTION\`, DROP FOREIGN KEY \`FK_PRODUCTS_GENDER_OPTION\`, DROP FOREIGN KEY \`FK_PRODUCTS_TYPE_OPTION\`, DROP FOREIGN KEY \`FK_PRODUCTS_BRAND_OPTION\`, DROP INDEX \`UQ_PRODUCTS_SELLER_SKU\`, DROP COLUMN \`attribute_values\`, DROP COLUMN \`care_instructions\`, DROP COLUMN \`material_and_fabric\`, DROP COLUMN \`highlights\`, DROP COLUMN \`short_description\`, DROP COLUMN \`country_option_id\`, DROP COLUMN \`gender_option_id\`, DROP COLUMN \`product_type_option_id\`, DROP COLUMN \`brand_option_id\`, DROP COLUMN \`seller_sku\``
    );
    await queryRunner.query('ALTER TABLE `categories` DROP COLUMN `commission_rate`');
    await queryRunner.query('DROP TABLE `product_options`');
  }
}
