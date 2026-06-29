import { Injectable } from '@nestjs/common';
import { CreatePaymentVerificationDto } from './dto/create-payment-verification.dto';
import { UpdatePaymentVerificationDto } from './dto/update-payment-verification.dto';

@Injectable()
export class PaymentVerificationService {
  create(createPaymentVerificationDto: CreatePaymentVerificationDto) {
    return 'This action adds a new paymentVerification';
  }

  findAll() {
    return `This action returns all paymentVerification`;
  }

  findOne(id: number) {
    return `This action returns a #${id} paymentVerification`;
  }

  update(id: number, updatePaymentVerificationDto: UpdatePaymentVerificationDto) {
    return `This action updates a #${id} paymentVerification`;
  }

  remove(id: number) {
    return `This action removes a #${id} paymentVerification`;
  }
}
