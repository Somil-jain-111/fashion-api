import { Injectable } from '@nestjs/common';

@Injectable()
export class AppVersionHelper {
  isVersionLower(currentVersion: string, targetVersion: string): boolean {
    const currentParts = this.normalizeVersion(currentVersion);
    const targetParts = this.normalizeVersion(targetVersion);

    const maxLength = Math.max(currentParts.length, targetParts.length);

    for (let i = 0; i < maxLength; i++) {
      const current = currentParts[i] || 0;
      const target = targetParts[i] || 0;

      if (current < target) {
        return true;
      }

      if (current > target) {
        return false;
      }
    }

    return false;
  }

  isUpdateAvailable(
    currentVersion: string,
    latestVersion: string,
  ): boolean {
    return this.isVersionLower(currentVersion, latestVersion);
  }

  isForceUpdateRequired(
    currentVersion: string,
    minimumSupportedVersion: string,
    forceUpdate: boolean,
  ): boolean {
    return (
      forceUpdate ||
      this.isVersionLower(currentVersion, minimumSupportedVersion)
    );
  }

  formatReleaseNotes(releaseNotes?: string | null): string[] {
    if (!releaseNotes) {
      return [];
    }

    return releaseNotes
      .split('\n')
      .map((note) => note.replace('•', '').trim())
      .filter(Boolean);
  }

  private normalizeVersion(version: string): number[] {
    return version
      .split('.')
      .map((part) => Number(part))
      .map((part) => (Number.isNaN(part) ? 0 : part));
  }
}