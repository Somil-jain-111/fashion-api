import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppConfigService } from '../../config/config.service';

export const sqlDbConfig = (configService: AppConfigService): TypeOrmModuleOptions => {
  const dbType = (configService.get('DB_TYPE') || 'mysql') as 'mysql' | 'postgres';

  const isLoggingEnabled = configService.get('ENABLE_CONSOLE_LOG') === 'true';

  const commonConfig = {
    entities: [__dirname + '/../../../modules/**/*.entity{.ts,.js}'],

    synchronize: false,
    migrationsRun: false,
    logging: isLoggingEnabled,
    logger: 'advanced-console' as const,
  };

  if (dbType === 'postgres') {
    return {
      type: 'postgres',
      host: configService.get('POSTGRES_HOST') || 'localhost',
      port: Number(configService.get('POSTGRES_PORT') || 5432),
      username: configService.get('POSTGRES_USERNAME') || 'postgres',
      password: String(configService.get('POSTGRES_PASSWORD') || 'password'),
      database: configService.get('POSTGRES_DATABASE') || 'test',
      ...commonConfig,
    };
  }

  //   console.log("MYSQL CONFIG", {

  //   host: configService.get("MYSQL_HOST"),

  //   port: configService.get("MYSQL_PORT"),

  //   username: configService.get("MYSQL_USERNAME"),

  //   password: configService.get("MYSQL_PASSWORD"),

  //   database: configService.get("MYSQL_DATABASE"),

  // });

  return {
    type: 'mysql',
    host: configService.get('MYSQL_HOST') || 'localhost',
    port: Number(configService.get('MYSQL_PORT') || 3306),
    username: configService.get('MYSQL_USERNAME') || 'root',
    password: String(configService.get('MYSQL_PASSWORD') || ''),
    database: configService.get('MYSQL_DATABASE') || 'test',
    ...commonConfig,
  };
};
