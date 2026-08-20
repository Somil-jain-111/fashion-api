import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { ApprovalRepository } from 'src/modules/approvals/repository';
import { UserRepository, RolesRepository } from 'src/modules/auth/repository';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserStatus } from '../auth/constants/auth.constants';
import {
  ApprovalAction,
  ApprovalStatus,
  ApprovalType,
} from 'src/default/common/enums/approvals.enum';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { User } from '../auth/entities/users.entity';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { TransactionService } from 'src/default/databases/transaction';
import { ApprovalRejectionOptions } from 'src/default/common/constants/approval-rejection.option';
import { KycService } from '../kyc/kyc.service';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly approvalRepository: ApprovalRepository,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RolesRepository,
    private readonly transactionUtils: TransactionService,
    private readonly kycService: KycService
  ) {}

  async handleApprovalAction(
    approverId: number,
    approvalId: number,
    action: ApprovalAction,
    rejectReasonType: string,
    remarks?: string
  ) {
    const approver = await this.userRepository.findOne({ id: approverId }, ['role']);

    if (!approver) {
      throw new BusinessException(ERROR_CODES.APPROVAL.APPROVER_NOT_FOUND);
    }

    return this.transactionUtils.runInTransaction(async (queryRunner: QueryRunner) => {
      // Pessimistic lock on the approval row so a concurrent action on the
      // same approvalId blocks until this transaction commits/rolls back,
      // and then sees the already-updated status.
      const approval = await this.approvalRepository.findByIdForUpdate(approvalId, queryRunner);

      if (!approval) {
        throw new BusinessException(ERROR_CODES.APPROVAL.APPROVAL_NOT_FOUND);
      }

      if (approval.status !== ApprovalStatus.PENDING) {
        throw new BusinessException(ERROR_CODES.APPROVAL.ALREADY_PROCESSED);
      }

      const targetUser = await this.userRepository.findOne(
        { id: approval.user.id },
        ['role'],
        queryRunner
      );

      if (!targetUser) {
        throw new BusinessException(ERROR_CODES.APPROVAL.TARGET_USER_NOT_FOUND);
      }

      // Role check depending on level:
      // Level 1: L1 approval (role: l1 or superAdmin)
      // Level 2: L2 approval (role: l2 or superAdmin)
      // Level 3: Sales Officer approval (role: sales_person or superAdmin)
      const approverRole = approver.role?.name;
      const isSuperAdmin = approverRole === UserRole.SUPERADMIN;

      if (approval.level === 1) {
        if (approverRole !== UserRole.L1 && approverRole !== UserRole.L2 && !isSuperAdmin) {
          throw new BusinessException(ERROR_CODES.APPROVAL.L1_ONLY);
        }
      } else if (approval.level === 2) {
        if (approverRole !== UserRole.L2 && !isSuperAdmin) {
          throw new BusinessException(ERROR_CODES.APPROVAL.L2_ONLY);
        }
      } else if (approval.level === 3) {
        if (approverRole !== UserRole.SALESPERSON && !isSuperAdmin) {
          throw new BusinessException(ERROR_CODES.APPROVAL.L3_ONLY);
        }
      } else {
        throw new BusinessException(ERROR_CODES.APPROVAL.INVALID_LEVEL);
      }

      if (action === ApprovalAction.BLOCK) {
        // Only L2 & SuperAdmin can block permanent block user
        if (approverRole !== UserRole.L2 && !isSuperAdmin) {
          throw new BusinessException(ERROR_CODES.APPROVAL.L2_ONLY);
        }

        if (!rejectReasonType) {
          throw new BusinessException(ERROR_CODES.APPROVAL.REJECT_REASON_TYPE);
        }

        // Transition to BLOCKED
        await this.approvalRepository.updateById(
          approval.id,
          {
            status: ApprovalStatus.BLOCKED,
            actionBy: { id: approverId } as any,
            rejectReasonType: ApprovalRejectionOptions[rejectReasonType],
            actionAt: new Date(),
            remarks: remarks || 'Blocked in approval pipeline',
          },
          queryRunner
        );

        await this.userRepository.updateById(
          targetUser.id,
          {
            status: UserStatus.BLOCKED,
          },
          queryRunner
        );

        return {
          message: 'User profile has been blocked',
        };
      }

      if (action === ApprovalAction.REJECT) {
        // Transition to REJECTED
        if (!rejectReasonType) {
          throw new BusinessException(ERROR_CODES.APPROVAL.REJECT_REASON_TYPE);
        }

        await this.approvalRepository.updateById(
          approval.id,
          {
            status: ApprovalStatus.REJECTED,
            actionBy: { id: approverId } as any,
            rejectReasonType: ApprovalRejectionOptions[rejectReasonType],
            actionAt: new Date(),
            remarks: remarks || 'Rejected',
          },
          queryRunner
        );

        if (approval.level === 1) {
          // L1 Rejection: goes back to User to edit profile
          await this.userRepository.updateById(
            targetUser.id,
            {
              status: UserStatus.IN_APPROVAL,
            },
            queryRunner
          );
        } else if (approval.level === 2) {
          // L2 Rejection: pushes back to L1
          const l1Role = await this.roleRepository.findByName(UserRole.L1);
          let nextAssignee: User | null = null;
          if (l1Role) {
            const l1Users = await this.userRepository.findMany(
              {
                where: { role: { id: l1Role.id } },
              },
              queryRunner
            );
            if (l1Users.length > 0) nextAssignee = l1Users[0];
          }

          await this.approvalRepository.save(
            {
              user: { id: targetUser.id } as any,
              approval_type: ApprovalType.PROFILE,
              status: ApprovalStatus.PENDING,
              level: 1,
              assignedTo: nextAssignee ? ({ id: nextAssignee.id } as any) : null,
            },
            queryRunner
          );
        } else if (approval.level === 3) {
          // Sales Officer Rejection: pushes back to L2, moves user back to IN_APPROVAL status
          await this.userRepository.updateById(
            targetUser.id,
            {
              status: UserStatus.IN_APPROVAL,
            },
            queryRunner
          );

          const l2Role = await this.roleRepository.findByName(UserRole.L2);
          let nextAssignee: User | null = null;
          if (l2Role) {
            const l2Users = await this.userRepository.findMany(
              {
                where: { role: { id: l2Role.id } },
              },
              queryRunner
            );
            if (l2Users.length > 0) nextAssignee = l2Users[0];
          }

          await this.approvalRepository.save(
            {
              user: { id: targetUser.id } as any,
              approval_type: ApprovalType.PROFILE,
              status: ApprovalStatus.PENDING,
              level: 2,
              assignedTo: nextAssignee ? ({ id: nextAssignee.id } as any) : null,
            },
            queryRunner
          );
        }

        return {
          message: 'Approval request rejected successfully',
        };
      }

      if (action === ApprovalAction.APPROVE) {
        // Transition to APPROVED
        await this.approvalRepository.updateById(
          approval.id,
          {
            status: ApprovalStatus.APPROVED,
            actionBy: { id: approverId } as any,
            actionAt: new Date(),
            remarks: remarks || 'Approved',
          },
          queryRunner
        );

        if (approval.level === 1) {
          // L1 approved -> goes to L2
          const l2Role = await this.roleRepository.findByName(UserRole.L2);
          let nextAssignee: User | null = null;
          if (l2Role) {
            const l2Users = await this.userRepository.findMany(
              {
                where: { role: { id: l2Role.id } },
              },
              queryRunner
            );
            if (l2Users.length > 0) nextAssignee = l2Users[0];
          }

          await this.approvalRepository.save(
            {
              user: { id: targetUser.id } as any,
              approval_type: ApprovalType.PROFILE,
              status: ApprovalStatus.PENDING,
              level: 2,
              assignedTo: nextAssignee ? ({ id: nextAssignee.id } as any) : null,
            },
            queryRunner
          );

          return {
            message: 'Level 1 approved. Forwarded to Level 2.',
          };
        } else if (approval.level === 2) {
          // L2 approved -> moves to PARTIAL_APPROVED -> goes to Sales Officer (Level 3)
          await this.userRepository.updateById(
            targetUser.id,
            {
              status: UserStatus.PARTIAL_APPROVED,
            },
            queryRunner
          );

          const salesRole = await this.roleRepository.findByName(UserRole.SALESPERSON);
          let nextAssignee: User | null = null;
          if (salesRole) {
            const salesUsers = await this.userRepository.findMany(
              {
                where: { role: { id: salesRole.id } },
              },
              queryRunner
            );
            if (salesUsers.length > 0) nextAssignee = salesUsers[0];
          }

          await this.approvalRepository.save(
            {
              user: { id: targetUser.id } as any,
              approval_type: ApprovalType.PROFILE,
              status: ApprovalStatus.PENDING,
              level: 3,
              assignedTo: nextAssignee ? ({ id: nextAssignee.id } as any) : null,
            },
            queryRunner
          );

          return {
            message:
              'Level 2 approved. Status is now PARTIAL_APPROVED. Forwarded to Sales Officer.',
          };
        } else if (approval.level === 3) {
          // Sales Officer approved -> moves to ACTIVE
          await this.userRepository.updateById(
            targetUser.id,
            {
              status: UserStatus.ACTIVE,
            },
            queryRunner
          );

          return {
            message: 'User profile approved fully. Status is now ACTIVE.',
          };
        }
      }
    });
  }

  async getApprovalQueue(
    approverId: number,
    approverRole: UserRole,
    statusFilter?: ApprovalStatus,
    page: number = 1,
    limit: number = 10,
    approvalId?: number
  ) {
    const level =
      approverRole === UserRole.L1
        ? 1
        : approverRole === UserRole.L2
          ? 2
          : approverRole === UserRole.SALESPERSON
            ? 3
            : null;

    if (level === null && approverRole !== UserRole.SUPERADMIN) {
      throw new BusinessException(ERROR_CODES.APPROVAL.INVALID_LEVEL);
    }

    const listQuery = this.approvalRepository
      .getRepository()
      .createQueryBuilder('approval')
      .leftJoinAndSelect('approval.user', 'user')
      .leftJoinAndSelect('user.storeInformation', 'storeInformation')
      .leftJoinAndSelect('user.kyc', 'kyc')
      .leftJoinAndSelect('user.userBeneficiaries', 'userBeneficiaries')
      .leftJoinAndSelect('approval.assignedTo', 'assignedTo')
      .leftJoinAndSelect('approval.actionBy', 'actionBy')
      .where('approval.approval_type = :type', { type: ApprovalType.PROFILE });

    if (approvalId) {
      listQuery.andWhere('approval.id = :approvalId', { approvalId });
    }

    if (approverRole === UserRole.L2) {
      listQuery.andWhere(
        '((approval.assigned_to = :approverId AND approval.level = 2) OR (approval.level = 1 AND approval.status IN (:...l1Statuses)))',
        { approverId, l1Statuses: [ApprovalStatus.PENDING, ApprovalStatus.REJECTED] }
      );
    } else if (approverRole !== UserRole.SUPERADMIN) {
      listQuery
        .andWhere('approval.assigned_to = :approverId', { approverId })
        .andWhere('approval.level = :level', { level });
    }

    if (statusFilter) {
      listQuery.andWhere('approval.status = :status', { status: statusFilter });
    }

    const offset = (page - 1) * limit;

    listQuery.orderBy('approval.id', 'DESC').skip(offset).take(limit);

    const [approvals, total] = await listQuery.getManyAndCount();

    const isDetailView = Boolean(approvalId);

    const list = approvals.map((approval) => {
      const retailer = isDetailView
        ? {
            id: approval?.user?.id,
            uuid: approval?.user?.uuid ?? null,
            applicationId: approval?.user?.applicationId ?? null,
            salutation: approval?.user?.salutation ?? null,
            name: approval?.user?.username ?? null,
            mobile: approval?.user?.mobile ?? null,
            whatsappNumber: approval?.user?.whatsappNumber ?? null,
            whatsappVerified: approval?.user?.whatsappVerified ?? false,
            email: approval?.user?.email ?? null,
            emailVerified: approval?.user?.emailVerified ?? false,
            firmName: approval?.user?.firmName ?? null,
            privateName: approval?.user?.privateName ?? null,
            partnerType: approval?.user?.partnerType ?? null,
            code: approval?.user?.code ?? null,
            status: approval?.user?.status,
            imageUrl: approval?.user?.image_url ?? null,
            dateOfBirth: approval?.user?.date_of_birth ?? null,
            anniversaryDate: approval?.user?.anniversary_date ?? null,
            referralCode: approval?.user?.refferal_code ?? null,
            points: approval?.user?.points ? Number(approval?.user?.points) : 0,
            createdAt: approval?.user?.createdAt
              ? new Date(approval?.user?.createdAt).toISOString()
              : null,
          }
        : {
            id: approval?.user?.id,
            name: approval?.user?.username ?? null,
            mobile: approval?.user?.mobile ?? null,
            status: approval?.user?.status,
            partnerType: approval?.user?.partnerType ?? null,
          };

      const storeInfo = approval?.user?.storeInformation
        ? isDetailView
          ? {
              id: approval?.user?.storeInformation.id,
              address: approval?.user?.storeInformation.address1,
              address1: approval?.user?.storeInformation.address1,
              address2: approval?.user?.storeInformation.address2 ?? null,
              city: approval?.user?.storeInformation.city,
              state: approval?.user?.storeInformation.state,
              pincode: approval?.user?.storeInformation.pincode,
              lat: approval?.user?.storeInformation.lat,
              lng: approval?.user?.storeInformation.lng,
              storeFrontFacadeImageUrl:
                approval?.user?.storeInformation.storeFrontFacadeImageUrl ?? null,
              storeDisplayImageUrl: approval?.user?.storeInformation.storeDisplayImageUrl ?? null,
              addressProofType: approval?.user?.storeInformation.addressProofType ?? null,
              addressProofImageUrl: approval?.user?.storeInformation.addressProofImageUrl ?? null,
              createdAt: approval?.user?.storeInformation.createdAt
                ? new Date(approval?.user?.storeInformation.createdAt).toISOString()
                : null,
            }
          : {
              address: approval?.user?.storeInformation.address1,
              city: approval?.user?.storeInformation.city,
              pincode: approval?.user?.storeInformation.pincode,
              lat: approval?.user?.storeInformation.lat,
              lng: approval?.user?.storeInformation.lng,
            }
        : null;

      const kycInformation = isDetailView
        ? {
            verifications: (approval?.user?.kyc || []).map((k: any) => ({
              id: k?.id,
              type: k?.type,
              status: k?.status,
              referenceId: k?.referenceId ?? null,
              documentNumber: k?.documentNumber
                ? this.kycService.decryptKycData(k?.documentNumber)
                : null,
              maskedDocumentNumber: k?.maskedDocumentNumber ?? null,
              verifiedName: k?.verifiedName
                ? this.kycService.decryptKycData(k?.verifiedName)
                : null,
              provider: k?.provider ?? null,
              failureReason: k?.failureReason ?? null,
              metadata: k?.metadata ? this.kycService.decryptKycData(k?.metadata) : null,
              createdAt: k?.createdAt ? new Date(k?.createdAt).toISOString() : null,
            })),
            beneficiaries: (approval?.user?.userBeneficiaries || []).map((b: any) => ({
              id: b?.id,
              type: b.type,
              accountNumber: b?.accountNumber
                ? this.kycService.decryptKycData(b?.accountNumber)
                : null,
              ifsc: b?.ifsc ? this.kycService.decryptKycData(b?.ifsc) : null,
              bankName: b?.bankName ? this.kycService.decryptKycData(b?.bankName) : null,
              bankHolderName: b?.bankHolderName
                ? this.kycService.decryptKycData(b?.bankHolderName)
                : null,
              upi: b?.upi ? this.kycService.decryptKycData(b?.upi) : null,
              status: b?.status,
              referenceId: b?.referenceId ?? null,
              createdAt: b?.createdAt ? new Date(b?.createdAt).toISOString() : null,
            })),
          }
        : undefined;

      return {
        approvalId: approval?.id,
        level: approval?.level,
        status: approval?.status,
        remarks: approval?.remarks ?? null,
        actionAt: approval?.actionAt ? new Date(approval?.actionAt).toISOString() : null,
        assignedTo: approval?.assignedTo
          ? {
              id: approval?.assignedTo?.id,
              name: approval?.assignedTo?.username ?? null,
              mobile: approval?.assignedTo?.mobile ?? null,
            }
          : null,
        actionBy: approval?.actionBy
          ? {
              id: approval?.actionBy?.id,
              name: approval?.actionBy?.username ?? null,
              mobile: approval?.actionBy?.mobile ?? null,
            }
          : null,
        retailer,
        storeInfo,
        ...(isDetailView && { kycInformation }),
      };
    });

    return {
      list,
      pagination: CommonUtils.generatePaginationResponse(total, page, limit),
    };
  }

  async getApprovalAnalytics(approverId: number, approverRole: UserRole) {
    const level = approverRole === UserRole.L1 ? 1 : approverRole === UserRole.L2 ? 2 : null;

    if (level === null && approverRole !== UserRole.SUPERADMIN) {
      throw new BusinessException(ERROR_CODES.APPROVAL.INVALID_LEVEL);
    }

    const query = this.approvalRepository
      .getRepository()
      .createQueryBuilder('approval')
      .where('approval.approval_type = :type', { type: ApprovalType.PROFILE });

    if (approverRole !== UserRole.SUPERADMIN) {
      query
        .andWhere('approval.assigned_to = :approverId', { approverId })
        .andWhere('approval.level = :level', { level });
    }

    const all = await query.getMany();

    return {
      total: all.length,
      pending: all.filter((a) => a.status === ApprovalStatus.PENDING).length,
      approved: all.filter((a) => a.status === ApprovalStatus.APPROVED).length,
      rejected: all.filter((a) => a.status === ApprovalStatus.REJECTED).length,
      blocked: all.filter((a) => a.status === ApprovalStatus.BLOCKED).length,
    };
  }

  async getRejectionOptions() {
    return ApprovalRejectionOptions;
  }
}
