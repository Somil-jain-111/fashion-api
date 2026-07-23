import { BannerEntity } from '../entities/banner.entity';

export class BannerResponseDto {
  id: string;
  title: string;
  subtitle?: string | null;
  image: string;
  position: string;
  redirectType: string;
  redirectValue?: string | null;
  priority: number;
  roles: {
    id: string;
    name: string;
  }[];

  constructor(banner: BannerEntity) {
    this.id = banner.id?.toString();
    this.title = banner.title;
    this.subtitle = banner.subtitle ?? null;
    this.image = banner.image;
    this.position = banner.position;
    this.redirectType = banner.redirectType;
    this.redirectValue = banner.redirectValue ?? null;
    this.priority = banner.priority;
    this.roles =
      banner.roles?.map((role: any) => ({
        id: role.id?.toString(),
        name: role.name,
      })) ?? [];
  }
}
