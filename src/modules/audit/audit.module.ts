import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLogRepository } from './repository/audit-log.repository';

@Module({
  providers: [AuditService, AuditLogRepository],
  exports: [AuditService],
})
export class AuditModule {}
