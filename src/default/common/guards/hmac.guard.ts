import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import * as crypto from "crypto";
import { ConfigService } from "@nestjs/config";
import { ERROR_CODES } from "src/default/error/error.code";
import { BusinessException } from "src/default/error/business.exception";

@Injectable()
export class HmacGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secretKey = this.configService.get<string>("ENCRYPTION_SECRET_KEY");
    const receivedSignature = request.headers["x-hmac"];
    if (!receivedSignature) {
      throw new UnauthorizedException("HMAC signature missing");
    }

    // Compute the expected HMAC signature
    // const computedHmac = crypto
    // .createHmac('sha256', process.env.HMAC_SECRET_KEY)
    // .update(data, 'utf8')
    // .digest('hex');
    const hmac = crypto.createHmac("sha256", secretKey);
    const requestBody = JSON.stringify(request.body);
    const computedSignature = hmac.update(requestBody).digest("hex");
    if (computedSignature !== receivedSignature) {
      throw new BusinessException(ERROR_CODES.AUTH.INVALID_HMAC_SIGNATURE);
    }

    return true; // Allow access if valid
  }
}
