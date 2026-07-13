import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { IdempotencyService } from '../../idempotency/idempotency.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Check if the request payload is a duplicate
    const isDuplicate = await this.idempotencyService.checkDuplicateRequest({
      ...request.body,
      userId: request.user.uuid,
      role: request.user?.roles?.[0],
      path: request.route?.path || request.url,
    });

    if (isDuplicate) {
      throw new BusinessException(ERROR_CODES.COMMON.CONFLICT);
    }

    return next.handle();
  }
}
