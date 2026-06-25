import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RedemptionsService } from './redemptions.service';

@Controller('redemptions')
export class RedemptionsController {
  constructor(private readonly redemptionsService: RedemptionsService) {}


}
