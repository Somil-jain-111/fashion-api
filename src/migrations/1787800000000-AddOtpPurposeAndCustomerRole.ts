import { MigrationInterface, QueryRunner } from 'typeorm';

const ALL_ROLES = [
  'retailer',
  'distributor',
  'sub_distributor',
  'sales_person',
  'employee',
  'super_admin',
  'l1',
  'l2',
  'admin',
  'seller_admin',
  'customer',
] as const;

const EXISTING_ROLES_WITHOUT_CUSTOMER = ALL_ROLES.filter((role) => role !== 'customer');

export class AddOtpPurposeAndCustomerRole1787800000000 implements MigrationInterface {
  name = 'AddOtpPurposeAndCustomerRole1787800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD COLUMN \`otp_purpose\` ENUM('login', 'redemption', 'beneficiary', 'password_reset') NULL AFTER \`otp_attempt_count\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`roles\`
      MODIFY COLUMN \`name\` ENUM(${ALL_ROLES.map((role) => `'${role}'`).join(', ')}) NOT NULL
    `);

    await queryRunner.query(`
      INSERT INTO \`roles\` (\`name\`, \`user_type\`, \`active\`, \`created_at\`, \`updated_at\`)
      SELECT 'customer', 'USER', 1, NOW(6), NOW(6)
      WHERE NOT EXISTS (SELECT 1 FROM \`roles\` WHERE \`name\` = 'customer')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM \`roles\` WHERE \`name\` = 'customer'`);

    await queryRunner.query(`
      ALTER TABLE \`roles\`
      MODIFY COLUMN \`name\` ENUM(${EXISTING_ROLES_WITHOUT_CUSTOMER.map((role) => `'${role}'`).join(', ')}) NOT NULL
    `);

    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`otp_purpose\``);
  }
}
