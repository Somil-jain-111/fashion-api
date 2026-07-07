import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { S3Service } from './s3.service';
import { UploadBase64FileDto } from './dto/upload-base64-file.dto';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';

@UseGuards(JwtAuthGuard)
@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Post('upload/image')
  @UseInterceptors(FileInterceptor('image'))
  @ResponseMessage('Image uploaded successfully')
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
    @Body('public') isPublic?: string | boolean
  ) {
    const isPublicBool = isPublic === undefined ? true : isPublic === 'true' || isPublic === true;

    const response = await this.s3Service.uploadImageFile(file, folder || 'images', isPublicBool);

    return DataSanitizer.sanitizeData(response);
  }

  @Post('upload/base64')
  @ResponseMessage('File uploaded successfully')
  async uploadBase64(@Body() dto: UploadBase64FileDto) {
    const response = await this.s3Service.uploadBase64File({
      base64: dto.base64,
      fileName: dto.fileName,
      folder: dto.folder || 'uploads',
      mimeType: dto.mimeType,
      isPublic: dto.isPublic ?? true,
    });

    return DataSanitizer.sanitizeData(response);
  }
}
