import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { SuperAdminUsersService } from './super-admin-users.service';
import { ListUsersQueryDto } from './dto';

@ApiTags('Super Admin - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@NoCache()
@Controller('super-admin/users')
export class SuperAdminUsersController {
  constructor(private readonly users: SuperAdminUsersService) {}

  @Get()
  async list(@Query() query: ListUsersQueryDto) {
    const response = await this.users.list(query);
    return DataSanitizer.sanitizeData(response);
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const response = await this.users.detail(id);
    return DataSanitizer.sanitizeData(response);
  }
}
