import { AxiosRequestConfig } from "axios";

export interface ProductProviderResult<T = any> {
  success: boolean;
  requestConfig: AxiosRequestConfig;
  requestPayload?: any;
  responseData: T;
  statusCode: number;
  message: string;
}