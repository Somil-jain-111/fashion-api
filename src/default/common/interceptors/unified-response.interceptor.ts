import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConsoleLogger } from '../../logger/console/console.service';
import { DataSanitizer } from '../utils/sanitize.utils';
import { LocalStorageContextUtil } from '../utils/local-storage.util';
import { ContextType } from '../constants/context.option';
import { Reflector } from '@nestjs/core';

@Injectable()
export class UnifiedResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const customMessage = this.reflector.get<string>('responseMessage', context.getHandler());

    return next.handle().pipe(
      map((data) => {
        // Auth endpoints intentionally return newly-issued access/refresh tokens. Every
        // other controller gets the full defence-in-depth sensitive-field deny-list.
        const isAuthController = context.getClass().name === 'AuthController';
        const sanitizedData = isAuthController
          ? DataSanitizer.sanitizeData(data, [], ['password', 'otp'])
          : DataSanitizer.sanitizeData(data);
        return this.formatResponse(sanitizedData, context, customMessage);
      })
    );
  }

  private formatResponse(data: any, context: ExecutionContext, customMessage?: string): any {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const journeyId = LocalStorageContextUtil.get(ContextType.JOURNEY_ID);
    const currentUser = LocalStorageContextUtil.get(ContextType.CURRENT_USER);
    const message = customMessage || 'Request successful';
    response.status(process.env.MAINTANCE_MODE === 'true' ? 503 : 200);
    const formattedResponse = {
      status: true,
      code: 200,
      message,
      data,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
      sub: currentUser,
      journeyId,
    };

    ConsoleLogger.log(formattedResponse, `${request.method} - ${request.url}`);

    return DataSanitizer.stringifyResponseScalars(formattedResponse);
  }
}
