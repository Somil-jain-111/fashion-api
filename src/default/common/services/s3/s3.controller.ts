import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { S3Service } from './s3.service';
import { UploadBase64FileDto } from './dto/upload-base64-file.dto';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { SUCCESS_MESSAGES } from 'src/default/common/constants/success-messages.constant';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';
import { ALLOWED_UPLOAD_MIME_TYPES } from './constants/file-upload.constant';

@UseGuards(JwtAuthGuard)
@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  // @NoCache()
  // @SkipThrottle()
  // @Post('upload/image')
  // @UseInterceptors(FileInterceptor('image'))
  // @ResponseMessage(SUCCESS_MESSAGES.COMMON.IMAGE_UPLOADED)
  // async uploadImage(
  //   @UploadedFile() file: Express.Multer.File,
  //   @Body('folder') folder?: string,
  //   @Body('public') isPublic?: string | boolean
  // ) {
  //   const isPublicBool = isPublic === undefined ? true : isPublic === 'true' || isPublic === true;

  //   const response = await this.s3Service.uploadImageFile(file, folder || 'images', isPublicBool);

  //   return DataSanitizer.sanitizeData(response);
  // }

  @NoCache()
  @Post('upload/file')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  @ResponseMessage(SUCCESS_MESSAGES.COMMON.FILE_UPLOADED)
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Body('folder') folder?: string
  ) {
    const response = await this.s3Service.uploadDocumentFile(
      file,
      `legacy/${req.user.id}/${folder || 'uploads'}`,
      false,
      ALLOWED_UPLOAD_MIME_TYPES.ALL
    );

    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Post('upload/base64')
  @ResponseMessage(SUCCESS_MESSAGES.COMMON.FILE_UPLOADED)
  async uploadBase64(@Body() dto: UploadBase64FileDto, @Req() req: any) {
    const response = await this.s3Service.uploadBase64File({
      base64: dto.base64,
      fileName: dto.fileName,
      folder: `legacy/${req.user.id}/${dto.folder || 'uploads'}`,
      mimeType: dto.mimeType,
      isPublic: false,
    });

    return DataSanitizer.sanitizeData(response);
  }
}
