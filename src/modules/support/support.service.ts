import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TransactionService } from 'src/default/databases/transaction';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';
import { SupportRepository } from './repository/support.repository';
import { SupportTicketStatus } from './enum/support-ticket-status.enum';
import {
  AdminListSupportTicketsQueryDto,
  AdminUpdateSupportTicketDto,
  CreateSupportTicketDto,
  ListSupportTicketsQueryDto,
} from './dto';

@Injectable()
export class SupportService {
  constructor(
    private readonly repository: SupportRepository,
    private readonly transactionService: TransactionService
  ) {}

  async create(userId: string, dto: CreateSupportTicketDto) {
    const tag = 'SupportService.create';
    ConsoleLogger.log('SUPPORT_TICKET_CREATE_START', { tag, data: { userId, issueType: dto.issueType } });

    try {
      const result = await this.transactionService.execute(async (manager) => {
        const ticketNo = await this.generateUniqueTicketNo(manager);

        const ticket = await this.repository.saveTicket(
          {
            ticket_no: ticketNo,
            user_id: userId,
            issue_type: dto.issueType,
            description: dto.description,
            status: SupportTicketStatus.OPEN,
          },
          manager
        );

        if (dto.images?.length) {
          await this.repository.saveAttachments(
            dto.images.map((url) => ({ ticket_id: String(ticket.id), url })),
            manager
          );
        }

        return ticket;
      });

      ConsoleLogger.log('SUPPORT_TICKET_CREATE_SUCCESS', { tag, data: { ticketNo: result.ticket_no } });
      return this.detailFor(String(result.id), Number(userId));
    } catch (error) {
      ConsoleLogger.error('SUPPORT_TICKET_CREATE_FAILED', error?.stack || error, tag);
      throw error;
    }
  }

  async listMine(userId: string, query: ListSupportTicketsQueryDto) {
    const { items, total } = await this.repository.findTickets(
      {
        userId: Number(userId),
        status: query.status,
        issueType: query.issueType,
        fromDate: query.fromDate,
        toDate: query.toDate,
      },
      query.page,
      query.limit
    );
    return {
      items,
      pagination: new AddressPaginationDTO(total, Math.ceil(total / query.limit), query.page, query.limit),
    };
  }

  async issueTypes() {
    const rows = await this.repository.findActiveIssueTypes();
    return rows.map((row) => ({ code: row.code, label: row.label }));
  }

  async summaryMine(userId: string) {
    return this.repository.countByStatusForUser(Number(userId));
  }

  async detailMine(userId: string, id: string) {
    return this.detailFor(id, Number(userId));
  }

  async adminList(query: AdminListSupportTicketsQueryDto) {
    const { items, total } = await this.repository.findTickets(
      {
        userId: query.userId,
        status: query.status,
        issueType: query.issueType,
        fromDate: query.fromDate,
        toDate: query.toDate,
      },
      query.page,
      query.limit
    );
    return {
      items,
      pagination: new AddressPaginationDTO(total, Math.ceil(total / query.limit), query.page, query.limit),
    };
  }

  async adminDetail(id: string) {
    return this.detailFor(id);
  }

  async adminUpdate(adminId: string, id: string, dto: AdminUpdateSupportTicketDto) {
    const tag = 'SupportService.adminUpdate';
    ConsoleLogger.log('SUPPORT_TICKET_UPDATE_START', { tag, data: { adminId, id, ...dto } });

    if (dto.status === SupportTicketStatus.RESOLVED && !dto.remarks?.trim()) {
      throw new BusinessException(ERROR_CODES.SUPPORT.RESOLUTION_REMARKS_REQUIRED);
    }

    try {
      await this.transactionService.execute(async (manager) => {
        const ticket = await this.repository.findTicketForUpdate(id, manager);
        if (!ticket) {
          throw new BusinessException(ERROR_CODES.SUPPORT.TICKET_NOT_FOUND);
        }

        await this.repository.updateTicket(
          id,
          {
            status: dto.status,
            resolution_remarks: dto.remarks ?? ticket.resolution_remarks,
            updated_by: adminId,
          },
          manager
        );
      });

      ConsoleLogger.log('SUPPORT_TICKET_UPDATE_SUCCESS', { tag, data: { id, status: dto.status } });
      return this.detailFor(id);
    } catch (error) {
      ConsoleLogger.error('SUPPORT_TICKET_UPDATE_FAILED', error?.stack || error, tag);
      throw error;
    }
  }

  private async detailFor(id: string, userId?: number) {
    const ticket = await this.repository.findTicketById(id, userId);
    if (!ticket) {
      throw new BusinessException(ERROR_CODES.SUPPORT.TICKET_NOT_FOUND);
    }
    return ticket;
  }

  private async generateUniqueTicketNo(manager: EntityManager): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `TKT-${String(Math.floor(100000 + Math.random() * 900000))}`;
      const existing = await this.repository.findExistingByTicketNo(candidate, manager);
      if (!existing) {
        return candidate;
      }
    }
    throw new BusinessException(ERROR_CODES.COMMON.SOMETHING_WENT_WRONG);
  }
}
