export type MediaUploadMode = 'SINGLE' | 'MULTIPART';

export interface MediaUploadSession {
  ownerId: number;
  mode: MediaUploadMode;
  key: string;
  mimeType: string;
  size: number;
  partSize?: number;
  partCount?: number;
  s3UploadId?: string;
}
