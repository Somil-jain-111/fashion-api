import 'reflect-metadata';
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AppConfigService } from "./default/config/config.service";
import { ValidationPipe } from "@nestjs/common/pipes/validation.pipe";
import { AppController } from "./app.controller";
import { SwaggerService } from "./default/swagger/swagger.service";
import { ConsoleLogger } from "./default/logger/console/console.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ConfigService } from "@nestjs/config";

import helmet from "helmet";
import cookieParser from "cookie-parser";
import express from "express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { DataSource } from "typeorm";
import { RepositoryFactory } from "./default/common/repositories/repository.factory";
import { CommonUtils } from "./default/common/utils/common.utils";
// import { RepositoryFactory } from "./default/common/repositories/RepositoryFactory";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appConfigService = app.get(AppConfigService);
  const port = appConfigService.getPort();
  const protocol = appConfigService.get("PROTOCOL") || "http";
  const host = appConfigService.get("HOST") || "localhost";
  const globalPrefix = `api/v${appConfigService.get("API_VERSION")}`;
  const payloadLimit = configService.get<string>("PAYLOAD_LIMIT", "1mb");
  app.use(express.json({ limit: payloadLimit }));
  app.use(express.urlencoded({ limit: payloadLimit, extended: true }));

  const config = new DocumentBuilder()
    .setTitle("Your API Title")
    .setDescription("API documentation for your project")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`, "unpkg.com"],
          styleSrc: [
            `'self'`,
            `'unsafe-inline'`,
            "cdn.jsdelivr.net",
            "fonts.googleapis.com",
            "unpkg.com",
          ],
          fontSrc: [`'self'`, "fonts.gstatic.com", "data:"],
          imgSrc: [`'self'`, "data:", "cdn.jsdelivr.net"],
          scriptSrc: [
            `'self'`,
            `https: 'unsafe-inline'`,
            `cdn.jsdelivr.net`,
            `'unsafe-eval'`,
          ],
        },
      }, // or false
    }),
  );

  // CORS
  app.enableCors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  // Enable Cookie Parser
  app.use(cookieParser());

  // CSRF Protection
  // app.use(csurf({ cookie: true })); // Use cookies to store CSRF tokens

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get("/", (req: any, res: any) => {
    res.json("Welcome To the SKIPPER API");
  });

  // Enable api versioning with a prefix
  app.setGlobalPrefix(globalPrefix);

  // Initialize ConsoleLogger
  const eventEmitter = app.get(EventEmitter2);
  ConsoleLogger.initialize(eventEmitter);
  ConsoleLogger.log("Application initialized", "Bootstrap");

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

  ConsoleLogger.log(`Application is running on: ${baseUrl}`, "Bootstrap");
  ConsoleLogger.log(`Health Check Endpoint: ${baseUrl}/health`, "Bootstrap");
  ConsoleLogger.log("Initiating Launch Time Health Check", "Bootstrap");

  try {
    const appController = app.get(AppController); // ✅ Proper DI resolution
    const response = await appController.checkHealthService();
    ConsoleLogger.log(response, "Bootstrap");
  } catch (error) {
    console.log(error)
    ConsoleLogger.error(
      "Health Check Error",
      error?.stack || error,
      "Bootstrap",
    );
  }
}
bootstrap();
