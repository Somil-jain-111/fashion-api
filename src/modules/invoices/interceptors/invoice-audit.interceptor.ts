import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { BusinessException } from 'src/default/error/business.exception';
import { ScanSource } from '../enum/invoice-scan-session.enum';
import {
  ScanAttemptType,
  ValidationOutcome,
} from '../enum/scan-attempt.enum';
import { InvoiceAuditService } from '../services/invoice-audit.service';

@Injectable()
export class InvoiceAuditInterceptor
  implements NestInterceptor
{
  constructor(
    private readonly auditService: InvoiceAuditService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request =
      context.switchToHttp().getRequest();

    const startedAt = Date.now();

    const appVersion =
      (request.headers?.['x-app-version'] as string) ||
      undefined;

    const routePath: string =
      request.route?.path ??
      request.originalUrl ??
      '';

    const httpMethod: string = request.method;

    const endpoint = `${httpMethod} ${routePath}`;

    const userId = request.user?.id
      ? String(request.user.id)
      : 'anonymous';

    const attemptType =
      this.resolveAttemptType(
        routePath,
        httpMethod,
        request.params,
      );

    const scanType =
      this.resolveScanType(routePath);

    const invoiceNumber: string | undefined =
      request.body?.invoiceNumber;

    const sessionId: string | undefined =
      request.params?.sessionId;

    const pairUids: string[] | undefined =
      request.body?.pairUids ??
      (request.body?.pairUid
        ? [request.body.pairUid]
        : request.params?.pairUid
        ? [request.params.pairUid]
        : undefined);

    const baseFields = {
      userId,
      appVersion,
      endpoint,
      httpMethod,
      attemptType,
      scanType,
      invoiceNumber,
      sessionId,
      pairUids,
    };

    return next.handle().pipe(
      tap(() => {
        void this.auditService.logAttempt({
          ...baseFields,
          outcome: ValidationOutcome.SUCCESS,
          metadata: {
            durationMs: Date.now() - startedAt,
          },
        });
      }),

      catchError((error) => {
        const {
          errorCode,
          errorMessage,
        } = this.extractErrorCode(error);

        void this.auditService.logAttempt({
          ...baseFields,
          outcome: ValidationOutcome.FAILED,
          errorCode,
          errorMessage,
          metadata: {
            durationMs: Date.now() - startedAt,
          },
        });

        return throwError(() => error);
      }),
    );
  }

  private extractErrorCode(
    error: unknown,
  ): {
    errorCode: string;
    errorMessage: string;
  } {
    if (error instanceof BusinessException) {
      const anyError = error as any;

      return {
        errorCode:
          anyError.errorCode ??
          anyError.code ??
          'BUSINESS_EXCEPTION',

        errorMessage:
          anyError.message ??
          'Business exception',
      };
    }

    return {
      errorCode: 'INTERNAL_ERROR',
      errorMessage:
        (error as Error)?.message ??
        'Unknown error',
    };
  }

  private resolveAttemptType(
    path: string,
    method: string,
    params:
      | Record<string, string>
      | undefined,
  ): ScanAttemptType {
    if (path.includes('validate')) {
      return ScanAttemptType.VALIDATE_INVOICE;
    }

    if (path.includes('session/start')) {
      return ScanAttemptType.SESSION_START;
    }

    if (path.includes('bulk-scan')) {
      return ScanAttemptType.BULK_SCAN;
    }

    if (path.endsWith('/scan')) {
      return ScanAttemptType.SINGLE_SCAN;
    }

    if (path.includes('submit')) {
      return ScanAttemptType.SESSION_SUBMIT;
    }

    if (path.includes('cancel')) {
      return ScanAttemptType.SESSION_CANCEL;
    }

    if (path.includes('history')) {
      return ScanAttemptType.HISTORY_VIEW;
    }

    if (
      method === 'DELETE' &&
      path.includes('pairs') &&
      params?.pairUid
    ) {
      return ScanAttemptType.REMOVE_SCAN;
    }

    if (
      method === 'DELETE' &&
      path.includes('pairs')
    ) {
      return ScanAttemptType.REMOVE_ALL_SCANS;
    }

    if (path.includes('pairs')) {
      return ScanAttemptType.SESSION_PAIRS_LIST;
    }

    return ScanAttemptType.SESSION_PROGRESS;
  }

  private resolveScanType(
    path: string,
  ): ScanSource | undefined {
    if (path.includes('bulk-scan')) {
      return ScanSource.BULK;
    }

    if (path.endsWith('/scan')) {
      return ScanSource.SINGLE;
    }

    return undefined;
  }
}