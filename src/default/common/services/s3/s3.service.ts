import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createReadStream, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  EXTENSION_BY_MIME_TYPE,
} from './constants/file-upload.constant';
import { S3_JOB, S3_QUEUE } from './constants/s3-queue.constant';
import {
  ProcessChunkUploadJob,
  UploadBase64ToS3Params,
  UploadBufferToS3Params,
  UploadS3Response,
} from './interfaces/s3-upload.interface';
import { UploadBase64ChunkDto } from './dto/upload-base64-chunk.dto';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly baseUrl: string;
  private readonly region: string;
  private readonly tempUploadPath = join(process.cwd(), 'tmp', 's3-uploads');

  constructor(
    private readonly configService: ConfigService,

    @InjectQueue(S3_QUEUE.UPLOAD)
    private readonly s3UploadQueue: Queue
  ) {
    this.region = this.configService.get<string>('AWS_REGION') || '';

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID') || '';

    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '';

    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME') || '';

    this.baseUrl = this.configService.get<string>('AWS_S3_BASE_URL') || '';

    if (!this.region || !accessKeyId || !secretAccessKey || !this.bucketName) {
      throw new Error('AWS S3 configuration is missing');
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.ensureDirectory(this.tempUploadPath);
  }

  /**
   * Uploads an image file from a multipart/form-data request.
   */
  async uploadImageFile(
    file: Express.Multer.File,
    folder = 'images',
    isPublic = false
  ): Promise<UploadS3Response> {
    if (!file) {
      throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST);
    }

    this.validateMimeType(file.mimetype, ALLOWED_UPLOAD_MIME_TYPES.IMAGE);
    this.validateFileSize(file.size, 5); // 5MB limit

    const finalFileName = this.generateFileName({
      fileName: file.originalname,
      mimeType: file.mimetype,
    });

    return this.uploadBufferToS3({
      buffer: file.buffer,
      fileName: finalFileName,
      mimeType: file.mimetype,
      folder,
      isPublic,
    });
  }

  /**
   * Use this for small base64 files.
   */
  async uploadBase64File(params: UploadBase64ToS3Params): Promise<UploadS3Response> {
    const {
      base64,
      fileName,
      folder = 'uploads',
      mimeType,
      isPublic = false,
      maxSizeInMB = 10,
      allowedMimeTypes = ALLOWED_UPLOAD_MIME_TYPES.ALL,
    } = params;

    const parsedFile = this.parseBase64File(base64, mimeType);

    this.validateMimeType(parsedFile.mimeType, allowedMimeTypes);
    this.validateFileSize(parsedFile.buffer.length, maxSizeInMB);

    const finalFileName = this.generateFileName({
      fileName,
      mimeType: parsedFile.mimeType,
    });

    return this.uploadBufferToS3({
      buffer: parsedFile.buffer,
      fileName: finalFileName,
      mimeType: parsedFile.mimeType,
      folder,
      isPublic,
    });
  }

  /**
   * Use this for large base64 chunks.
   * This stores each chunk temporarily.
   * On last chunk, it adds BullMQ job.
   */
  async uploadBase64Chunk(dto: UploadBase64ChunkDto) {
    const {
      uploadId,
      chunkBase64,
      chunkIndex,
      totalChunks,
      fileName,
      mimeType,
      folder = 'uploads',
      isLastChunk = false,
      isPublic = false,
    } = dto;

    if (chunkIndex >= totalChunks) {
      throw new BadRequestException('chunkIndex cannot be greater than totalChunks');
    }

    this.validateMimeType(mimeType, ALLOWED_UPLOAD_MIME_TYPES.ALL);

    const uploadDir = join(this.tempUploadPath, uploadId);
    this.ensureDirectory(uploadDir);

    const chunkBuffer = this.parseBase64Chunk(chunkBase64);

    const chunkPath = join(uploadDir, `${chunkIndex}.part`);
    writeFileSync(chunkPath, chunkBuffer);

    if (!isLastChunk) {
      return {
        message: 'Chunk uploaded successfully',
        uploadId,
        chunkIndex,
        totalChunks,
        isCompleted: false,
      };
    }

    await this.validateAllChunksExist(uploadDir, totalChunks);

    await this.s3UploadQueue.add(
      S3_JOB.PROCESS_CHUNK_UPLOAD,
      {
        uploadId,
        fileName,
        mimeType,
        folder,
        totalChunks,
        isPublic,
      } satisfies ProcessChunkUploadJob,
      {
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: false,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
      }
    );

    return {
      message: 'All chunks uploaded successfully. File processing started.',
      uploadId,
      isCompleted: true,
    };
  }

  /**
   * Used by BullMQ processor.
   */
  async processChunkUpload(jobData: ProcessChunkUploadJob): Promise<UploadS3Response> {
    const {
      uploadId,
      fileName,
      mimeType,
      folder = 'uploads',
      totalChunks,
      isPublic = false,
    } = jobData;

    const uploadDir = join(this.tempUploadPath, uploadId);

    await this.validateAllChunksExist(uploadDir, totalChunks);

    const finalFileName = this.generateFileName({
      fileName,
      mimeType,
    });

    const finalFilePath = join(uploadDir, finalFileName);

    await this.mergeChunksToFile({
      uploadDir,
      finalFilePath,
      totalChunks,
    });

    const key = `${folder}/${finalFileName}`;

    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: createReadStream(finalFilePath),
          ContentType: mimeType,
          ACL: isPublic ? 'public-read' : undefined,
        },
        queueSize: 4,
        partSize: 8 * 1024 * 1024,
        leavePartsOnError: false,
      });

      await upload.done();

      const size = this.getFileSizeFromChunks(uploadDir, totalChunks);

      return {
        key,
        url: this.getFileUrl(key),
        bucket: this.bucketName,
        fileName: finalFileName,
        mimeType,
        size,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Failed to upload chunked file to S3',
        error: error?.message,
      });
    } finally {
      this.deleteDirectory(uploadDir);
    }
  }

  async uploadBufferToS3(params: UploadBufferToS3Params): Promise<UploadS3Response> {
    const { buffer, fileName, mimeType, folder = 'uploads', isPublic = false } = params;

    const key = `${folder}/${fileName}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ACL: isPublic ? 'public-read' : undefined,
        })
      );

      return {
        key,
        url: this.getFileUrl(key),
        bucket: this.bucketName,
        fileName,
        mimeType,
        size: buffer.length,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Failed to upload file to S3',
        error: error?.message,
      });
    }
  }

  async deleteFile(key: string): Promise<{ message: string; key: string }> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );

      return {
        message: 'File deleted successfully',
        key,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Failed to delete file from S3',
        error: error?.message,
      });
    }
  }

  getFileUrl(key: string): string {
    if (this.baseUrl) {
      return `${this.baseUrl}/${key}`;
    }

    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  private parseBase64File(base64: string, mimeType?: string): { buffer: Buffer; mimeType: string } {
    if (!base64) {
      throw new BadRequestException('Base64 file is required');
    }

    const matches = base64.match(/^data:(.+);base64,(.+)$/);

    if (matches) {
      return {
        mimeType: matches[1],
        buffer: Buffer.from(matches[2], 'base64'),
      };
    }

    if (!mimeType) {
      throw new BadRequestException('mimeType is required when base64 does not contain data URI');
    }

    return {
      mimeType,
      buffer: Buffer.from(base64, 'base64'),
    };
  }

  private parseBase64Chunk(chunkBase64: string): Buffer {
    if (!chunkBase64) {
      throw new BadRequestException('Base64 chunk is required');
    }

    const matches = chunkBase64.match(/^data:(.+);base64,(.+)$/);

    if (matches) {
      return Buffer.from(matches[2], 'base64');
    }

    return Buffer.from(chunkBase64, 'base64');
  }

  private validateMimeType(mimeType: string, allowedMimeTypes: string[]): void {
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(`Invalid file type: ${mimeType}`);
    }
  }

  private validateFileSize(sizeInBytes: number, maxSizeInMB: number): void {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (sizeInBytes > maxSizeInBytes) {
      throw new BadRequestException(`File size should not exceed ${maxSizeInMB}MB`);
    }
  }

  private generateFileName(params: { fileName?: string; mimeType: string }): string {
    const extension = EXTENSION_BY_MIME_TYPE[params.mimeType];

    if (!extension) {
      throw new BadRequestException('Unsupported file extension');
    }

    const originalName = params.fileName || 'file';

    const cleanName = originalName
      .replace(/\.[^/.]+$/, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-_]/g, '')
      .toLowerCase();

    return `${cleanName}-${uuidv4()}${extension}`;
  }

  private ensureDirectory(path: string): void {
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
  }

  private async validateAllChunksExist(uploadDir: string, totalChunks: number): Promise<void> {
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = join(uploadDir, `${i}.part`);

      if (!existsSync(chunkPath)) {
        throw new BadRequestException(`Missing chunk index: ${i}`);
      }
    }
  }

  private async mergeChunksToFile(params: {
    uploadDir: string;
    finalFilePath: string;
    totalChunks: number;
  }): Promise<void> {
    const { uploadDir, finalFilePath, totalChunks } = params;

    const fs = await import('fs');
    const writeStream = fs.createWriteStream(finalFilePath);

    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = join(uploadDir, `${i}.part`);

      await new Promise<void>((resolve, reject) => {
        const readStream = fs.createReadStream(chunkPath);

        readStream.on('error', reject);
        writeStream.on('error', reject);

        readStream.on('end', resolve);

        readStream.pipe(writeStream, {
          end: false,
        });
      });
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.end();
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  private getFileSizeFromChunks(uploadDir: string, totalChunks: number): number {
    const fs = require('fs');

    let totalSize = 0;

    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = join(uploadDir, `${i}.part`);
      totalSize += fs.statSync(chunkPath).size;
    }

    return totalSize;
  }

  private deleteDirectory(path: string): void {
    if (existsSync(path)) {
      rmSync(path, {
        recursive: true,
        force: true,
      });
    }
  }
}
