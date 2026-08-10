import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

import { ApprovalsService } from '../approvals/approvals.service';
import { SoVerifyOutletDto, SoRejectOutletDto } from './dto/so-verify.dto';
import { SoVerificationStatus, SoRejectionReason } from './entities/so-verification.entity';
import {
  ApprovalAction,
  ApprovalStatus,
  ApprovalType,
} from 'src/default/common/enums/approvals.enum';
import { UserStatus } from '../auth/constants/auth.constants';
import { SoVerificationRepository } from './so-verification.repository';
import { ApprovalRepository } from '../approvals/repository';
import { DynamicConfigRepository } from '../dynamic-config/repository';
import { UserRepository } from '../auth/repository';
import { UserRole } from 'src/default/common/enums/user-type.enum';

// Default radius in meters. Overridden by ApplicationConfig if set.
const DEFAULT_GEOFENCE_RADIUS_METERS = 200;

// Key stored in application_config.settings JSON for the configurable radius.
// Admin updates this value via the config panel — no code deploy needed.
const GEOFENCE_CONFIG_KEY = 'so_geofence_radius_meters';

@Injectable()
export class SoVerificationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly approvalRepository: ApprovalRepository,
    private readonly soVerificationRepository: SoVerificationRepository,
    private readonly dynamicConfigRepository: DynamicConfigRepository,
    private readonly approvalsService: ApprovalsService
  ) {}

  // ─────────────────────────────────────────────
  // Geo-fence helpers
  // ─────────────────────────────────────────────

  /**
   * Haversine formula — returns distance in meters between two lat/lng points.
   * Pure calculation, no external dependency.
   */
  private calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Reads configured radius from ApplicationConfig.
   * Falls back to DEFAULT_GEOFENCE_RADIUS_METERS if not set.
   * This is the only place the radius value is read — change it once, affects all.
   */
  private async getGeofenceRadiusMeters(): Promise<number> {
    try {
      const config = await this.dynamicConfigRepository.getApplicationConfig();
      const radius = config?.settings?.[GEOFENCE_CONFIG_KEY];
      return typeof radius === 'number' && radius > 0 ? radius : DEFAULT_GEOFENCE_RADIUS_METERS;
    } catch {
      return DEFAULT_GEOFENCE_RADIUS_METERS;
    }
  }

  /**
   * Validates that the SO's current location is within the configured
   * radius of the retailer's registered store location.
   * Returns distance in meters (stored for audit regardless of outcome).
   */
  async validateGeofence(
    soLat: number,
    soLng: number,
    storeLat: number,
    storeLng: number
  ): Promise<{ distanceMeters: number; withinRange: boolean; allowedRadiusMeters: number }> {
    const distanceMeters = this.calculateDistanceMeters(soLat, soLng, storeLat, storeLng);
    const allowedRadiusMeters = await this.getGeofenceRadiusMeters();
    return {
      distanceMeters,
      withinRange: distanceMeters <= allowedRadiusMeters,
      allowedRadiusMeters,
    };
  }

  // ─────────────────────────────────────────────
  // SO Queue
  // ─────────────────────────────────────────────

  /**
   * Returns the SO's queue — all level-3 PENDING approvals assigned to them.
   * Groups counts for the dashboard analytics (total, completed, pending, rejected).
   */
  async getQueue(
    soUserId: number,
    soLat?: number,
    soLng?: number,
    statusFilter?: string,
    soRole?: UserRole
  ) {
    const where: Record<string, any> = {
      approval_type: ApprovalType.PROFILE,
      level: 3,
    };

    // SUPERADMIN sees the full level-3 queue, not just approvals assigned to them —
    // mirrors ApprovalsService.getApprovalQueue's SUPERADMIN bypass.
    if (soRole !== UserRole.SUPERADMIN) {
      where.assignedTo = { id: soUserId } as any;
    }

    const allAssigned = await this.approvalRepository.findMany({
      where,
      relations: ['user', 'user.storeInformation'],
    });

    const pending = allAssigned.filter((a) => a.status === ApprovalStatus.PENDING);
    const completed = allAssigned.filter((a) => a.status === ApprovalStatus.APPROVED);
    const rejected = allAssigned.filter((a) => a.status === ApprovalStatus.REJECTED);
    const blocked = allAssigned.filter((a) => a.status === ApprovalStatus.BLOCKED);

    // ---- Route map — filter by status if provided, else return all ----
    const routeMapSource = statusFilter
      ? allAssigned.filter((a) => a.status === statusFilter)
      : allAssigned;

    const routeMap = routeMapSource.map((approval) => ({
      approvalId: approval.id,
      retailerUserId: approval.user.id,
      storeName: approval.user.storeInformation?.address1 ?? null,
      storeLat: approval.user.storeInformation?.lat ?? null,
      storeLng: approval.user.storeInformation?.lng ?? null,
      storeCity: approval.user.storeInformation?.city ?? null,
      storePincode: approval.user.storeInformation?.pincode ?? null,
      storeInfoMissing: !approval.user.storeInformation,
      approvalStatus: approval.status,
    }));

    // ---- Pending outlets ----
    const pendingOutlets = pending.map((approval) => ({
      approvalId: approval.id,
      retailerUserId: approval.user.id,
      storeName: approval.user.storeInformation?.address1 ?? null,
      storeLat: approval.user.storeInformation?.lat ?? null,
      storeLng: approval.user.storeInformation?.lng ?? null,
      storeCity: approval.user.storeInformation?.city ?? null,
      storePincode: approval.user.storeInformation?.pincode ?? null,
      storeInfoMissing: !approval.user.storeInformation,
    }));

    // ---- Nearby retailers — pending only, sorted by distance ----
    let nearbyRetailers: any[] | null = null;

    if (soLat !== undefined && soLng !== undefined) {
      nearbyRetailers = pending
        .filter((a) => a.user.storeInformation?.lat && a.user.storeInformation?.lng)
        .map((approval) => {
          const store = approval.user.storeInformation!;
          const distanceMeters = this.calculateDistanceMeters(
            soLat,
            soLng,
            Number(store.lat),
            Number(store.lng)
          );
          return {
            approvalId: approval.id,
            retailerUserId: approval.user.id,
            storeName: store.address1 ?? null,
            storeLat: store.lat,
            storeLng: store.lng,
            storeCity: store.city ?? null,
            storePincode: store.pincode ?? null,
            distanceMeters: Math.round(distanceMeters),
            distanceLabel: this.formatDistance(distanceMeters),
          };
        })
        .sort((a, b) => a.distanceMeters - b.distanceMeters);
    }

    return {
      analytics: {
        totalAssigned: allAssigned.length,
        pending: pending.length,
        completed: completed.length,
        rejected: rejected.length,
        blocked: blocked.length,
      },
      routeMap,
      pendingOutlets,
      nearbyRetailers,
    };
  }

  private formatDistance(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)}m away`;
    return `${(meters / 1000).toFixed(1)}km away`;
  }
  // ─────────────────────────────────────────────
  // Retailer outlet detail (for SO's "View details" screen)
  // ─────────────────────────────────────────────

  async getRetailerDetail(retailerUserId: number) {
    const retailer = await this.userRepository.findOne({ id: retailerUserId }, [
      'storeInformation',
      'role',
    ]);

    if (!retailer) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    // Latest SO verification evidence for this retailer (if any previous cycle)
    const latestEvidence =
      await this.soVerificationRepository.findLatestByRetailerId(retailerUserId);

    return {
      retailer: {
        id: retailer.id,
        name: retailer.username,
        mobile: retailer.mobile,
        status: retailer.status,
        partnerType: retailer.partnerType,
      },
      storeInfo: retailer.storeInformation ?? null,
      previousVerification: latestEvidence ?? null,
    };
  }

  // ─────────────────────────────────────────────
  // Geo-fence check endpoint (called as SO moves)
  // ─────────────────────────────────────────────

  async checkGeofence(approvalId: number, soLat: number, soLng: number) {
    const approval = await this.approvalRepository.findOne({ id: approvalId }, [
      'user',
      'user.storeInformation',
    ]);

    if (!approval) {
      throw new BusinessException(ERROR_CODES.APPROVAL.APPROVAL_NOT_FOUND);
    }

    const store = approval.user?.storeInformation;
    if (!store?.lat || !store?.lng) {
      throw new BusinessException({
        code: 'SO_001',
        message: 'Retailer store location is not available. Cannot validate geo-fence.',
        statusCode: 400,
      });
    }

    const { distanceMeters, withinRange, allowedRadiusMeters } = await this.validateGeofence(
      soLat,
      soLng,
      Number(store.lat),
      Number(store.lng)
    );

    return {
      withinRange,
      distanceMeters: Math.round(distanceMeters),
      allowedRadiusMeters,
      message: withinRange
        ? `You are within the allowed range (${Math.round(distanceMeters)}m away).`
        : `You are ${Math.round(distanceMeters)}m away. Please move within ${allowedRadiusMeters}m of the outlet to proceed.`,
    };
  }

  // ─────────────────────────────────────────────
  // Verify outlet
  // ─────────────────────────────────────────────

  async verifyOutlet(soUserId: number, approvalId: number, dto: SoVerifyOutletDto) {
    const approval = await this.approvalRepository.findOne({ id: approvalId }, [
      'user',
      'user.storeInformation',
    ]);

    if (!approval) {
      throw new BusinessException(ERROR_CODES.APPROVAL.APPROVAL_NOT_FOUND);
    }

    if (approval.level !== 3) {
      throw new BusinessException({
        code: 'SO_002',
        message: 'This approval is not at the Sales Officer verification stage.',
        statusCode: 400,
      });
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BusinessException(ERROR_CODES.APPROVAL.ALREADY_PROCESSED);
    }

    const store = approval.user?.storeInformation;
    if (!store?.lat || !store?.lng) {
      throw new BusinessException({
        code: 'SO_001',
        message: 'Retailer store location is not available.',
        statusCode: 400,
      });
    }

    // ── Geo-fence validation ──
    const { distanceMeters, withinRange, allowedRadiusMeters } = await this.validateGeofence(
      dto.geoLat,
      dto.geoLng,
      Number(store.lat),
      Number(store.lng)
    );

    if (!withinRange) {
      throw new BusinessException({
        code: 'SO_003',
        message: `You must be within ${allowedRadiusMeters}m of the outlet to verify. You are currently ${Math.round(distanceMeters)}m away.`,
        statusCode: 400,
      });
    }

    // ── Save evidence first (audit always wins) ──
    await this.soVerificationRepository.save({
      approval: { id: approvalId } as any,
      soUser: { id: soUserId } as any,
      retailerUser: { id: approval.user.id } as any,
      status: SoVerificationStatus.VERIFIED,
      soSelfieUrl: dto.soSelfieUrl,
      storeOwnerImageUrl: dto.storeOwnerImageUrl,
      outletImageUrl: dto.outletImageUrl,
      geoLat: dto.geoLat,
      geoLng: dto.geoLng,
      geoCapturedAt: new Date(),
      distanceFromStoreMeters: Math.round(distanceMeters),
      remarks: dto.remarks,
    });

    // ── Delegate to existing approval service (level 3 approve → ACTIVE) ──
    await this.approvalsService.handleApprovalAction(
      soUserId,
      approvalId,
      ApprovalAction.APPROVE,
      dto.remarks ?? 'Outlet verified by Sales Officer'
    );

    return {
      message: 'Outlet verified successfully',
      newStatus: UserStatus.ACTIVE,
      geoTag: { lat: dto.geoLat, lng: dto.geoLng },
      distanceFromStoreMeters: Math.round(distanceMeters),
      verifiedAt: new Date().toISOString(),
    };
  }

  // ─────────────────────────────────────────────
  // Reject outlet
  // ─────────────────────────────────────────────

  async rejectOutlet(soUserId: number, approvalId: number, dto: SoRejectOutletDto) {
    const approval = await this.approvalRepository.findOne({ id: approvalId }, ['user']);

    if (!approval) {
      throw new BusinessException(ERROR_CODES.APPROVAL.APPROVAL_NOT_FOUND);
    }

    if (approval.level !== 3) {
      throw new BusinessException({
        code: 'SO_002',
        message: 'This approval is not at the Sales Officer verification stage.',
        statusCode: 400,
      });
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BusinessException(ERROR_CODES.APPROVAL.ALREADY_PROCESSED);
    }

    // ── Save rejection evidence ──
    await this.soVerificationRepository.save({
      approval: { id: approvalId } as any,
      soUser: { id: soUserId } as any,
      retailerUser: { id: approval.user.id } as any,
      status: SoVerificationStatus.REJECTED,
      rejectionReason: dto.rejectionReason,
      rejectionProofImageUrl: dto.rejectionProofImageUrl,
      remarks: dto.remarks,
    });

    // ── Delegate to existing approval service (level 3 reject → back to L2) ──
    const rejectionLabel = this.getRejectionLabel(dto.rejectionReason);
    await this.approvalsService.handleApprovalAction(
      soUserId,
      approvalId,
      ApprovalAction.REJECT,
      `Rejected by SO — Reason: ${rejectionLabel}${dto.remarks ? `. Remarks: ${dto.remarks}` : ''}`
    );

    return {
      message: 'Outlet rejected successfully',
      rejectionReason: dto.rejectionReason,
      newStatus: UserStatus.IN_APPROVAL,
      rejectedAt: new Date().toISOString(),
    };
  }

  // ─────────────────────────────────────────────
  // Onboarding status (retailer login routing)
  // ─────────────────────────────────────────────

  /**
   * Called after every retailer login. Returns everything the frontend
   * needs to decide which screen to render first.
   *
   * Frontend logic: switch on currentStep → route to that screen.
   * If approvalStatus = 'rejected', show rejection banner on that screen.
   */
  async getOnboardingStatus(retailerUserId: number) {
    const user = await this.userRepository.findOne({ id: retailerUserId }, ['storeInformation']);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    const approvals = await this.approvalRepository
      .createQueryBuilder('approval')
      .where('approval.user_id = :userId', { userId: retailerUserId })
      .andWhere('approval.approval_type = :type', { type: ApprovalType.PROFILE })
      .orderBy('approval.created_at', 'DESC')
      .getMany();

    const activeApproval = approvals[0] ?? null;

    // Current active rejection — shown to retailer only
    let currentRejection: {
      rejectedBy: string;
      reason: string;
      remarks?: string;
      rejectedAt: string | null;
    } | null = null;

    if (activeApproval?.status === ApprovalStatus.REJECTED) {
      // Get SO evidence if this was an SO rejection
      const soEvidence = await this.soVerificationRepository.findLatestByRetailerId(retailerUserId);

      currentRejection = {
        rejectedBy:
          activeApproval.level === 1 ? 'L1' : activeApproval.level === 2 ? 'L2' : 'Sales Officer',
        reason: activeApproval.remarks ?? 'Your profile was rejected. Please review and resubmit.',
        remarks: soEvidence?.remarks,
        rejectedAt: activeApproval.actionAt.toISOString(),
      };
    }

    // Determine which step to land on
    const currentStep = this.resolveCurrentStep(user, activeApproval);

    return {
      retailerUserId,
      currentStep,
      userStatus: user.status,
      approvalStatus: activeApproval?.status ?? null,
      approvalLevel: activeApproval?.level ?? null,
      currentRejection, // null if not rejected
      completedSteps: this.resolveCompletedSteps(user),
      isSubmitted: !!activeApproval,
    };
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  private resolveCurrentStep(user: any, activeApproval: any): string {
    if (!activeApproval) {
      if (!user.username || !user.partnerType) return 'BASIC_INFO';
      if (!user.storeInformation) return 'STORE_INFO';
      return 'SUBMIT';
    }
    if (activeApproval.status === ApprovalStatus.REJECTED) return 'BLOCKED';
    if (activeApproval.status === ApprovalStatus.APPROVED && activeApproval.level === 3)
      return 'ACTIVE';

    // Pending at each level
    if (activeApproval.level === 1) return 'PENDING_L1_REVIEW';
    if (activeApproval.level === 2) return 'PENDING_L2_REVIEW';
    if (activeApproval.level === 3) return 'PENDING_SO_VISIT';

    return 'UNKNOWN';
  }

  private resolveCompletedSteps(user: any): string[] {
    const steps: string[] = [];
    if (user.username && user.partnerType) steps.push('BASIC_INFO');
    if (user.storeInformation) steps.push('STORE_INFO');
    return steps;
  }

  private getRejectionLabel(reason: SoRejectionReason): string {
    const labels: Record<SoRejectionReason, string> = {
      [SoRejectionReason.OUTLET_PERMANENTLY_CLOSED]: 'Outlet permanently closed',
      [SoRejectionReason.RETAILER_NOT_AVAILABLE]: 'Retailer not available',
      [SoRejectionReason.WRONG_SHOP_ADDRESS]: 'Wrong shop address',
      [SoRejectionReason.NOT_INTERESTED_IN_LOYALTY]: 'Not interested in loyalty programme',
      [SoRejectionReason.DUPLICATE_REGISTERED_OUTLET]: 'Duplicate registered outlet',
      [SoRejectionReason.OTHER]: 'Other / Miscellaneous',
    };
    return labels[reason] ?? reason;
  }
}
