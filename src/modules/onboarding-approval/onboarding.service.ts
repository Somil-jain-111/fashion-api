// import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
// import { RetailerOnboarding } from './entities/retailer-onboarding.entity';
// import {
//   SubmitBasicDetailsDto,
//   SubmitPanDto,
//   SubmitAadhaarDto,
//   SubmitGstDto,
//   SubmitStoreDetailsDto,
// } from './dto/onboarding-step.dto';
// import {
//   OnboardingStep,
//   BeneficiaryType,
//   VerificationStatus,
// } from './enums/approval-status.enum';
// import { ApprovalService } from './approval.service';

// @Injectable()
// export class OnboardingService {
//   constructor(private readonly approvalService: ApprovalService) {}

//   private async getOrCreateDraft(userId: string): Promise<RetailerOnboarding> {
//     let draft = await RetailerOnboarding.findOne({ where: { user_id: userId } });
//     if (!draft) {
//       draft = RetailerOnboarding.create({ user_id: userId });
//       await draft.save();
//     }
//     return draft;
//   }

//   private assertNotSubmitted(draft: RetailerOnboarding) {
//     if (draft.submitted_at) {
//       throw new BadRequestException(
//         'Onboarding already submitted for approval. Edits are not allowed at this stage.',
//       );
//     }
//   }

//   async submitBasicDetails(userId: string, dto: SubmitBasicDetailsDto) {
//     const draft = await this.getOrCreateDraft(userId);
//     this.assertNotSubmitted(draft);

//     draft.first_name = dto.first_name;
//     draft.last_name = dto.last_name;
//     draft.dob = new Date(dto.dob);
//     draft.whatsapp_number = dto.whatsapp_number;
//     draft.step_completed = OnboardingStep.BASIC;

//     await draft.save();
//     return draft;
//   }

//   async submitPan(userId: string, dto: SubmitPanDto) {
//     const draft = await this.getOrCreateDraft(userId);
//     this.assertNotSubmitted(draft);

//     // NOTE: actual PAN verification API call happens here (or via kyc service),
//     // result determines pan_verification_status. Stubbed as VERIFIED for now
//     // pending integration confirmation per BRD section 3.2.1 (KYC Validation Trigger).
//     draft.pan_number = dto.pan_number;
//     draft.pan_verification_status = VerificationStatus.VERIFIED;
//     draft.pan_verified_at = new Date();
//     draft.step_completed = OnboardingStep.PAN;

//     await draft.save();
//     return draft;
//   }

//   async submitAadhaar(userId: string, dto: SubmitAadhaarDto) {
//     const draft = await this.getOrCreateDraft(userId);
//     this.assertNotSubmitted(draft);

//     // raw aadhaar_number is intentionally never persisted; only the
//     // verification reference id from the digital verification provider is stored.
//     draft.aadhaar_ref_id = `AAD-${Date.now()}`; // placeholder until provider integration
//     draft.aadhaar_verification_status = VerificationStatus.VERIFIED;
//     draft.aadhaar_verified_at = new Date();
//     draft.step_completed = OnboardingStep.AADHAAR;

//     await draft.save();
//     return draft;
//   }

//   async submitGst(userId: string, dto: SubmitGstDto) {
//     const draft = await this.getOrCreateDraft(userId);
//     this.assertNotSubmitted(draft);

//     draft.beneficiary_type = dto.beneficiary_type;

//     if (dto.beneficiary_type === BeneficiaryType.ENTITY) {
//       if (!dto.gstin) {
//         // also enforced at DTO level via ValidateIf; defense in depth
//         throw new BadRequestException('GSTIN is mandatory for ENTITY beneficiary type');
//       }
//       draft.gstin = dto.gstin;
//       draft.gst_verification_status = VerificationStatus.VERIFIED;
//       draft.gst_verified_at = new Date();
//     } else {
//       // INDIVIDUAL: GST optional, leave untouched if not provided
//       if (dto.gstin) {
//         draft.gstin = dto.gstin;
//         draft.gst_verification_status = VerificationStatus.VERIFIED;
//         draft.gst_verified_at = new Date();
//       }
//     }

//     draft.step_completed = OnboardingStep.GST;

//     await draft.save();
//     return draft;
//   }

//   async submitStoreDetails(userId: string, dto: SubmitStoreDetailsDto) {
//     const draft = await this.getOrCreateDraft(userId);
//     this.assertNotSubmitted(draft);

//     if (!draft.pan_number || draft.pan_verification_status !== VerificationStatus.VERIFIED) {
//       throw new BadRequestException('PAN verification must be completed before store details');
//     }
//     if (
//       !draft.aadhaar_ref_id ||
//       draft.aadhaar_verification_status !== VerificationStatus.VERIFIED
//     ) {
//       throw new BadRequestException('Aadhaar verification must be completed before store details');
//     }
//     if (
//       draft.beneficiary_type === BeneficiaryType.ENTITY &&
//       draft.gst_verification_status !== VerificationStatus.VERIFIED
//     ) {
//       throw new BadRequestException('GST verification must be completed before store details');
//     }

//     draft.store_name = dto.store_name;
//     draft.store_address = dto.store_address;
//     draft.store_pincode = dto.store_pincode;
//     draft.store_city = dto.store_city;
//     draft.store_state = dto.store_state;
//     draft.store_front_photo_url = dto.store_front_photo_url;
//     draft.store_display_photo_url = dto.store_display_photo_url;
//     draft.geo_lat = dto.geo_lat;
//     draft.geo_lng = dto.geo_lng;
//     draft.geo_captured_at = new Date();
//     draft.step_completed = OnboardingStep.STORE;
//     draft.submitted_at = new Date();

//     await draft.save();

//     // This is the trigger point: completing the STORE step immediately
//     // creates the RetailerApproval record and puts the retailer into the L1 queue.
//     await this.approvalService.createApprovalForOnboarding(userId, draft.id);

//     return draft;
//   }

//   async getDraft(userId: string) {
//     const draft = await RetailerOnboarding.findOne({ where: { user_id: userId } });
//     if (!draft) {
//       throw new NotFoundException('Onboarding not started for this user');
//     }
//     return draft;
//   }
// }