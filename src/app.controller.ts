import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from './default/databases/redis/redis.service';
import { CacheService } from './default/cache/cache.service';
import { NoCache } from './default/cache/cache.decorator';
import { AppConfigService } from './default/config/config.service';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Response } from 'express';
import { ConsoleLogger } from './default/logger/console/console.service';

@Controller()
export class AppController {
  constructor(
    private readonly sqlDbDataSource: DataSource,
    // @InjectDataSource("mongodbConnection")
    // private readonly mongoConnection: DataSource,
    private readonly redisService: RedisService,
    private cacheService: CacheService,
    private readonly appConfigService: AppConfigService,
    private readonly httpService: HttpService
  ) {}

  @NoCache()
  @Get('')
  getHello() {
    return {
      message: 'Response from base route - Hello World!',
    };
  }

  @NoCache()
  @Get('/metrics')
  async checkHealth(@Res() res: Response) {
    const response = await this.checkHealthService();
    res.status(HttpStatus.OK).json(response);
  }

  public async checkHealthService() {
    ConsoleLogger.log('Health Check Triggered', 'AppController');

    // Check individual services
    const mysqlStatus = await this.checkMySQL();
    // const mongodbStatus = await this.checkMongoDB();
    const redisStatus = await this.checkRedis();
    const cacheServiceStatus = await this.cacheService.testCache();
    const swaggerStatus = await this.checkSwagger();

    // Create health object with 0 or 1 values
    const health = [
      { serviceName: 'mysql', serviceStatus: mysqlStatus },
      // { serviceName: "mongodb", serviceStatus: mongodbStatus },
      { serviceName: 'redis', serviceStatus: redisStatus },
      { serviceName: 'cacheService', serviceStatus: cacheServiceStatus },
      { serviceName: 'swagger', serviceStatus: swaggerStatus },
    ];

    // Generate boolean number as a string (e.g., "11001")
    const booleanNumber = health.map((service) => service.serviceStatus).join('');

    // Convert boolean number to integer
    const healthCode = parseInt(booleanNumber, 2);
    const expectedHealthCode = parseInt('1'.repeat(health.length), 2);

    const healthScore = `${health.length}.${healthCode}`;

    return {
      statusCode: healthCode === expectedHealthCode ? 200 : 503,
      healthScore: parseFloat(healthScore),
      failedServices: health.filter((s) => s.serviceStatus === 0).map((s) => s.serviceName),
    };
  }

  private async checkMySQL(): Promise<number> {
    try {
      if (this.sqlDbDataSource.isInitialized) {
        await this.sqlDbDataSource.query('SELECT 1');
        return 1;
      }
      return 0;
    } catch (error) {
      ConsoleLogger.error('MySQL Health Check Error:', error);
      return 0;
    }
  }

  // private async checkMongoDB(): Promise<number> {
  //   try {
  //     const isConnected = this.mongoConnection.isInitialized;
  //     return isConnected ? 1 : 0;
  //   } catch (error) {
  //     ConsoleLogger.error("MongoDB Health Check Error:", error);
  //     return 0;
  //   }
  // }

  private async checkRedis(): Promise<number> {
    try {
      await this.redisService.set('health_check', 'redis_ok', 1);
      const value = await this.redisService.get('health_check');
      return value === 'redis_ok' ? 1 : 0;
    } catch (error) {
      ConsoleLogger.error('Redis Health Check Error:', error);
      return 0;
    }
  }

  private async checkSwagger(): Promise<number> {
    try {
      const swaggerPath = this.appConfigService.get('SWAGGER_PATH') || 'docs';
      const baseUrl = `http://localhost:${this.appConfigService.getPort()}`;
      const swaggerUrl = `${baseUrl}/${swaggerPath}`;
      const response = await lastValueFrom(this.httpService.get(swaggerUrl, { timeout: 2000 }));
      return response.status === 200 ? 1 : 0;
    } catch (error) {
      ConsoleLogger.error('Swagger Health Check Error:', error.message);
      return 0;
    }
  }
}
