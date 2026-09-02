import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenKycEncryption1787801900000 implements MigrationInterface {
  name = 'HardenKycEncryption1787801900000';
  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE `kyc_verifications` ADD COLUMN `document_hash` CHAR(64) NULL');
    await q.query(
      'CREATE INDEX `IDX_KYC_DOCUMENT_HASH_TYPE` ON `kyc_verifications` (`document_hash`,`type`)'
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP INDEX `IDX_KYC_DOCUMENT_HASH_TYPE` ON `kyc_verifications`');
    await q.query('ALTER TABLE `kyc_verifications` DROP COLUMN `document_hash`');
  }
}
