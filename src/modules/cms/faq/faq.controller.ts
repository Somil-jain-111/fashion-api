import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
// import { UserStatusGuard } from 'src/default/common/guards/user-status.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { FaqQueryDto } from './dto/faq-query.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

@Controller('faqs')
@UseGuards(JwtAuthGuard)
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles([UserRole.SUPERADMIN])
  async create(@Body() dto: CreateFaqDto) {
    const response = await this.faqService.create(dto);

    return DataSanitizer.sanitizeData(response);
  }

  @Get()
  async findAll(
    @Req() req: any,
    @Query() query: FaqQueryDto,
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ) {
    const pageNumber = Number(page);
    const pageSize = Number(limit);
    const offset = (pageNumber - 1) * pageSize;

    const userRole = req.user?.role;

    const response = await this.faqService.findAll(query, offset, pageSize, userRole);

    return DataSanitizer.sanitizeData(response);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const response = await this.faqService.findOne(id);

    return DataSanitizer.sanitizeData(response);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles([UserRole.SUPERADMIN])
  async update(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    const response = await this.faqService.update(id, dto);

    return DataSanitizer.sanitizeData(response);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles([UserRole.SUPERADMIN])
  async remove(@Param('id') id: string) {
    const response = await this.faqService.remove(id);

    return DataSanitizer.sanitizeData(response);
  }
}
