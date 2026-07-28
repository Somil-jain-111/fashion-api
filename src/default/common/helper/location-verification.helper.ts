import axios, { AxiosRequestConfig } from 'axios';
import { Injectable } from '@nestjs/common';
//
import { ERROR_CODES } from 'src/default/error/error.code';
import { AppConfigService } from 'src/default/config/config.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ApiResponseRepository } from 'src/modules/kyc/repository';

interface LocationResponse {
  success: Boolean;
  data: {
    city: string;
    state: string;
    pincode: string;
  } | null;
}

@Injectable()
export class LocationVerificationHelper {
  private GOOGLE_BASE_URL = `https://maps.googleapis.com/maps/api/geocode/json`;
  private OSM_BASE_URL = `https://nominatim.openstreetmap.org/reverse`;

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly apiResponseRepository: ApiResponseRepository
  ) {}

  /**
   * @Google Geocoding API
   *
   * @param lat
   * @param lng
   * @returns
   */
  async getLocationByGoogle(lat: number, lng: number): Promise<LocationResponse> {
    const geocodingKey = this.appConfigService.getGeocodingGoogleApiKey();

    if (!geocodingKey) {
      throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST_RESON, {
        reason: 'Geocoding API Key not found!',
      });
    }

    const requestConfig: AxiosRequestConfig = {
      method: 'GET',
      url: this.GOOGLE_BASE_URL,
      params: {
        latlng: `${lat},${lng}`,
        language: 'en',
        region: 'IN',
        key: geocodingKey,
      },
      headers: {
        'Accept-Language': 'en',
        'Content-Type': 'application/json',
        'User-Agent': `Campus/1.0`,
      },
    };

    const type = 'GOOGLE_GEOCODING';
    const transactionId = `${type}_${Date.now()}`;

    await this.apiResponseRepository.saveResponse({
      type: type,
      transactionId: transactionId,
      requestUrl: requestConfig.url,
      requestPayload: requestConfig,
    });

    let googleRes = null;

    try {
      googleRes = await axios(requestConfig);

      await this.apiResponseRepository.updateResponseByTransactionId(transactionId, googleRes.data);
    } catch (error) {
      const errorData = error.response?.data || {
        status: false,
        message: 'Unknown error',
      };

      await this.apiResponseRepository.updateResponseByTransactionId(transactionId, errorData);
    }

    if (googleRes.data.status === 'OK' && googleRes.data.results?.length) {
      const locationInfo = googleRes.data.results[0];

      const city = locationInfo.address_components.find((c: any) =>
        c.types.includes('locality')
      )?.long_name;

      const state =
        locationInfo.address_components.find((c: any) =>
          c.types.includes('administrative_area_level_1')
        )?.long_name || locationInfo.address_components[0]?.long_name;

      const pincode = locationInfo.address_components.find((c: any) =>
        c.types.includes('postal_code')
      )?.long_name;

      return {
        success: true,
        data: { city, state, pincode },
      };
    }

    return {
      success: false,
      data: null,
    };
  }

  /**
   * @OpenStreetMap Geocoding API
   *
   * @param lat
   * @param lng
   * @returns
   */
  async getLocationByOSM(lat: number, lng: number): Promise<LocationResponse> {
    const requestConfig: AxiosRequestConfig = {
      method: 'GET',
      url: this.OSM_BASE_URL,
      params: {
        format: 'json',
        lat: lat,
        lon: lng,
      },
      headers: {
        'Accept-Language': 'en',
        'User-Agent': `Campus/1.0`,
      },
    };

    const type = 'OSM_GEOCODING';
    const transactionId = `${type}_${Date.now()}`;

    let osmRes;

    await this.apiResponseRepository.saveResponse({
      type: type,
      transactionId: transactionId,
      requestUrl: requestConfig.url,
      requestPayload: requestConfig,
    });

    try {
      osmRes = await axios(requestConfig);

      await this.apiResponseRepository.updateResponseByTransactionId(transactionId, osmRes.data);
    } catch (error) {
      const errorData = error.response?.data || {
        status: false,
        message: 'Unknown error',
      };

      await this.apiResponseRepository.updateResponseByTransactionId(transactionId, errorData);
    }

    return {
      success: true,
      data: {
        city: osmRes.address.city,
        state: osmRes.address.state,
        pincode: osmRes.address.postcode,
      },
    };
  }
}
