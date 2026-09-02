import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductBoosts1787801100000 implements MigrationInterface {
  name = 'CreateProductBoosts1787801100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`product_boost_orders\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`public_id\` VARCHAR(36) NOT NULL,
        \`seller_id\` BIGINT NOT NULL,
        \`amount\` DECIMAL(10,2) NOT NULL,
        \`currency\` CHAR(3) NOT NULL DEFAULT 'INR',
        \`status\` ENUM('PENDING_PAYMENT','PAID','FAILED','EXPIRED') NOT NULL DEFAULT 'PENDING_PAYMENT',
        \`payment_id\` VARCHAR(100) NULL,
        \`paid_at\` DATETIME NULL,
        \`expires_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_BOOST_ORDER_PUBLIC_ID\` (\`public_id\`),
        UNIQUE INDEX \`UQ_BOOST_ORDER_PAYMENT_ID\` (\`payment_id\`),
        INDEX \`IDX_BOOST_ORDER_SELLER_STATUS\` (\`seller_id\`, \`status\`),
        CONSTRAINT \`FK_BOOST_ORDER_SELLER\` FOREIGN KEY (\`seller_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`product_boost_order_items\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`order_id\` BIGINT NOT NULL,
        \`product_id\` BIGINT NOT NULL,
        \`category_id\` BIGINT NOT NULL,
        \`target_type\` ENUM('PRODUCT','CATEGORY') NOT NULL,
        \`duration_days\` INT NOT NULL,
        \`line_amount\` DECIMAL(10,2) NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_BOOST_ORDER_ITEM_ORDER\` (\`order_id\`),
        INDEX \`IDX_BOOST_ORDER_ITEM_PRODUCT\` (\`product_id\`),
        CONSTRAINT \`FK_BOOST_ORDER_ITEM_ORDER\` FOREIGN KEY (\`order_id\`) REFERENCES \`product_boost_orders\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_BOOST_ORDER_ITEM_PRODUCT\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_BOOST_ORDER_ITEM_CATEGORY\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`product_boost_campaigns\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        \`order_id\` BIGINT NOT NULL,
        \`order_item_id\` BIGINT NOT NULL,
        \`seller_id\` BIGINT NOT NULL,
        \`product_id\` BIGINT NOT NULL,
        \`category_id\` BIGINT NOT NULL,
        \`target_type\` ENUM('PRODUCT','CATEGORY') NOT NULL,
        \`starts_at\` DATETIME NOT NULL,
        \`ends_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_BOOST_CAMPAIGN_ORDER\` (\`order_id\`),
        UNIQUE INDEX \`UQ_BOOST_CAMPAIGN_ORDER_ITEM\` (\`order_item_id\`),
        INDEX \`IDX_BOOST_CAMPAIGN_PRODUCT_WINDOW\` (\`product_id\`, \`starts_at\`, \`ends_at\`),
        INDEX \`IDX_BOOST_CAMPAIGN_CATEGORY_WINDOW\` (\`category_id\`, \`starts_at\`, \`ends_at\`),
        CONSTRAINT \`FK_BOOST_CAMPAIGN_ORDER\` FOREIGN KEY (\`order_id\`) REFERENCES \`product_boost_orders\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_BOOST_CAMPAIGN_ORDER_ITEM\` FOREIGN KEY (\`order_item_id\`) REFERENCES \`product_boost_order_items\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_BOOST_CAMPAIGN_SELLER\` FOREIGN KEY (\`seller_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_BOOST_CAMPAIGN_PRODUCT\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_BOOST_CAMPAIGN_CATEGORY\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `product_boost_campaigns`');
    await queryRunner.query('DROP TABLE `product_boost_order_items`');
    await queryRunner.query('DROP TABLE `product_boost_orders`');
  }
}
