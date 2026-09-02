import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationPlatform1787801600000 implements MigrationInterface {
  name = 'CreateNotificationPlatform1787801600000';
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE \`notification_templates\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, \`active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` DATETIME(6) NULL,
      \`code\` VARCHAR(100) NOT NULL, \`channel\` ENUM('IN_APP','EMAIL','SMS','PUSH') NOT NULL,
      \`locale\` VARCHAR(10) NOT NULL DEFAULT 'en-IN', \`title\` VARCHAR(200) NOT NULL, \`body\` TEXT NOT NULL,
      \`allowed_variables\` JSON NULL, \`version\` INT NOT NULL DEFAULT 1, PRIMARY KEY (\`id\`),
      UNIQUE INDEX \`UQ_NOTIFICATION_TEMPLATE_CODE_CHANNEL_LOCALE\` (\`code\`,\`channel\`,\`locale\`), INDEX \`IDX_NOTIFICATION_TEMPLATE_ACTIVE\` (\`code\`,\`active\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q.query(`CREATE TABLE \`notifications\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, \`active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` DATETIME(6) NULL,
      \`recipient_id\` BIGINT NOT NULL, \`template_code\` VARCHAR(100) NOT NULL,
      \`category\` ENUM('ORDERS','PRODUCT_APPROVAL','REVIEWS','BOOST','PAYMENTS','KYC','SYSTEM') NOT NULL,
      \`title\` VARCHAR(200) NOT NULL, \`body\` TEXT NOT NULL, \`resource_type\` VARCHAR(80) NULL, \`resource_id\` VARCHAR(100) NULL,
      \`metadata\` JSON NULL, \`dedupe_key\` VARCHAR(180) NULL, \`read_at\` DATETIME NULL, \`expires_at\` DATETIME NULL,
      PRIMARY KEY (\`id\`), UNIQUE INDEX \`UQ_NOTIFICATIONS_DEDUPE\` (\`dedupe_key\`),
      INDEX \`IDX_NOTIFICATIONS_INBOX\` (\`recipient_id\`,\`read_at\`,\`created_at\`), INDEX \`IDX_NOTIFICATIONS_CATEGORY\` (\`recipient_id\`,\`category\`,\`created_at\`),
      CONSTRAINT \`FK_NOTIFICATIONS_RECIPIENT\` FOREIGN KEY (\`recipient_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q.query(`CREATE TABLE \`notification_deliveries\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, \`active\` TINYINT(1) NOT NULL DEFAULT 1, \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` DATETIME(6) NULL,
      \`notification_id\` BIGINT UNSIGNED NOT NULL, \`channel\` ENUM('IN_APP','EMAIL','SMS','PUSH') NOT NULL,
      \`status\` ENUM('PENDING','PROCESSING','SENT','DELIVERED','FAILED') NOT NULL DEFAULT 'PENDING', \`attempt_count\` INT NOT NULL DEFAULT 0,
      \`next_attempt_at\` DATETIME NULL, \`provider_message_id\` VARCHAR(200) NULL, \`last_error\` VARCHAR(500) NULL,
      PRIMARY KEY (\`id\`), UNIQUE INDEX \`UQ_NOTIFICATION_DELIVERY_CHANNEL\` (\`notification_id\`,\`channel\`), INDEX \`IDX_NOTIFICATION_DELIVERY_RETRY\` (\`status\`,\`next_attempt_at\`),
      CONSTRAINT \`FK_NOTIFICATION_DELIVERY_NOTIFICATION\` FOREIGN KEY (\`notification_id\`) REFERENCES \`notifications\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q.query(`CREATE TABLE \`notification_preferences\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, \`active\` TINYINT(1) NOT NULL DEFAULT 1, \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` DATETIME(6) NULL,
      \`user_id\` BIGINT NOT NULL, \`category\` ENUM('ORDERS','PRODUCT_APPROVAL','REVIEWS','BOOST','PAYMENTS','KYC','SYSTEM') NOT NULL,
      \`channel\` ENUM('IN_APP','EMAIL','SMS','PUSH') NOT NULL, \`enabled\` TINYINT(1) NOT NULL DEFAULT 1, PRIMARY KEY (\`id\`),
      UNIQUE INDEX \`UQ_NOTIFICATION_PREFERENCE\` (\`user_id\`,\`category\`,\`channel\`), CONSTRAINT \`FK_NOTIFICATION_PREFERENCE_USER\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q.query(`CREATE TABLE \`notification_devices\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, \`user_id\` BIGINT NOT NULL, \`platform\` ENUM('IOS','ANDROID','WEB') NOT NULL,
      \`token_hash\` CHAR(64) NOT NULL, \`encrypted_token\` TEXT NOT NULL, \`last_seen_at\` DATETIME NOT NULL, \`revoked_at\` DATETIME NULL,
      PRIMARY KEY (\`id\`), UNIQUE INDEX \`UQ_NOTIFICATION_DEVICE_TOKEN\` (\`token_hash\`), INDEX \`IDX_NOTIFICATION_DEVICE_USER\` (\`user_id\`,\`revoked_at\`),
      CONSTRAINT \`FK_NOTIFICATION_DEVICE_USER\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q.query(`CREATE TABLE \`notification_outbox\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, \`event_type\` VARCHAR(100) NOT NULL, \`aggregate_id\` VARCHAR(100) NOT NULL,
      \`payload\` JSON NOT NULL, \`status\` ENUM('PENDING','PROCESSING','PROCESSED','FAILED') NOT NULL DEFAULT 'PENDING',
      \`attempt_count\` INT NOT NULL DEFAULT 0, \`available_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, \`processed_at\` DATETIME NULL, \`last_error\` VARCHAR(500) NULL,
      \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`), INDEX \`IDX_NOTIFICATION_OUTBOX_WORK\` (\`status\`,\`available_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    const templates = [
      [
        'NEW_ORDER',
        'New order received',
        'Order {{orderNumber}} has been received.',
        ['orderNumber'],
      ],
      [
        'PRODUCT_APPROVED',
        'Product approved',
        '{{productName}} has been approved and is ready to publish.',
        ['productName'],
      ],
      [
        'PRODUCT_REJECTED',
        'Product rejected',
        '{{productName}} was rejected. Reason: {{reason}}',
        ['productName', 'reason'],
      ],
      [
        'NEW_REVIEW',
        'New customer review',
        '{{customerName}} left a {{rating}}-star review on {{productName}}.',
        ['customerName', 'rating', 'productName'],
      ],
      [
        'BOOST_EXPIRING',
        'Boost expiring soon',
        'Your boost for {{productName}} expires in {{days}} days.',
        ['productName', 'days'],
      ],
      [
        'PAYMENT_SETTLED',
        'Payment settled',
        '₹{{amount}} has been settled to your bank account ending {{accountLast4}}.',
        ['amount', 'accountLast4'],
      ],
      [
        'ORDER_SHIPMENT_DUE',
        'Order needs shipment',
        '{{orderNumber}} is packed and awaiting shipment.',
        ['orderNumber'],
      ],
    ];
    for (const [code, title, body, variables] of templates)
      await q.query(
        "INSERT INTO `notification_templates` (`code`,`channel`,`locale`,`title`,`body`,`allowed_variables`) VALUES (?,'IN_APP','en-IN',?,?,?)",
        [code, title, body, JSON.stringify(variables)]
      );
  }
  public async down(q: QueryRunner): Promise<void> {
    for (const table of [
      'notification_outbox',
      'notification_devices',
      'notification_preferences',
      'notification_deliveries',
      'notifications',
      'notification_templates',
    ])
      await q.query(`DROP TABLE \`${table}\``);
  }
}
