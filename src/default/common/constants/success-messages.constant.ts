export const SUCCESS_MESSAGES = {
  COMMON: {
    REQUEST_SUCCESSFUL: 'Request successful',
    CREATED_SUCCESSFULLY: 'Created successfully',
    UPDATED_SUCCESSFULLY: 'Updated successfully',
    DELETED_SUCCESSFULLY: 'Deleted successfully',
    FILE_UPLOADED: 'File uploaded successfully',
    DOCUMENT_UPLOADED: 'Document uploaded successfully',
    IMAGE_UPLOADED: 'Image uploaded successfully',
  },

  ADMIN: {
    CREATED: 'Admin created successfully',
    UPDATED: 'Admin updated successfully',
    DELETED: 'Admin deleted successfully',
    KYC_VERIFIED: 'KYC verified successfully',
  },

  ORDER: {
    CREATED: 'Order created successfully',
    UPDATED: 'Order updated successfully',
    CANCELLED: 'Order cancelled successfully',
  },

  KYC: {
    AADHAAR_OTP_GENERATED: 'Aadhaar OTP generated successfully',
    AADHAAR_VERIFIED: 'Aadhaar verified successfully',
    AADHAAR_SAVED: 'Aadhaar details saved successfully',
    PAN_VERIFIED: 'PAN verified successfully',
    GST_VERIFIED: 'GST verified successfully',
    BENEFICIARY_ADDED: 'Beneficiary added successfully',
    BENEFICIARY_VERIFIED: 'Beneficiary verified successfully',
    BENEFICIARY_OTP_SENT: 'OTP sent for beneficiary verification',
    BENEFICIARIES_FETCHED: 'Beneficiaries retrieved successfully',
    BENEFICIARIES_RELATIONSHIPS_FETCHED: 'Beneficiaries relationships retrieved successfully',
  },

  ONBOARDING: {
    VERIFICATION_SUCCESSFUL: 'Verification successful',
  },
} as const;
