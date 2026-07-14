// import {
//   Injectable,
//   NotFoundException,
//   BadRequestException,
//   ConflictException,
// } from '@nestjs/common';
// import { RetailerApproval } from './entities/retailer-approval.entity';
// import { ApprovalLog } from './entities/approval-log.entity';
// import { User } from '../auth/entities';
// import { UserRole } from '../../default/common/enums/user-type.enum';
// import {
//   ApprovalStatus,
//   ApprovalLevel,
//   ApprovalActorRole,
//   ApprovalAction,
// } from './enums/approval-status.enum';
// import { L1ActionDto, L1ActionType, L2ActionDto, L2ActionType } from './dto/approval-action.dto';

// // Legal state transitions. Any action not represented here is rejected.
// // This table is the single source of truth for what is/isn't allowed.
// const TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
//   [ApprovalStatus.PENDING_L1]: [
//     ApprovalStatus.PENDING_L2,
//     ApprovalStatus.REWORK,
//     ApprovalStatus.TEMP_BLOCKED,
//   ],
//   [ApprovalStatus.PENDING_L2]: [
//     ApprovalStatus.APPROVED,
//     ApprovalStatus.REJECTED,
//     ApprovalStatus.REWORK,
//     ApprovalStatus.PERM_BLOCKED,
//   ],
//   [ApprovalStatus.REWORK]: [ApprovalStatus.PENDING_L1],
//   [ApprovalStatus.TEMP_BLOCKED]: [ApprovalStatus.PENDING_L1],
//   [ApprovalStatus.APPROVED]: [ApprovalStatus.REKYC_REQUIRED],
//   [ApprovalStatus.REKYC_REQUIRED]: [ApprovalStatus.PENDING_L1],
//   [ApprovalStatus.REJECTED]: [],
//   [ApprovalStatus.PERM_BLOCKED]: [],
// };

// const REDEMPTION_WINDOW_DAYS = 30;

// @Injectable()
// export class ApprovalService {
//   /**
//    * Resolves the active approver for a given role.
//    *
//    * TODAY: flat lookup — exactly one User has role L1 / L2.
//    * FUTURE: when pincode/city hierarchy data arrives from Campus, this is the
//    * ONLY function that changes (signature gains a pincode/city param and queries
//    * a hierarchy mapping table with fallback). Nothing else in this service,
//    * the controller, or the state machine needs to change.
//    */
//   async getApprover(role: UserRole.L1 | UserRole.L2): Promise<User> {
//     const approver = await User.createQueryBuilder('user')
//       .innerJoinAndSelect('user.role', 'role')
//       .where('role.name = :role', { role })
//       .getOne();

//     if (!approver) {
//       throw new NotFoundException(
//         `No active ${role.toUpperCase()} approver is configured. Please contact admin.`,
//       );
//     }
//     return approver;
//   }

//   /**
//    * Called by OnboardingService once the STORE step (final step) is submitted.
//    * Creates the RetailerApproval record and assigns L1 at submission time.
//    */
//   async createApprovalForOnboarding(userId: string, onboardingId: string): Promise<RetailerApproval> {
//     const existing = await RetailerApproval.findOne({ where: { user_id: userId } });
//     if (existing) {
//       throw new ConflictException('Approval record already exists for this retailer');
//     }

//     const l1 = await this.getApprover(UserRole.L1);

//     const approval = RetailerApproval.create({
//       user_id: userId,
//       onboarding_id: onboardingId,
//       l1_user_id: l1.id,
//       current_level: ApprovalLevel.L1,
//       status: ApprovalStatus.PENDING_L1,
//     });
//     await approval.save();

//     await this.writeLog(approval.id, {
//       actor_id: null,
//       actor_role: ApprovalActorRole.SYSTEM,
//       action: ApprovalAction.SUBMITTED,
//       comment: 'Retailer completed onboarding and entered L1 queue',
//     });

//     await this.mirrorToUser(userId, ApprovalStatus.PENDING_L1);

//     // earning is enabled from day one regardless of verification status
//     await User.update(userId, { /* earning_enabled_at */ } as any);

//     return approval;
//   }

//   private async getApprovalOrThrow(retailerUserId: string): Promise<RetailerApproval> {
//     const approval = await RetailerApproval.findOne({ where: { user_id: retailerUserId } });
//     if (!approval) {
//       throw new NotFoundException('No approval record found for this retailer');
//     }
//     return approval;
//   }

//   private assertTransition(from: ApprovalStatus, to: ApprovalStatus) {
//     const allowed = TRANSITIONS[from] || [];
//     if (!allowed.includes(to)) {
//       throw new BadRequestException(
//         `Illegal transition: cannot move from ${from} to ${to}`,
//       );
//     }
//   }

//   private async writeLog(
//     retailerApprovalId: string,
//     entry: {
//       actor_id: string | null;
//       actor_role: ApprovalActorRole;
//       action: ApprovalAction;
//       comment?: string;
//       rework_fields?: string[];
//       metadata?: Record<string, unknown>;
//     },
//   ) {
//     const log = ApprovalLog.create({
//       retailer_approval_id: retailerApprovalId,
//       actor_id: entry.actor_id,
//       actor_role: entry.actor_role,
//       action: entry.action,
//       comment: entry.comment ?? null,
//       rework_fields: entry.rework_fields ?? null,
//       metadata: entry.metadata ?? null,
//     });
//     await log.save();
//   }

//   private async mirrorToUser(userId: string, status: ApprovalStatus) {
//     await User.update(userId, { /* approval_status: status */ } as any);
//     // NOTE: approval_status column needs to be added to User entity by the
//     // team owning that module (see migration file — adds it via ALTER TABLE).
//   }

//   // ---------------- L1 ACTIONS ----------------

//   async actionByL1(actorId: string, dto: L1ActionDto): Promise<RetailerApproval> {
//     const approval = await this.getApprovalOrThrow(dto.retailer_user_id);

//     if (approval.l1_user_id !== actorId) {
//       throw new BadRequestException('This retailer is not assigned to you');
//     }

//     switch (dto.action) {
//       case L1ActionType.FORWARD_TO_L2: {
//         this.assertTransition(approval.status, ApprovalStatus.PENDING_L2);
//         const l2 = await this.getApprover(UserRole.L2);

//         approval.status = ApprovalStatus.PENDING_L2;
//         approval.current_level = ApprovalLevel.L2;
//         approval.l2_user_id = l2.id;
//         await approval.save();

//         await this.writeLog(approval.id, {
//           actor_id: actorId,
//           actor_role: ApprovalActorRole.L1,
//           action: ApprovalAction.L1_FORWARDED_L2,
//           comment: dto.comment,
//         });
//         await this.mirrorToUser(approval.user_id, ApprovalStatus.PENDING_L2);
//         break;
//       }

//       case L1ActionType.REWORK: {
//         this.assertTransition(approval.status, ApprovalStatus.REWORK);
//         if (!dto.rework_fields || dto.rework_fields.length === 0) {
//           throw new BadRequestException('rework_fields is required when requesting rework');
//         }

//         approval.status = ApprovalStatus.REWORK;
//         approval.rework_fields = dto.rework_fields;
//         approval.rework_comment = dto.comment ?? null;
//         await approval.save();

//         await this.writeLog(approval.id, {
//           actor_id: actorId,
//           actor_role: ApprovalActorRole.L1,
//           action: ApprovalAction.L1_REWORK,
//           comment: dto.comment,
//           rework_fields: dto.rework_fields,
//         });
//         await this.mirrorToUser(approval.user_id, ApprovalStatus.REWORK);
//         break;
//       }

//       case L1ActionType.TEMP_BLOCK: {
//         this.assertTransition(approval.status, ApprovalStatus.TEMP_BLOCKED);

//         approval.status = ApprovalStatus.TEMP_BLOCKED;
//         await approval.save();

//         await this.writeLog(approval.id, {
//           actor_id: actorId,
//           actor_role: ApprovalActorRole.L1,
//           action: ApprovalAction.L1_TEMP_BLOCKED,
//           comment: dto.comment,
//         });
//         await this.mirrorToUser(approval.user_id, ApprovalStatus.TEMP_BLOCKED);
//         break;
//       }

//       default:
//         throw new BadRequestException('Unknown L1 action');
//     }

//     return approval;
//   }

//   // ---------------- L2 ACTIONS ----------------

//   async actionByL2(actorId: string, dto: L2ActionDto): Promise<RetailerApproval> {
//     const approval = await this.getApprovalOrThrow(dto.retailer_user_id);

//     const isReopenFromTempBlock =
//       dto.action === L2ActionType.REOPEN && approval.status === ApprovalStatus.TEMP_BLOCKED;

//     if (!isReopenFromTempBlock && approval.l2_user_id !== actorId) {
//       throw new BadRequestException('This retailer is not assigned to you');
//     }

//     switch (dto.action) {
//       case L2ActionType.APPROVE: {
//         this.assertTransition(approval.status, ApprovalStatus.APPROVED);

//         const now = new Date();
//         approval.status = ApprovalStatus.APPROVED;
//         approval.activated_at = now;
//         await approval.save();

//         await this.writeLog(approval.id, {
//           actor_id: actorId,
//           actor_role: ApprovalActorRole.L2,
//           action: ApprovalAction.L2_APPROVED,
//           comment: dto.comment,
//         });

//         const redemptionEnabledAt = now; // verified -> immediate, no 30-day wait
//         await User.update(approval.user_id, {
//           /* approval_status, redemption_enabled_at: redemptionEnabledAt */
//         } as any);
//         break;
//       }

//       case L2ActionType.REJECT: {
//         this.assertTransition(approval.status, ApprovalStatus.REJECTED);
//         if (!dto.comment) {
//           throw new BadRequestException('comment is mandatory when rejecting');
//         }

//         approval.status = ApprovalStatus.REJECTED;
//         approval.rejection_comment = dto.comment;
//         await approval.save();

//         await this.writeLog(approval.id, {
//           actor_id: actorId,
//           actor_role: ApprovalActorRole.L2,
//           action: ApprovalAction.L2_REJECTED,
//           comment: dto.comment,
//         });
//         await this.mirrorToUser(approval.user_id, ApprovalStatus.REJECTED);
//         break;
//       }

//       case L2ActionType.REWORK: {
//         this.assertTransition(approval.status, ApprovalStatus.REWORK);
//         if (!dto.rework_fields || dto.rework_fields.length === 0) {
//           throw new BadRequestException('rework_fields is required when requesting rework');
//         }

//         approval.status = ApprovalStatus.REWORK;
//         approval.rework_fields = dto.rework_fields;
//         approval.rework_comment = dto.comment ?? null;
//         await approval.save();

//         await this.writeLog(approval.id, {
//           actor_id: actorId,
//           actor_role: ApprovalActorRole.L2,
//           action: ApprovalAction.L2_REWORK,
//           comment: dto.comment,
//           rework_fields: dto.rework_fields,
//         });
//         await this.mirrorToUser(approval.user_id, ApprovalStatus.REWORK);
//         break;
//       }

//       case L2ActionType.PERM_BLOCK: {
//         this.assertTransition(approval.status, ApprovalStatus.PERM_BLOCKED);

//         approval.status = ApprovalStatus.PERM_BLOCKED;
//         await approval.save();

//         await this.writeLog(approval.id, {
//           actor_id: actorId,
//           actor_role: ApprovalActorRole.L2,
//           action: ApprovalAction.L2_PERM_BLOCKED,
//           comment: dto.comment,
//         });
//         await this.mirrorToUser(approval.user_id, ApprovalStatus.PERM_BLOCKED);
//         break;
//       }

//       case L2ActionType.REOPEN: {
//         this.assertTransition(approval.status, ApprovalStatus.PENDING_L1);

//         approval.status = ApprovalStatus.PENDING_L1;
//         approval.current_level = ApprovalLevel.L1;
//         await approval.save();

//         await this.writeLog(approval.id, {
//           actor_id: actorId,
//           actor_role: ApprovalActorRole.L2,
//           action: ApprovalAction.L2_REOPENED,
//           comment: dto.comment,
//         });
//         await this.mirrorToUser(approval.user_id, ApprovalStatus.PENDING_L1);
//         break;
//       }

//       default:
//         throw new BadRequestException('Unknown L2 action');
//     }

//     return approval;
//   }

//   // ---------------- QUERIES ----------------

//   async getL1Queue(l1UserId: string) {
//     return RetailerApproval.find({
//       where: { l1_user_id: l1UserId, status: ApprovalStatus.PENDING_L1 },
//       relations: ['user', 'onboarding'],
//       order: { created_at: 'ASC' },
//     });
//   }

//   async getL2Queue(l2UserId: string) {
//     return RetailerApproval.find({
//       where: { l2_user_id: l2UserId, status: ApprovalStatus.PENDING_L2 },
//       relations: ['user', 'onboarding'],
//       order: { created_at: 'ASC' },
//     });
//   }

//   async getTimeline(retailerUserId: string) {
//     const approval = await this.getApprovalOrThrow(retailerUserId);
//     const logs = await ApprovalLog.find({
//       where: { retailer_approval_id: approval.id },
//       relations: ['actor'],
//       order: { created_at: 'ASC' },
//     });
//     return { approval, logs };
//   }
// }