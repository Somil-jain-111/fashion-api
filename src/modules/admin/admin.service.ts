import { Injectable } from '@nestjs/common';
//
import { AdminVerifyKycDto } from './dto/admin-verify-kyc.dto';
import { PublicService } from '../public/public.service';

@Injectable()
export class AdminService {
  constructor(private readonly publicService: PublicService) {}

  /**
   * Directly creates a verified KYC record in the database for the given userId with dummy data.
   */
  async verifyKyc(dto: AdminVerifyKycDto): Promise<any> {
    return await this.publicService.verifyManualKyc(dto);
  }
}
