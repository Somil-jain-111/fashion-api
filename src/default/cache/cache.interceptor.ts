import { Injectable, ExecutionContext, Inject } from "@nestjs/common";
import { CacheInterceptor, CACHE_MANAGER } from "@nestjs/cache-manager";
import { Reflector } from "@nestjs/core";
import { Cache } from "cache-manager";

@Injectable()
export class CustomCacheInterceptor extends CacheInterceptor {
  protected readonly reflector: Reflector; // Match the access modifier of the base class

  constructor(
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    reflector: Reflector,
  ) {
    super(cacheManager, reflector);
    this.reflector = reflector;
  }

  trackBy(context: ExecutionContext): string | undefined {
    const noCache = this.reflector.get<boolean>(
      "no-cache",
      context.getHandler(),
    );
    if (noCache) {
      return undefined;
    }
    return super.trackBy(context);
  }
}
