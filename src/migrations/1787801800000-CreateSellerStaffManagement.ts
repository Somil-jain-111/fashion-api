import { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateSellerStaffManagement1787801800000 implements MigrationInterface {
  name = 'CreateSellerStaffManagement1787801800000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `CREATE TABLE \`seller_staff_roles\` (\`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\`active\` TINYINT(1) NOT NULL DEFAULT 1,\`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),\`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),\`deleted_at\` DATETIME(6) NULL,\`code\` VARCHAR(80) NOT NULL,\`name\` VARCHAR(120) NOT NULL,\`description\` VARCHAR(300) NULL,\`is_system\` TINYINT(1) NOT NULL DEFAULT 1,\`sort_order\` INT NOT NULL DEFAULT 0,PRIMARY KEY(\`id\`),UNIQUE INDEX \`UQ_STAFF_ROLE_CODE\`(\`code\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    await q.query(
      `CREATE TABLE \`seller_staff_role_permissions\` (\`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\`active\` TINYINT(1) NOT NULL DEFAULT 1,\`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),\`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),\`deleted_at\` DATETIME(6) NULL,\`role_id\` BIGINT UNSIGNED NOT NULL,\`permission\` VARCHAR(100) NOT NULL,PRIMARY KEY(\`id\`),UNIQUE INDEX \`UQ_STAFF_ROLE_PERMISSION\`(\`role_id\`,\`permission\`),CONSTRAINT \`FK_STAFF_PERMISSION_ROLE\` FOREIGN KEY(\`role_id\`) REFERENCES \`seller_staff_roles\`(\`id\`) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    await q.query(
      `CREATE TABLE \`seller_staff_memberships\` (\`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\`active\` TINYINT(1) NOT NULL DEFAULT 1,\`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),\`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),\`deleted_at\` DATETIME(6) NULL,\`seller_id\` BIGINT NOT NULL,\`user_id\` BIGINT NULL,\`role_id\` BIGINT UNSIGNED NOT NULL,\`full_name\` VARCHAR(150) NOT NULL,\`email\` VARCHAR(255) NOT NULL,\`mobile\` VARCHAR(15) NOT NULL,\`status\` ENUM('INVITED','ACTIVE','INACTIVE','REVOKED') NOT NULL DEFAULT 'INVITED',\`invite_token_hash\` CHAR(64) NULL,\`invite_expires_at\` DATETIME NULL,\`accepted_at\` DATETIME NULL,\`last_login_at\` DATETIME NULL,PRIMARY KEY(\`id\`),UNIQUE INDEX \`UQ_STAFF_SELLER_EMAIL\`(\`seller_id\`,\`email\`),UNIQUE INDEX \`UQ_STAFF_INVITE_TOKEN\`(\`invite_token_hash\`),INDEX \`IDX_STAFF_SELLER_STATUS\`(\`seller_id\`,\`status\`),CONSTRAINT \`FK_STAFF_SELLER\` FOREIGN KEY(\`seller_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,CONSTRAINT \`FK_STAFF_USER\` FOREIGN KEY(\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,CONSTRAINT \`FK_STAFF_ROLE\` FOREIGN KEY(\`role_id\`) REFERENCES \`seller_staff_roles\`(\`id\`) ON DELETE RESTRICT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    await q.query(
      `CREATE TABLE \`seller_staff_audits\` (\`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\`active\` TINYINT(1) NOT NULL DEFAULT 1,\`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),\`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),\`deleted_at\` DATETIME(6) NULL,\`seller_id\` BIGINT NOT NULL,\`membership_id\` BIGINT UNSIGNED NOT NULL,\`actor_id\` BIGINT NOT NULL,\`action\` VARCHAR(80) NOT NULL,\`changes\` JSON NULL,PRIMARY KEY(\`id\`),INDEX \`IDX_STAFF_AUDIT_SELLER\`(\`seller_id\`,\`created_at\`),CONSTRAINT \`FK_STAFF_AUDIT_MEMBERSHIP\` FOREIGN KEY(\`membership_id\`) REFERENCES \`seller_staff_memberships\`(\`id\`) ON DELETE CASCADE,CONSTRAINT \`FK_STAFF_AUDIT_ACTOR\` FOREIGN KEY(\`actor_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    const roles = [
      ['ORDER_STAFF', 'Order Staff', 'Manage orders and shipment workflow', 1],
      ['CATALOGUE_STAFF', 'Catalogue Staff', 'Manage products, media and inventory', 2],
      ['FULFILMENT_STAFF', 'Fulfilment Staff', 'Manage packing, shipping and returns', 3],
    ];
    for (const r of roles)
      await q.query(
        'INSERT INTO `seller_staff_roles` (`code`,`name`,`description`,`sort_order`) VALUES (?,?,?,?)',
        r
      );
    const permissions: { [key: string]: string[] } = {
      ORDER_STAFF: ['orders.read', 'orders.update'],
      CATALOGUE_STAFF: [
        'products.read',
        'products.create',
        'products.update',
        'inventory.read',
        'inventory.update',
      ],
      FULFILMENT_STAFF: [
        'orders.read',
        'shipments.read',
        'shipments.update',
        'returns.read',
        'returns.update',
      ],
    };
    for (const [code, values] of Object.entries(permissions)) {
      const rows: any[] = await q.query('SELECT id FROM `seller_staff_roles` WHERE code=?', [code]);
      for (const permission of values)
        await q.query(
          'INSERT INTO `seller_staff_role_permissions` (`role_id`,`permission`) VALUES (?,?)',
          [rows[0].id, permission]
        );
    }
  }
  async down(q: QueryRunner): Promise<void> {
    for (const t of [
      'seller_staff_audits',
      'seller_staff_memberships',
      'seller_staff_role_permissions',
      'seller_staff_roles',
    ])
      await q.query(`DROP TABLE \`${t}\``);
  }
}
