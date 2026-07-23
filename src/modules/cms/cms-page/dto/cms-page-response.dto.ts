import { CmsPageEntity } from '../entities/cms-page.entity';

export class CmsPageResponseDto {
  id: string;
  type: string;
  title: string;
  description: string;
  url?: string | null;
  version: number;
  roles: {
    id: string;
    name: string;
  }[];

  constructor(cmsPage: CmsPageEntity) {
    this.id = cmsPage.id?.toString();
    this.type = cmsPage.type;
    this.title = cmsPage.title;
    this.description = cmsPage.description;
    this.url = cmsPage.url ?? null;
    this.version = cmsPage.version;
    this.roles =
      cmsPage.roles?.map((role: any) => ({
        id: role.id?.toString(),
        name: role.name,
      })) ?? [];
  }
}
