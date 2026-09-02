import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { RedisService } from 'src/default/databases/redis/redis.service';
import { S3Service } from 'src/default/common/services/s3/s3.service';
import { CompleteMediaUploadDto, CreateMediaUploadDto, SignUploadPartsDto } from './dto';
import { MediaUploadSession } from './media.types';

const SESSION_TTL_SECONDS = 24 * 60 * 60;
const MULTIPART_THRESHOLD_BYTES = 25 * 1024 * 1024;
const PART_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'application/pdf': '.pdf',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

@Injectable()
export class MediaService {
  constructor(
    private readonly s3Service: S3Service,
    private readonly redisService: RedisService
  ) {}

  async createUpload(ownerId: number, dto: CreateMediaUploadDto) {
    if (!ALLOWED_MIME_TYPES.has(dto.mimeType)) {
      throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST);
    }

    const uploadToken = randomUUID();
    const key = this.buildObjectKey(ownerId, dto);
    const mode = dto.size >= MULTIPART_THRESHOLD_BYTES ? 'MULTIPART' : 'SINGLE';
    const session: MediaUploadSession = {
      ownerId,
      mode,
      key,
      mimeType: dto.mimeType,
      size: dto.size,
    };

    if (mode === 'SINGLE') {
      const uploadUrl = await this.s3Service.createPresignedPutUrl(key, dto.mimeType);
      await this.saveSession(uploadToken, session);
      return {
        uploadToken,
        mode,
        uploadUrl,
        requiredHeaders: { 'Content-Type': dto.mimeType },
        expiresInSeconds: 900,
      };
    }

    const partCount = Math.ceil(dto.size / PART_SIZE_BYTES);
    const s3UploadId = await this.s3Service.createMultipartUpload(key, dto.mimeType);
    Object.assign(session, { partSize: PART_SIZE_BYTES, partCount, s3UploadId });
    await this.saveSession(uploadToken, session);

    return {
      uploadToken,
      mode,
      partSize: PART_SIZE_BYTES,
      partCount,
      expiresInSeconds: 900,
    };
  }

  async signParts(ownerId: number, uploadToken: string, dto: SignUploadPartsDto) {
    const session = await this.getOwnedSession(ownerId, uploadToken);
    if (session.mode !== 'MULTIPART' || !session.s3UploadId || !session.partCount) {
      throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST);
    }

    const uniqueParts = [...new Set(dto.partNumbers)].sort((a, b) => a - b);
    if (
      uniqueParts.length !== dto.partNumbers.length ||
      uniqueParts.some((p) => p > session.partCount!)
    ) {
      throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST);
    }

    const parts = await Promise.all(
      uniqueParts.map(async (partNumber) => ({
        partNumber,
        uploadUrl: await this.s3Service.createPresignedPartUrl(
          session.key,
          session.s3UploadId!,
          partNumber
        ),
      }))
    );
    return { uploadToken, parts, expiresInSeconds: 900 };
  }

  async completeMultipart(ownerId: number, uploadToken: string, dto: CompleteMediaUploadDto) {
    const session = await this.getOwnedSession(ownerId, uploadToken);
    if (session.mode !== 'MULTIPART' || !session.s3UploadId || !session.partCount) {
      throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST);
    }

    const parts = [...dto.parts].sort((a, b) => a.partNumber - b.partNumber);
    const uniqueParts = new Set(parts.map((part) => part.partNumber));
    if (
      parts.length !== session.partCount ||
      uniqueParts.size !== parts.length ||
      parts.some((part, index) => part.partNumber !== index + 1)
    ) {
      throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST);
    }

    await this.s3Service.completeMultipartUpload(session.key, session.s3UploadId, parts);
    return this.verifyAndFinish(uploadToken, session);
  }

  async completeSingle(ownerId: number, uploadToken: string) {
    const session = await this.getOwnedSession(ownerId, uploadToken);
    if (session.mode !== 'SINGLE') {
      throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST);
    }
    return this.verifyAndFinish(uploadToken, session);
  }

  async abort(ownerId: number, uploadToken: string): Promise<void> {
    const session = await this.getOwnedSession(ownerId, uploadToken);
    if (session.mode === 'MULTIPART' && session.s3UploadId) {
      await this.s3Service.abortMultipartUpload(session.key, session.s3UploadId);
    }
    await this.redisService.delete(this.sessionKey(uploadToken));
  }

  private async verifyAndFinish(uploadToken: string, session: MediaUploadSession) {
    const object = await this.s3Service.getObjectMetadata(session.key);
    if (object.size !== session.size || object.mimeType !== session.mimeType) {
      await this.s3Service.deleteFile(session.key);
      await this.redisService.delete(this.sessionKey(uploadToken));
      throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST);
    }

    await this.redisService.delete(this.sessionKey(uploadToken));
    return {
      key: session.key,
      url: this.s3Service.getFileUrl(session.key),
      mimeType: session.mimeType,
      size: session.size,
      processingStatus: session.mimeType.startsWith('video/') ? 'SOURCE_UPLOADED' : 'READY',
    };
  }

  private async getOwnedSession(ownerId: number, uploadToken: string) {
    const session = await this.redisService.get<MediaUploadSession>(this.sessionKey(uploadToken));
    if (!session || Number(session.ownerId) !== Number(ownerId)) {
      throw new BusinessException(ERROR_CODES.COMMON.NOT_FOUND);
    }
    return session;
  }

  private saveSession(uploadToken: string, session: MediaUploadSession) {
    return this.redisService.set(this.sessionKey(uploadToken), session, SESSION_TTL_SECONDS);
  }

  private sessionKey(uploadToken: string): string {
    return `media-upload:${uploadToken}`;
  }

  private buildObjectKey(ownerId: number, dto: CreateMediaUploadDto): string {
    const requestedFolder = dto.folder || 'uploads';
    const folder = requestedFolder.replace(/^\/+|\/+$/g, '');
    const extension = EXTENSION_BY_MIME_TYPE[dto.mimeType];
    return `media/${folder}/${ownerId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
  }
}
