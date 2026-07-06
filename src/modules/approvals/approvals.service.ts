import { Injectable } from '@nestjs/common';
import {
  ApprovalRepository,
  UserRepository,
  RolesRepository,
} from 'src/default/common/repositories';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserStatus } from '../auth/constants/auth.constants';
import { ApprovalStatus, ApprovalType } from 'src/default/common/enums/approvals.enum';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { User } from '../auth/entities/users.entity';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly approvalRepository: ApprovalRepository,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RolesRepository
  ) {}

  async handleApprovalAction(
    approverId: number,
    approvalId: number,
    action: 'approve' | 'reject' | 'block',
    remarks?: string
  ) {
    const approver = await this.userRepository.findOne({ id: approverId }, ['role']);

    if (!approver) {
      throw new BusinessException(ERROR_CODES.APPROVAL.APPROVER_NOT_FOUND);
    }

    const approval = await this.approvalRepository.findOne({ id: approvalId }, ['user']);

    if (!approval) {
      throw new BusinessException(ERROR_CODES.APPROVAL.APPROVAL_NOT_FOUND);
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BusinessException(ERROR_CODES.APPROVAL.ALREADY_PROCESSED);
    }

    const targetUser = await this.userRepository.findOne({ id: approval.user.id }, ['role']);
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
      if (approverRole !== UserRole.L1 && !isSuperAdmin) {
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

    if (action === 'block') {
      // Transition to BLOCKED
      await this.approvalRepository.updateById(approval.id, {
        status: ApprovalStatus.BLOCKED,
        approved_by: { id: approverId } as any,
        approved_at: new Date(),
        remarks: remarks || 'Blocked in approval pipeline',
      });

      await this.userRepository.updateById(targetUser.id, {
        status: UserStatus.BLOCKED,
      });

      return {
        message: 'User profile has been blocked',
      };
    }

    if (action === 'reject') {
      // Transition to REJECTED
      await this.approvalRepository.updateById(approval.id, {
        status: ApprovalStatus.REJECTED,
        approved_by: { id: approverId } as any,
        approved_at: new Date(),
        remarks: remarks || 'Rejected',
      });

      if (approval.level === 1) {
        // L1 Rejection: goes back to User to edit profile
        await this.userRepository.updateById(targetUser.id, {
          status: UserStatus.INACTIVE,
        });
      } else if (approval.level === 2) {
        // L2 Rejection: pushes back to L1
        const l1Role = await this.roleRepository.findByName(UserRole.L1);
        let nextAssignee: User | null = null;
        if (l1Role) {
          const l1Users = await this.userRepository.findMany({
            where: { role: { id: l1Role.id } },
          });
          if (l1Users.length > 0) nextAssignee = l1Users[0];
        }

        await this.approvalRepository.save({
          user: { id: targetUser.id } as any,
          approval_type: ApprovalType.PROFILE,
          status: ApprovalStatus.PENDING,
          level: 1,
          assignedTo: nextAssignee ? ({ id: nextAssignee.id } as any) : null,
        });
      } else if (approval.level === 3) {
        // Sales Officer Rejection: pushes back to L2, moves user back to IN_APPROVAL status
        await this.userRepository.updateById(targetUser.id, {
          status: UserStatus.IN_APPROVAL,
        });

        const l2Role = await this.roleRepository.findByName(UserRole.L2);
        let nextAssignee: User | null = null;
        if (l2Role) {
          const l2Users = await this.userRepository.findMany({
            where: { role: { id: l2Role.id } },
          });
          if (l2Users.length > 0) nextAssignee = l2Users[0];
        }

        await this.approvalRepository.save({
          user: { id: targetUser.id } as any,
          approval_type: ApprovalType.PROFILE,
          status: ApprovalStatus.PENDING,
          level: 2,
          assignedTo: nextAssignee ? ({ id: nextAssignee.id } as any) : null,
        });
      }

      return {
        message: 'Approval request rejected successfully',
      };
    }

    if (action === 'approve') {
      // Transition to APPROVED
      await this.approvalRepository.updateById(approval.id, {
        status: ApprovalStatus.APPROVED,
        approved_by: { id: approverId } as any,
        approved_at: new Date(),
        remarks: remarks || 'Approved',
      });

      if (approval.level === 1) {
        // L1 approved -> goes to L2
        const l2Role = await this.roleRepository.findByName(UserRole.L2);
        let nextAssignee: User | null = null;
        if (l2Role) {
          const l2Users = await this.userRepository.findMany({
            where: { role: { id: l2Role.id } },
          });
          if (l2Users.length > 0) nextAssignee = l2Users[0];
        }

        await this.approvalRepository.save({
          user: { id: targetUser.id } as any,
          approval_type: ApprovalType.PROFILE,
          status: ApprovalStatus.PENDING,
          level: 2,
          assignedTo: nextAssignee ? ({ id: nextAssignee.id } as any) : null,
        });

        return {
          message: 'Level 1 approved. Forwarded to Level 2.',
        };
      } else if (approval.level === 2) {
        // L2 approved -> moves to PARTIAL_APPROVED -> goes to Sales Officer (Level 3)
        await this.userRepository.updateById(targetUser.id, {
          status: UserStatus.PARTIAL_APPROVED,
        });

        const salesRole = await this.roleRepository.findByName(UserRole.SALESPERSON);
        let nextAssignee: User | null = null;
        if (salesRole) {
          const salesUsers = await this.userRepository.findMany({
            where: { role: { id: salesRole.id } },
          });
          if (salesUsers.length > 0) nextAssignee = salesUsers[0];
        }

        await this.approvalRepository.save({
          user: { id: targetUser.id } as any,
          approval_type: ApprovalType.PROFILE,
          status: ApprovalStatus.PENDING,
          level: 3,
          assignedTo: nextAssignee ? ({ id: nextAssignee.id } as any) : null,
        });

        return {
          message: 'Level 2 approved. Status is now PARTIAL_APPROVED. Forwarded to Sales Officer.',
        };
      } else if (approval.level === 3) {
        // Sales Officer approved -> moves to ACTIVE
        await this.userRepository.updateById(targetUser.id, {
          status: UserStatus.ACTIVE,
        });

        return {
          message: 'User profile approved fully. Status is now ACTIVE.',
        };
      }
    }
  }
}
