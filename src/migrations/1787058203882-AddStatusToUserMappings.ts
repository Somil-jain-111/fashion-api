import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * UserMapping entity (src/modules/auth/entities/user-mapping.entity.ts) has always declared
 * a `status` enum column (MappingStatus: active/inactive), but no migration ever created it —
 * schema drift that breaks any query selecting the full entity (e.g.
 * UserMappingRepository.findMappedDistributors, used by GET /users/mapped-distributors and by
 * the new retailer-invoice validate flow) with "Unknown column 'UserMapping.status'".
 */
export class AddStatusToUserMappings1787058203882 implements MigrationInterface {
  name = 'AddStatusToUserMappings1787058203882';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user_mappings\` ADD \`status\` enum('active','inactive') NOT NULL DEFAULT 'active'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user_mappings\` DROP COLUMN \`status\``);
  }
}
