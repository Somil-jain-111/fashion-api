import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { SuperAdminUserMappingsService } from './super-admin-user-mappings.service';
import { CreateUserMappingDto, ListUserMappingsQueryDto, UpdateUserMappingDto } from './dto';
import {
  SuperAdminUserMappingResponseDto,
  SuperAdminUserMappingListResponseDto,
} from './dto/response/user-mapping-response.dto';

@ApiTags('Super Admin - User Mappings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@NoCache()
@Controller('super-admin/user-mappings')
export class SuperAdminUserMappingsController {
  constructor(private readonly userMappings: SuperAdminUserMappingsService) {}
  @NoCache()
  @ApiOkResponse({ type: SuperAdminUserMappingListResponseDto })
  @Get()
  async list(@Query() query: ListUserMappingsQueryDto) {
    const response = await this.userMappings.list(query);
    return DataSanitizer.sanitizeData(new SuperAdminUserMappingListResponseDto(response));
  }
  @NoCache()
  @ApiOkResponse({ type: SuperAdminUserMappingResponseDto })
  @Post()
  @ResponseMessage('User mapping created successfully')
  async create(@Body() dto: CreateUserMappingDto) {
    const response = await this.userMappings.create(dto);
    return DataSanitizer.sanitizeData(new SuperAdminUserMappingResponseDto(response));
  }
  @NoCache()
  @ApiOkResponse({ type: SuperAdminUserMappingResponseDto })
  @Patch(':id')
  @ResponseMessage('User mapping updated successfully')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserMappingDto) {
    const response = await this.userMappings.update(id, dto);
    return DataSanitizer.sanitizeData(new SuperAdminUserMappingResponseDto(response));
  }
}
