import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AddressesService } from './addresses.service';


@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

}
