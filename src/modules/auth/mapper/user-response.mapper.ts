import { KycVerificationEntity, User } from 'src/modules/auth/entities';
import { AuthUserResponseDto } from '../interface/auth-user.response.dto';

export class UserResponseMapper {
  static toAuthUser(
    user: User,
    panKyc?: KycVerificationEntity,
    aadhaarKyc?: KycVerificationEntity,
    gstKyc?: KycVerificationEntity
  ): AuthUserResponseDto {
    return {
      id: user.id.toString(),
      uuid: user.uuid,
      applicationId: user.applicationId,
      username: user.username,
      mobile: user.mobile,
      whatsapp_number: user.whatsappNumber,
      email: user.email,
      image_url: user.image_url,
      status: user.status,
      points: String(user.points),
      role: user.role
        ? {
            id: user.role.id.toString(),
            name: user.role.name,
          }
        : null,
      created_at: user?.createdAt?.toISOString(),
      ...(panKyc && {
        maskedPan: panKyc?.maskedDocumentNumber,
      }),
      ...(aadhaarKyc && {
        maskedAadhaar: aadhaarKyc?.maskedDocumentNumber,
      }),
      ...(gstKyc && {
        maskedGst: gstKyc?.maskedDocumentNumber,
      }),
    };
  }
}
