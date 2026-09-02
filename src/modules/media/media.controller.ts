import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { NoCache } from 'src/default/cache/cache.decorator';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { CompleteMediaUploadDto, CreateMediaUploadDto, SignUploadPartsDto } from './dto';
import { MediaService } from './media.service';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';

@NoCache()
@UseGuards(JwtAuthGuard)
@Controller('media/uploads')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateMediaUploadDto) {
    return DataSanitizer.sanitizeData(await this.mediaService.createUpload(req.user.id, dto));
  }

  @Post(':uploadToken/parts')
  async signParts(
    @Req() req: any,
    @Param('uploadToken') uploadToken: string,
    @Body() dto: SignUploadPartsDto
  ) {
    return DataSanitizer.sanitizeData(
      await this.mediaService.signParts(req.user.id, uploadToken, dto)
    );
  }

  @Post(':uploadToken/complete-multipart')
  async completeMultipart(
    @Req() req: any,
    @Param('uploadToken') uploadToken: string,
    @Body() dto: CompleteMediaUploadDto
  ) {
    return DataSanitizer.sanitizeData(
      await this.mediaService.completeMultipart(req.user.id, uploadToken, dto)
    );
  }

  @Post(':uploadToken/complete')
  async completeSingle(@Req() req: any, @Param('uploadToken') uploadToken: string) {
    return DataSanitizer.sanitizeData(
      await this.mediaService.completeSingle(req.user.id, uploadToken)
    );
  }

  @Post(':uploadToken/abort')
  async abort(@Req() req: any, @Param('uploadToken') uploadToken: string) {
    await this.mediaService.abort(req.user.id, uploadToken);
    return DataSanitizer.sanitizeData(null);
  }
}
