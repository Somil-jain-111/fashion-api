import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePointPurchases1722141000000 implements MigrationInterface {
  name = 'CreatePointPurchases1722141000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE point_purchases (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        reference_id varchar(100) NOT NULL,
        user_id bigint unsigned NOT NULL,
        points int unsigned NOT NULL,
        base_amount_paise int unsigned NOT NULL,
        platform_fee_paise int unsigned NOT NULL,
        gst_amount_paise int unsigned NOT NULL,
        payable_amount_paise int unsigned NOT NULL,
        payment_link_id varchar(100) NULL,
        payment_url varchar(500) NULL,
        razorpay_payment_id varchar(100) NULL,
        status enum('CREATING','PENDING','PAID','FAILED','EXPIRED') NOT NULL DEFAULT 'CREATING',
        failure_reason varchar(500) NULL,
        paid_at datetime NULL,
        provider_payload json NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_point_purchase_reference (reference_id),
        UNIQUE KEY uq_point_purchase_link (payment_link_id),
        UNIQUE KEY uq_point_purchase_payment (razorpay_payment_id),
        KEY idx_point_purchase_user_status (user_id, status)
      ) ENGINE=InnoDB
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE point_purchases');
  }
}
