import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInvoiceScanning1722140000000 implements MigrationInterface {
  name = 'CreateInvoiceScanning1722140000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE invoices
       ADD COLUMN invoice_type enum('SINGLE','MULTIPLE') NOT NULL DEFAULT 'MULTIPLE',
       ADD COLUMN expires_at datetime NULL`
    );
    await queryRunner.query(
      `CREATE TABLE invoice_scan_sessions (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        session_id char(36) NOT NULL,
        invoice_id bigint unsigned NOT NULL,
        invoice_number varchar(100) NOT NULL,
        user_id bigint unsigned NOT NULL,
        invoice_type enum('SINGLE','MULTIPLE') NOT NULL,
        expected_pairs int unsigned NOT NULL,
        scanned_pairs int unsigned NOT NULL DEFAULT 0,
        valid_pairs int unsigned NOT NULL DEFAULT 0,
        invalid_pairs int unsigned NOT NULL DEFAULT 0,
        status enum('ACTIVE','COMPLETED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
        started_at datetime NOT NULL,
        completed_at datetime NULL,
        last_scanned_at datetime NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_invoice_scan_session_id (session_id),
        KEY idx_session_user_status (user_id, status),
        KEY idx_session_last_scanned (last_scanned_at),
        KEY idx_active_invoice_user (invoice_id, user_id, status)
      ) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE pair_scan_history (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        session_id char(36) NOT NULL,
        invoice_id bigint unsigned NOT NULL,
        pair_uid varchar(100) NOT NULL,
        user_id bigint unsigned NOT NULL,
        status enum('VALID','INVALID','REWARDED') NOT NULL,
        scan_source enum('SINGLE','BULK') NOT NULL,
        failure_reason varchar(255) NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_pair_invoice (invoice_id, pair_uid),
        UNIQUE KEY uq_pair_session (session_id, pair_uid),
        KEY idx_pair_history_user_created (user_id, created_at)
      ) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE invoice_scan_history (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        invoice_id bigint unsigned NOT NULL,
        invoice_number varchar(100) NOT NULL,
        session_id char(36) NOT NULL,
        user_id bigint unsigned NOT NULL,
        status enum('STARTED','PARTIALLY_SUBMITTED','COMPLETED','CANCELLED') NOT NULL,
        points_awarded int unsigned NOT NULL DEFAULT 0,
        metadata json NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY idx_invoice_history_user_created (user_id, created_at),
        KEY idx_invoice_history_invoice_status (invoice_id, status),
        KEY idx_invoice_history_session (session_id)
      ) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE invoice_pair_details
       MODIFY status enum('UNSCANNED','SCANNED','INVALID','EXPIRED','REDEEMED','USED')
       NOT NULL DEFAULT 'UNSCANNED'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE invoice_scan_history');
    await queryRunner.query('DROP TABLE pair_scan_history');
    await queryRunner.query('DROP TABLE invoice_scan_sessions');
    await queryRunner.query(
      'ALTER TABLE invoices DROP COLUMN expires_at, DROP COLUMN invoice_type'
    );
    await queryRunner.query(
      `ALTER TABLE invoice_pair_details
       MODIFY status enum('UNSCANNED','SCANNED','INVALID','EXPIRED')
       NOT NULL DEFAULT 'UNSCANNED'`
    );
  }
}
