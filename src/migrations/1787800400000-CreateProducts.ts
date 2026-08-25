import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProducts1787800400000 implements MigrationInterface {
  name = 'CreateProducts1787800400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`products\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`seller_id\` BIGINT NOT NULL,
        \`category_id\` BIGINT NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NULL,
        \`base_price\` DECIMAL(10,2) NOT NULL,
        \`wholesale_price\` DECIMAL(10,2) NULL,
        \`zone\` ENUM('RETAIL', 'WHOLESALE', 'BOTH') NOT NULL,
        \`status\` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'INACTIVE') NOT NULL DEFAULT 'DRAFT',
        \`rejection_reason\` TEXT NULL,
        \`rating_average\` DECIMAL(3,2) NOT NULL DEFAULT 0,
        \`rating_count\` INT NOT NULL DEFAULT 0,
        \`reviewed_by\` BIGINT NULL,
        \`reviewed_at\` DATETIME NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_PRODUCTS_SELLER_ID\` (\`seller_id\`),
        INDEX \`IDX_PRODUCTS_CATEGORY_ID\` (\`category_id\`),
        INDEX \`IDX_PRODUCTS_STATUS\` (\`status\`),
        CONSTRAINT \`FK_PRODUCTS_SELLER\` FOREIGN KEY (\`seller_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_PRODUCTS_CATEGORY\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_PRODUCTS_REVIEWED_BY\` FOREIGN KEY (\`reviewed_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`product_variants\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`product_id\` BIGINT NOT NULL,
        \`size\` VARCHAR(50) NOT NULL,
        \`sku\` VARCHAR(100) NOT NULL,
        \`price_override\` DECIMAL(10,2) NULL,
        \`stock_quantity\` INT NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_PRODUCT_VARIANT_SKU\` (\`sku\`),
        INDEX \`IDX_PRODUCT_VARIANTS_PRODUCT_ID\` (\`product_id\`),
        CONSTRAINT \`FK_PRODUCT_VARIANTS_PRODUCT\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`product_images\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`product_id\` BIGINT NOT NULL,
        \`variant_id\` BIGINT NULL,
        \`url\` VARCHAR(500) NOT NULL,
        \`is_primary\` TINYINT(1) NOT NULL DEFAULT 0,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_PRODUCT_IMAGES_PRODUCT_ID\` (\`product_id\`),
        CONSTRAINT \`FK_PRODUCT_IMAGES_PRODUCT\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_PRODUCT_IMAGES_VARIANT\` FOREIGN KEY (\`variant_id\`) REFERENCES \`product_variants\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`product_images\``);
    await queryRunner.query(`DROP TABLE \`product_variants\``);
    await queryRunner.query(`DROP TABLE \`products\``);
  }
}
