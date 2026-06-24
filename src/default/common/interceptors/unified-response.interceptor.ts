import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ConsoleLogger } from "../../logger/console/console.service";
import { DataSanitizer } from "../utils/sanitize.utils";
import { LocalStorageContextUtil } from "../utils/local-storage.util";
import { ContextType } from "../constants/context.option";
import { Reflector } from "@nestjs/core";

@Injectable()
export class UnifiedResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const customMessage = this.reflector.get<string>(
      "responseMessage",
      context.getHandler(),
    );

    return next.handle().pipe(
      map((data) => {
        // Sanitize only the password for API responses
        const sanitizedData = DataSanitizer.sanitizeData(
          data,
          [],
          ["password"],
        );
        return this.formatResponse(sanitizedData, context, customMessage);
      }),
    );
  }

  private formatResponse(
    data: any,
    context: ExecutionContext,
    customMessage?: string,
  ): any {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const journeyId = LocalStorageContextUtil.get(ContextType.JOURNEY_ID);
    const currentUser = LocalStorageContextUtil.get(ContextType.CURRENT_USER);
    const message = customMessage || "Request successful";
    response.status(process.env.MAINTANCE_MODE === "true" ? 503 : 200);
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

    return formattedResponse;
  }
}
