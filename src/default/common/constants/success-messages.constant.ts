export const SUCCESS_MESSAGES = {
  COMMON: {
    REQUEST_SUCCESSFUL: 'Request successful',
    CREATED_SUCCESSFULLY: 'Created successfully',
    UPDATED_SUCCESSFULLY: 'Updated successfully',
    DELETED_SUCCESSFULLY: 'Deleted successfully',
  },

  ADMIN: {
    CREATED: 'Admin created successfully',
    UPDATED: 'Admin updated successfully',
    DELETED: 'Admin deleted successfully',
  },

  ORDER: {
    CREATED: 'Order created successfully',
    UPDATED: 'Order updated successfully',
    CANCELLED: 'Order cancelled successfully',
  },
  KYC: {
    AADHAAR_OTP_GENERATED: 'Aadhaar OTP generated successfully',
    AADHAAR_VERIFIED: 'Aadhaar verified successfully',
    PAN_VERIFIED: 'PAN verified successfully',
    GST_VERIFIED: 'GST verified successfully',
    BENEFICIARY_ADDED: 'Beneficiary added successfully',
    BENEFICIARIES_FETCHED: 'Beneficiaries retrieved successfully',
  },
} as const;
