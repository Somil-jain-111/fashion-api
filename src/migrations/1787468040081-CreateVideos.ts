import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CMS-managed video library (e.g. the retailer "History > Live Videos" list) — title required,
 * link is the video URL. Mirrors the existing faqs/faq_roles table shape and role-visibility
 * pattern (banners/cms_pages/faqs/announcements).
 */
export class CreateVideos1787468040081 implements MigrationInterface {
  name = 'CreateVideos1787468040081';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`videos\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`title\` varchar(255) NOT NULL,
        \`description\` longtext NULL,
        \`link\` varchar(255) NOT NULL,
        \`thumbnail_url\` varchar(255) NULL,
        \`priority\` int NOT NULL DEFAULT '0',
        \`is_active\` tinyint NOT NULL DEFAULT '1',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`video_roles\` (
        \`video_id\` bigint NOT NULL,
        \`role_id\` bigint NOT NULL,
        PRIMARY KEY (\`video_id\`, \`role_id\`),
        KEY \`idx_video_roles_video_id\` (\`video_id\`),
        KEY \`idx_video_roles_role_id\` (\`role_id\`),
        CONSTRAINT \`fk_video_roles_role_id\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\` (\`id\`),
        CONSTRAINT \`fk_video_roles_video_id\` FOREIGN KEY (\`video_id\`) REFERENCES \`videos\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`video_roles\``);
    await queryRunner.query(`DROP TABLE \`videos\``);
  }
}
