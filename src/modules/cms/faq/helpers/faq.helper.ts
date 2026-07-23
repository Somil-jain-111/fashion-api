import { Injectable } from '@nestjs/common';

@Injectable()
export class FaqHelper {
  generateUrlSlug(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  normalizeUrl(url?: string, question?: string): string | null {
    if (url) {
      return this.generateUrlSlug(url);
    }

    if (question) {
      return this.generateUrlSlug(question);
    }

    return null;
  }
}