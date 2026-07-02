export const OTP_EXPIRY_MINUTES = 5;
export const OTP_LENGTH = 6;

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  // Blocked so user cannot register again
  BLOCKED = 'blocked',
  // User is being processed for read only view (L1 L2 approval)
  IN_APPROVAL = 'in_approval',
  // User is not approved by Sales Officer YET (Read only mode)
  PARTIAL_APPROVED = 'partial_approved',
  DELETED = 'deleted',
}

export const JWT_ACCESS_TOKEN_EXPIRY = '1d';
export const JWT_REFRESH_TOKEN_EXPIRY = '7d';

export const REFRESH_TOKEN_EXPIRY_DAYS = 7;
export const RESET_TOKEN_EXPIRY_MINUTES = 10;
