import { Injectable } from '@nestjs/common';

@Injectable()
export class CmsPageHelper {
  generateUrlSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  normalizeUrl(url?: string, title?: string): string | null {
    if (url) {
      return this.generateUrlSlug(url);
    }

    if (title) {
      return this.generateUrlSlug(title);
    }

    return null;
  }
}
