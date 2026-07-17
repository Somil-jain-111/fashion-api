export class AnnouncementResponseDto {
  id: string;
  title: string;
  message: string;
  type: string;
  image?: string | null;
  redirectUrl?: string | null;
  priority: number;
  isDismissible: boolean;
  isActive: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  roles: {
    id: string;
    name: string;
  }[];

  constructor(announcement: any) {
    this.id = announcement.id?.toString();
    this.title = announcement.title;
    this.message = announcement.message;
    this.type = announcement.type;
    this.image = announcement.image ?? null;
    this.redirectUrl = announcement.redirectUrl ?? null;
    this.priority = announcement.priority;
    this.isDismissible = announcement.isDismissible;
    this.isActive = announcement.isActive;
    this.startDate = announcement?.startDate.toISOString() ?? null;
    this.endDate = announcement?.endDate.toISOString() ?? null;
    this.roles =
      announcement.roles?.map((role: any) => ({
        id: role.id?.toString(),
        name: role.name,
      })) ?? [];
  }
}
