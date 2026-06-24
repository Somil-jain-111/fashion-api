import { PartialType } from '@nestjs/swagger';
import { CreateRedemptionDto } from './create-redemption.dto';

export class UpdateRedemptionDto extends PartialType(CreateRedemptionDto) {}
