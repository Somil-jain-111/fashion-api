import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RedemptionsService } from './redemptions.service';
import { CreateRedemptionDto } from './dto/create-redemption.dto';
import { UpdateRedemptionDto } from './dto/update-redemption.dto';

@Controller('redemptions')
export class RedemptionsController {
  constructor(private readonly redemptionsService: RedemptionsService) {}

  @Post()
  create(@Body() createRedemptionDto: CreateRedemptionDto) {
    return this.redemptionsService.create(createRedemptionDto);
  }

  @Get()
  findAll() {
    return this.redemptionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.redemptionsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRedemptionDto: UpdateRedemptionDto) {
    return this.redemptionsService.update(+id, updateRedemptionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.redemptionsService.remove(+id);
  }
}
