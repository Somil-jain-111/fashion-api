import { KycVerificationEntity, User } from 'src/modules/auth/entities';
import { AuthUserResponseDto } from '../interface/auth-user.response.dto';
import { UserBlock } from 'src/modules/user/entities/user-block.entity';

export class UserResponseMapper {
  static toAuthUser(
    user: User,
    panKyc?: KycVerificationEntity,
    aadhaarKyc?: KycVerificationEntity,
    gstKyc?: KycVerificationEntity,
    activeBlock?: UserBlock | null
  ): AuthUserResponseDto {
    return {
      id: user?.id?.toString(),
      uuid: user.uuid,
      applicationId: user.applicationId,
      username: user.username,
      mobile: user.mobile,
      whatsapp_number: user.whatsappNumber,
      email: user.email,
      image_url: user.image_url,
      status: user.status,
      points: String(user.points),
      storeInformation: {
        address1: user?.storeInformation?.address1,
        address2: user.storeInformation?.address2,
        city: user?.storeInformation?.city,
        state: user?.storeInformation?.state,
        pincode: String(user?.storeInformation?.pincode),
      },
      role: user?.role?.name || null,
      created_at: user?.createdAt?.toISOString(),
      date_of_birth: user?.date_of_birth ? new Date(user.date_of_birth).toISOString() : null,
      anniversary_date: user?.anniversary_date
        ? new Date(user.anniversary_date).toISOString()
        : null,
      ...(panKyc && {
        panDetails: {
          status: panKyc?.status,
          maskedDocumentNumber: panKyc?.maskedDocumentNumber,
        },
      }),
      ...(aadhaarKyc && {
        aadhaarDetails: {
          status: aadhaarKyc?.status,
          maskedDocumentNumber: aadhaarKyc?.maskedDocumentNumber,
        },
      }),
      ...(gstKyc && {
        gstDetails: {
          status: gstKyc?.status,
          maskedDocumentNumber: gstKyc?.maskedDocumentNumber,
        },
      }),
      blockedDetails: activeBlock
        ? {
            is_blocked: true,
            block_type: activeBlock.blockType,
            blocked_till: activeBlock.blockedTill ? activeBlock.blockedTill.toISOString() : null,
            remarks: activeBlock.remarks || null,
          }
        : {
            is_blocked: false,
            block_type: null,
            blocked_till: null,
            remarks: null,
          },
    };
  }
}
