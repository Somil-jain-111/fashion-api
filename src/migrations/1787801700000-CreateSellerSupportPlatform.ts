import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSellerSupportPlatform1787801700000 implements MigrationInterface {
  name = 'CreateSellerSupportPlatform1787801700000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `CREATE TABLE \`support_categories\` (\`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\`active\` TINYINT(1) NOT NULL DEFAULT 1,\`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),\`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),\`deleted_at\` DATETIME(6) NULL,\`code\` VARCHAR(80) NOT NULL,\`name\` VARCHAR(120) NOT NULL,\`sort_order\` INT NOT NULL DEFAULT 0,PRIMARY KEY(\`id\`),UNIQUE INDEX \`UQ_SUPPORT_CATEGORY_CODE\`(\`code\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    await q.query(
      `CREATE TABLE \`support_articles\` (\`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\`active\` TINYINT(1) NOT NULL DEFAULT 1,\`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),\`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),\`deleted_at\` DATETIME(6) NULL,\`type\` ENUM('FAQ','GUIDE','CONTACT') NOT NULL,\`title\` VARCHAR(200) NOT NULL,\`content\` TEXT NULL,\`url\` VARCHAR(500) NULL,\`locale\` VARCHAR(10) NOT NULL DEFAULT 'en-IN',\`sort_order\` INT NOT NULL DEFAULT 0,PRIMARY KEY(\`id\`),INDEX \`IDX_SUPPORT_ARTICLE_LIST\`(\`type\`,\`active\`,\`sort_order\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    await q.query(
      `CREATE TABLE \`support_tickets\` (\`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\`active\` TINYINT(1) NOT NULL DEFAULT 1,\`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),\`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),\`deleted_at\` DATETIME(6) NULL,\`ticket_number\` VARCHAR(30) NOT NULL,\`seller_id\` BIGINT NOT NULL,\`category_id\` BIGINT UNSIGNED NOT NULL,\`subject\` VARCHAR(200) NOT NULL,\`status\` ENUM('OPEN','IN_PROGRESS','WAITING_SELLER','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',\`priority\` ENUM('LOW','NORMAL','HIGH','URGENT') NOT NULL DEFAULT 'NORMAL',\`resource_type\` VARCHAR(80) NULL,\`resource_id\` VARCHAR(100) NULL,\`assigned_to\` BIGINT NULL,\`resolved_at\` DATETIME NULL,\`resolution_remark\` VARCHAR(500) NULL,PRIMARY KEY(\`id\`),UNIQUE INDEX \`UQ_SUPPORT_TICKET_NUMBER\`(\`ticket_number\`),INDEX \`IDX_SUPPORT_TICKET_SELLER\`(\`seller_id\`,\`updated_at\`),INDEX \`IDX_SUPPORT_TICKET_QUEUE\`(\`status\`,\`priority\`,\`updated_at\`),CONSTRAINT \`FK_SUPPORT_TICKET_SELLER\` FOREIGN KEY(\`seller_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,CONSTRAINT \`FK_SUPPORT_TICKET_CATEGORY\` FOREIGN KEY(\`category_id\`) REFERENCES \`support_categories\`(\`id\`) ON DELETE RESTRICT,CONSTRAINT \`FK_SUPPORT_TICKET_ASSIGNEE\` FOREIGN KEY(\`assigned_to\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    await q.query(
      `CREATE TABLE \`support_ticket_messages\` (\`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\`active\` TINYINT(1) NOT NULL DEFAULT 1,\`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),\`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),\`deleted_at\` DATETIME(6) NULL,\`ticket_id\` BIGINT UNSIGNED NOT NULL,\`sender_id\` BIGINT NOT NULL,\`sender_role\` VARCHAR(30) NOT NULL,\`message\` TEXT NOT NULL,\`is_internal\` TINYINT(1) NOT NULL DEFAULT 0,PRIMARY KEY(\`id\`),INDEX \`IDX_SUPPORT_MESSAGE_TICKET\`(\`ticket_id\`,\`created_at\`),CONSTRAINT \`FK_SUPPORT_MESSAGE_TICKET\` FOREIGN KEY(\`ticket_id\`) REFERENCES \`support_tickets\`(\`id\`) ON DELETE CASCADE,CONSTRAINT \`FK_SUPPORT_MESSAGE_SENDER\` FOREIGN KEY(\`sender_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    await q.query(
      `CREATE TABLE \`support_ticket_attachments\` (\`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\`active\` TINYINT(1) NOT NULL DEFAULT 1,\`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),\`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),\`deleted_at\` DATETIME(6) NULL,\`message_id\` BIGINT UNSIGNED NOT NULL,\`url\` VARCHAR(500) NOT NULL,\`file_name\` VARCHAR(120) NULL,\`mime_type\` VARCHAR(100) NULL,PRIMARY KEY(\`id\`),INDEX \`IDX_SUPPORT_ATTACHMENT_MESSAGE\`(\`message_id\`),CONSTRAINT \`FK_SUPPORT_ATTACHMENT_MESSAGE\` FOREIGN KEY(\`message_id\`) REFERENCES \`support_ticket_messages\`(\`id\`) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    for (const [code, name, sort] of [
      ['ORDERS', 'Orders', 1],
      ['PRODUCTS', 'Products', 2],
      ['KYC', 'KYC', 3],
      ['PAYMENTS', 'Payments', 4],
      ['INVENTORY', 'Inventory', 5],
      ['BOOST', 'Product Boost', 6],
      ['OTHER', 'Other', 99],
    ])
      await q.query(
        'INSERT INTO `support_categories` (`code`,`name`,`sort_order`) VALUES (?,?,?)',
        [code, name, sort]
      );
    const articles = [
      ['GUIDE', 'Documentation', 'Seller guides and tutorials', '/seller/docs', 1],
      [
        'CONTACT',
        'Contact Support',
        'Chat or email our seller team',
        'mailto:seller-support@fashionfizz.example',
        1,
      ],
      [
        'FAQ',
        'How do I submit a product for approval?',
        'Complete every product step and select Submit for Approval.',
        null,
        1,
      ],
      [
        'FAQ',
        'How long does KYC verification take?',
        'Verification time depends on provider and manual review status.',
        null,
        2,
      ],
      [
        'FAQ',
        'When will I receive my payment settlement?',
        'Settlement timing is shown against each completed order.',
        null,
        3,
      ],
      [
        'FAQ',
        'How do I update my inventory?',
        'Open the product variant and submit the revised stock quantity.',
        null,
        4,
      ],
      [
        'FAQ',
        'What are the product image guidelines?',
        'Use clear, well-lit images that follow the configured media limits.',
        null,
        5,
      ],
    ];
    for (const a of articles)
      await q.query(
        'INSERT INTO `support_articles` (`type`,`title`,`content`,`url`,`sort_order`) VALUES (?,?,?,?,?)',
        a
      );
  }
  async down(q: QueryRunner): Promise<void> {
    for (const t of [
      'support_ticket_attachments',
      'support_ticket_messages',
      'support_tickets',
      'support_articles',
      'support_categories',
    ])
      await q.query(`DROP TABLE \`${t}\``);
  }
}
