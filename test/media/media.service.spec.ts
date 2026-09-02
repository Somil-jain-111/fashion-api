import { MediaService } from 'src/modules/media/media.service';
import { S3Service } from 'src/default/common/services/s3/s3.service';
import { RedisService } from 'src/default/databases/redis/redis.service';
import { createMock } from '../utils/mock.util';

describe('MediaService', () => {
  let service: MediaService;
  let s3: jest.Mocked<S3Service>;
  let redis: jest.Mocked<RedisService>;
  const sessions = new Map<string, any>();

  beforeEach(() => {
    s3 = createMock<S3Service>();
    redis = createMock<RedisService>();
    redis.set.mockImplementation(async (key: string, value: any) => {
      sessions.set(key, value);
      return 'OK';
    });
    redis.get.mockImplementation(async (key: string) => sessions.get(key) || null);
    redis.delete.mockImplementation(async (key: string) => Number(sessions.delete(key)));
    s3.createPresignedPutUrl.mockResolvedValue('https://signed-put');
    s3.createMultipartUpload.mockResolvedValue('s3-upload-id');
    s3.createPresignedPartUrl.mockImplementation(
      async (_key, _uploadId, part) => `https://signed-part/${part}`
    );
    s3.getFileUrl.mockImplementation((key) => `https://cdn.example/${key}`);
    service = new MediaService(s3, redis);
    sessions.clear();
  });

  it('returns a direct presigned PUT for a small image', async () => {
    const result = await service.createUpload(7, {
      fileName: 'shirt.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      folder: 'products',
    });

    expect(result).toMatchObject({ mode: 'SINGLE', uploadUrl: 'https://signed-put' });
    expect(s3.createPresignedPutUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^media\/products\/7\//),
      'image/jpeg'
    );
  });

  it('creates and signs a multipart upload for a large video', async () => {
    const initiated = await service.createUpload(7, {
      fileName: 'demo.mp4',
      mimeType: 'video/mp4',
      size: 100 * 1024 * 1024,
    });

    expect(initiated).toMatchObject({ mode: 'MULTIPART', partCount: 10 });
    const signed = await service.signParts(7, initiated.uploadToken, { partNumbers: [1, 2] });
    expect(signed.parts).toEqual([
      { partNumber: 1, uploadUrl: 'https://signed-part/1' },
      { partNumber: 2, uploadUrl: 'https://signed-part/2' },
    ]);
  });

  it('verifies final object size and content type before returning its URL', async () => {
    const initiated = await service.createUpload(7, {
      fileName: 'invoice.pdf',
      mimeType: 'application/pdf',
      size: 1000,
    });
    s3.getObjectMetadata.mockResolvedValue({ size: 1000, mimeType: 'application/pdf' });

    await expect(service.completeSingle(7, initiated.uploadToken)).resolves.toMatchObject({
      mimeType: 'application/pdf',
      size: 1000,
      processingStatus: 'READY',
    });
  });

  it('does not allow another user to control an upload session', async () => {
    const initiated = await service.createUpload(7, {
      fileName: 'shirt.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
    });

    await expect(service.completeSingle(8, initiated.uploadToken)).rejects.toMatchObject({
      response: { errorCode: 'COM_003' },
    });
  });
});
