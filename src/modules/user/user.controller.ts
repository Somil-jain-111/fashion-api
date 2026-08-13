import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { UserService } from './user.service';
import { PermanentBlockUserDto, TempBlockUserDto, UnblockUserDto } from './dto/block-user.dto';
import { UpdateUserDatesDto } from './dto/update-user.dto';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { NoCache } from 'src/default/cache/cache.decorator';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('user')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @NoCache()
  @SkipThrottle()
  @Post('temp-block')
  @Roles([UserRole.L1, UserRole.L2, UserRole.SUPERADMIN])
  @ResponseMessage('User temporarily blocked successfully')
  async tempBlockUser(@Body() dto: TempBlockUserDto, @Req() req: any) {
    return await this.userService.tempBlockUser(dto, req.user);
  }

  @NoCache()
  @SkipThrottle()
  @Post('permanent-block')
  @Roles([UserRole.L2, UserRole.SUPERADMIN])
  @ResponseMessage('User permanently blocked successfully')
  async permanentBlockUser(@Body() dto: PermanentBlockUserDto, @Req() req: any) {
    return await this.userService.permanentBlockUser(dto, req.user);
  }

  @NoCache()
  @SkipThrottle()
  @Post('unblock')
  @Roles([UserRole.L2, UserRole.SUPERADMIN])
  @ResponseMessage('User permanent block removed successfully')
  async removePermanentBlock(@Body() dto: UnblockUserDto, @Req() req: any) {
    return await this.userService.removeBlock(dto, req.user);
  }

  @NoCache()
  @SkipThrottle()
  @Post('update')
  @ResponseMessage('User profile updated successfully')
  async updateUserProfile(@Body() dto: UpdateUserDatesDto, @Req() req: any) {
    const userId = req.user.id;
    return await this.userService.updateProfileDates(userId, dto);
  }
}
