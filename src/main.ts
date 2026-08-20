import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './default/config/config.service';
import { AppController } from './app.controller';
import { SwaggerService } from './default/swagger/swagger.service';
import { ConsoleLogger } from './default/logger/console/console.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';

import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { CommonUtils } from './default/common/utils/common.utils';
// import { RepositoryFactory } from "./default/common/repositories/RepositoryFactory";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const configService = app.get(ConfigService);
  const appConfigService = app.get(AppConfigService);
  const port = appConfigService.getPort();
  const protocol = appConfigService.get('PROTOCOL') || 'http';
  const host = appConfigService.get('HOST') || 'localhost';
  const globalPrefix = `api/v${appConfigService.get('API_VERSION')}`;
  const payloadLimit = configService.get<string>('PAYLOAD_LIMIT', '1mb');
  app.useBodyParser('json', { limit: payloadLimit });
  app.useBodyParser('urlencoded', { limit: payloadLimit, extended: true });

  // Swagger UI is set up by SwaggerService below (gated to non-production there).
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`, 'unpkg.com'],
          styleSrc: [
            `'self'`,
            `'unsafe-inline'`,
            'cdn.jsdelivr.net',
            'fonts.googleapis.com',
            'unpkg.com',
          ],
          fontSrc: [`'self'`, 'fonts.gstatic.com', 'data:'],
          imgSrc: [`'self'`, 'data:', 'cdn.jsdelivr.net'],
          scriptSrc: [`'self'`, `https: 'unsafe-inline'`, `cdn.jsdelivr.net`, `'unsafe-eval'`],
        },
      }, // or false
    })
  );

  // CORS. Auth is Bearer-token based (no cookies), so `credentials` stays false —
  // combining a wildcard origin with credentials:true is an invalid/rejected combination.
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: false,
  });

  // Enable Cookie Parser
  app.use(cookieParser());

  // CSRF Protection
  // app.use(csurf({ cookie: true })); // Use cookies to store CSRF tokens

  // Global validation is registered via APP_PIPE in AppModule.

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/', (req: any, res: any) => {
    res.json('Welcome To the CAMPUS SHOES API');
  });

  // Enable api versioning with a prefix
  app.setGlobalPrefix(globalPrefix);

  // Initialize ConsoleLogger
  const eventEmitter = app.get(EventEmitter2);
  ConsoleLogger.initialize(eventEmitter);
  ConsoleLogger.log('Application initialized', 'Bootstrap');

  // swagger service
  const swaggerService = app.get(SwaggerService);
  swaggerService.initialize(app);
  swaggerService.setupSwagger();

  // const dataSource = app.get(DataSource);

  // // ✅ Initialize RepositoryFactory with named connection
  // RepositoryFactory.init(dataSource);
  // ConsoleLogger.log(
  //   `✅ RepositoryFactory initialized with ${RepositoryFactory.listKeys().length} repositories`,
  //   "Bootstrap",
  // );
  // console.log("portttttt",port)
  CommonUtils.init(appConfigService);
  await app.listen(port);

  const baseUrl = `${protocol}://${host}:${port}/${globalPrefix}`;

  ConsoleLogger.log(`Application is running on: ${baseUrl}`, 'Bootstrap');
  ConsoleLogger.log(`Health Check Endpoint: ${baseUrl}/health`, 'Bootstrap');
  ConsoleLogger.log('Initiating Launch Time Health Check', 'Bootstrap');

  try {
    const appController = app.get(AppController); // ✅ Proper DI resolution
    const response = await appController.checkHealthService();
    ConsoleLogger.log(response, 'Bootstrap');
  } catch (error) {
    console.log(error);
    ConsoleLogger.error('Health Check Error', error?.stack || error, 'Bootstrap');
  }
}
bootstrap().catch((error) => {
  console.error('Fatal error during application bootstrap:', error);
  process.exit(1);
});
