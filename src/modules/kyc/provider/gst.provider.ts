import { Injectable } from "@nestjs/common";
import axios, { AxiosRequestConfig } from "axios";
import { KycHmacHelper } from "src/default/common/helper/kyc-hmac.helper";
import { AppConfigService } from "src/default/config/config.service";
import { BusinessException } from "src/default/error/business.exception";
import { ERROR_CODES } from "src/default/error/error.code";
import { ConsoleLogger } from "src/default/logger/console/console.service";

type GstVerifyInput = {
  gstNumber: string;
  transactionId: string;
};

export type GstVerifyResult = {
  success: boolean;
  requestConfig: AxiosRequestConfig;
  requestPayload: Record<string, any>;
  responseData: any;
  statusCode: number;
  message: string;
};

@Injectable()
export class GstProvider {
  constructor(private readonly configService: AppConfigService) {}

  async verifyGst(data: GstVerifyInput): Promise<GstVerifyResult> {
    const gst = data.gstNumber.toUpperCase();

    const payload = {
      type: "kyc_gst",
      id_number: gst,
      transaction_id: data.transactionId,
    };

    const isLive =
      this.configService.get("NODE_ENV") === "production" ||
      this.configService.get("NODE_ENV") === "qa";

    const baseUrl = isLive
      ? this.configService.get("Rewards_API_Base_Url_Live")
      : this.configService.get("Rewards_API_Base_Url_Dev");

    const permanentToken = isLive
      ? this.configService.get("Rewards_API_Permanent_Token_Live")
      : this.configService.get("Rewards_API_Permanent_Token_Dev");

    const secretKey = this.configService.get("KYC_SECRET_KEY");

    if (!secretKey) {
      throw new BusinessException(ERROR_CODES.KYC.KYC_SECRET_KEY_MISSING);
    }

    const requestConfig: AxiosRequestConfig = {
      method: "post",
      url: `${baseUrl}/gratification/kyc`,
      headers: {
        "x-hmac": KycHmacHelper.generateSecretKey(
          { result: payload },
          secretKey,
        ),
        permanent_token: permanentToken,
        "content-type": "application/json",
      },
      data: payload,
    };

    try {
      const response = await axios.request(requestConfig);

      return {
        success: Boolean(response.data?.status),
        requestConfig,
        requestPayload: payload,
        responseData: response.data,
        statusCode: response.status,
        message: response.data?.message || "GST verification successful",
      };
    } catch (error) {
      const errorResponse = error.response?.data || {
        status: false,
        message: "Unknown error",
      };

      const statusCode =
        errorResponse?.data?.statuscode || error.response?.status || 400;

      ConsoleLogger.error("GST_PROVIDER_ERROR", error?.stack, {
        tag: "GstProvider.verifyGst",
        data: {
          gst,
          statusCode,
          errorResponse,
        },
      });

      return {
        success: false,
        requestConfig,
        requestPayload: payload,
        responseData: errorResponse,
        statusCode,
        message: errorResponse.message || "GST verification failed",
      };
    }
  }
}
