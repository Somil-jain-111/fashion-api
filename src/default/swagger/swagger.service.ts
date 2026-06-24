import { Injectable } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { INestApplication } from "@nestjs/common";
import { AppConfigService } from "../config/config.service";
import { ConsoleLogger } from "../logger/console/console.service";

@Injectable()
export class SwaggerService {
  private app: INestApplication;

  constructor(private readonly configService: AppConfigService) {}

  initialize(app: INestApplication) {
    this.app = app;
  }

  setupSwagger() {
    if (!this.app) {
      throw new Error("SwaggerService: Application instance is not set.");
    }

    // Load environment variables for Swagger
    const swaggerTitle =
      `${this.configService.get("APP_NAME")} - API Documentation` ||
      "API Documentation";
    const swaggerDescription =
      `${this.configService.get("APP_NAME")} - API description` ||
      "API description";
    const swaggerVersion =
      `${this.configService.get("API_VERSION")}.0` || "1.0";
    const swaggerPath = this.configService.get("SWAGGER_PATH") || "docs";

    const config = new DocumentBuilder()
      .setTitle(swaggerTitle)
      .setDescription(swaggerDescription)
      .setVersion(swaggerVersion)
      .build();

    const document = SwaggerModule.createDocument(this.app, config);
    SwaggerModule.setup(swaggerPath, this.app, document, {
      jsonDocumentUrl: `${swaggerPath}/json`,
    });

    ConsoleLogger.log(
      `Swagger setup complete at /${swaggerPath}`,
      "SwaggerService",
    );
  }
}
