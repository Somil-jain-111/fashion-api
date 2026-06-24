import { Injectable } from '@nestjs/common';
import { CreateRedemptionDto } from './dto/create-redemption.dto';
import { UpdateRedemptionDto } from './dto/update-redemption.dto';

@Injectable()
export class RedemptionsService {
  create(createRedemptionDto: CreateRedemptionDto) {
    return 'This action adds a new redemption';
  }

  findAll() {
    return `This action returns all redemptions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} redemption`;
  }

  update(id: number, updateRedemptionDto: UpdateRedemptionDto) {
    return `This action updates a #${id} redemption`;
  }

  remove(id: number) {
    return `This action removes a #${id} redemption`;
  }
}
