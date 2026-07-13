import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PaymentVerificationService } from './payment-verification.service';
import { CreatePaymentVerificationDto } from './dto/create-payment-verification.dto';
import { UpdatePaymentVerificationDto } from './dto/update-payment-verification.dto';

@Controller('payment-verification')
export class PaymentVerificationController {
  constructor(private readonly paymentVerificationService: PaymentVerificationService) {}

  @Post()
  create(@Body() createPaymentVerificationDto: CreatePaymentVerificationDto) {
    return this.paymentVerificationService.create(createPaymentVerificationDto);
  }

  @Get()
  findAll() {
    return this.paymentVerificationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentVerificationService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePaymentVerificationDto: UpdatePaymentVerificationDto
  ) {
    return this.paymentVerificationService.update(+id, updatePaymentVerificationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentVerificationService.remove(+id);
  }
}
