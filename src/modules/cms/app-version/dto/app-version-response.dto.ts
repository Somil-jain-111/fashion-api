import { AppVersionEntity } from '../entities/app-version.entity';

export class AppVersionResponseDto {
  id: string;
  platform: string;
  latestVersion: string;
  minimumSupportedVersion: string;
  forceUpdate: boolean;
  storeUrl?: string | null;
  releaseNotes?: string | null;
  isActive: boolean;
  maintenanceMode: boolean;
  maintenanceMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(entity: AppVersionEntity) {
    this.id = entity.id?.toString();
    this.platform = entity.platform;
    this.latestVersion = entity.latestVersion;
    this.minimumSupportedVersion = entity.minimumSupportedVersion;
    this.forceUpdate = entity.forceUpdate;
    this.storeUrl = entity.storeUrl ?? null;
    this.releaseNotes = entity.releaseNotes ?? null;
    this.isActive = entity.isActive;
    this.maintenanceMode = entity.maintenanceMode;
    this.maintenanceMessage = entity.maintenanceMessage ?? null;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }
}