import { VideoEntity } from '../entities/video.entity';

export class VideoResponseDto {
  id: string;
  title: string;
  description?: string | null;
  link: string;
  thumbnailUrl?: string | null;
  priority: number;
  isActive: boolean;
  roles: {
    id: string;
    name: string;
  }[];

  constructor(video: VideoEntity) {
    this.id = video.id?.toString();
    this.title = video.title;
    this.description = video.description ?? null;
    this.link = video.link;
    this.thumbnailUrl = video.thumbnailUrl ?? null;
    this.priority = video.priority;
    this.isActive = video.isActive;
    this.roles =
      video.roles?.map((role: any) => ({
        id: role.id?.toString(),
        name: role.name,
      })) ?? [];
  }
}
