import { PartialType } from '@nestjs/swagger';
import { CreatePaymentVerificationDto } from './create-payment-verification.dto';

export class UpdatePaymentVerificationDto extends PartialType(CreatePaymentVerificationDto) {}
