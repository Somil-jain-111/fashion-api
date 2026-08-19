import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserRole } from '../enums/user-type.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // getAllAndOverride: a handler-level @Roles() wins over a class-level one (intentional
    // per-method override), but a class-level-only @Roles() must still be enforced — reading
    // only context.getHandler() silently no-ops every controller that applies @Roles() at
    // the class level instead of per-method.
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRoles: string[] = Array.isArray(request.user?.role)
      ? request.user.role
      : [request.user?.role].filter(Boolean);

    const hasRole = requiredRoles.some((role) =>
      userRoles.map((r) => r.toLowerCase()).includes(role.toLowerCase())
    );

    if (!hasRole) {
      throw new BusinessException(ERROR_CODES.AUTH.REQUIRED_ROLES_MISSING);
    }

    return true;
  }
}
