export enum ApprovalRejectionOptions {
  // BASIC ISSUES
  INCORRECT_NAME = 'Incorrect Name',
  INCORRECT_EMAIL = 'Incorrect Email',
  INCORRECT_WHATSAPP_NUMBER = 'Incorrect Whatsapp Number',
  INCORRECT_PARTNER_TYPE = 'Incorrect Partner Type',

  // KYC ISSUES
  INCORRECT_GST_INFO = 'Incorrect GST Info',
  INCORRECT_PAN_INFO = 'Incorrect PAN Info',
  INCORRECT_AADHAAR_INFO = 'Incorrect AADHAAR Info',

  // STORE ISSUES
  INCORRECT_STORE_NAME = 'Incorrect Store Name',
  INCORRECT_STORE_LOCATION = 'Incorrect Store Location (Lat & Lng)',
  INCORRECT_STORE_ADDRESS = 'Incorrect Store Address',
  INCORRECT_STORE_PINCODE = 'Incorrect Store Pincode',
  INCORRECT_STORE_STATE = 'Incorrect Store State',
  INCORRECT_STORE_CITY = 'Incorrect Store City',
  INCORRECT_STORE_CONTACT = 'Incorrect Store Contact',
  INCORRECT_STORE_FRONT_FACADE_IMAGE = 'Incorrect Store Front Facade Image',
  INCORRECT_STORE_DISPLAY_IMAGE = 'Incorrect Store Display Image',
  INCORRECT_STORE_ADDRESS_PROOF_TYPE = 'Incorrect Store Address Proof Type',
  INCORRECT_STORE_ADDRESS_PROOF = 'Incorrect Store Address Proof',

  // OTHER REJECTIONS
  OUTLET_PERMANENTLY_CLOSED = 'Outlet permanently closed',
  RETAILER_NOT_AVAILABLE = 'Retailer not available',
  NOT_INTERESTED_IN_LOYALTY = 'Not interested in loyalty programme',
  DUPLICATE_OUTLET = 'Duplicate registered outlet',

  // MISC
  OTHER = 'Other: Please check remarks for more information.',
}
