import { Injectable } from '@nestjs/common';
import { AddressRepository, PincodeRepository } from 'src/modules/addresses/repository';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { PincodeResponseDTO } from './dto/pincode-response.dto';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { AddressListResponseDTO } from './dto/address-list-response.dto';
import { AddressResponseDTO } from './dto/address-response.dto';
import { PaginationQueryDto } from 'src/default/common/dto/pagination-query.dto';
import { UserAuthValidator } from '../auth/validators/user-auth.validator';
import { CreateAddressDto } from './dto/create-address.dto';
import { addressType } from 'src/default/common/enums/address.enum';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(
    private pincodeRepository: PincodeRepository,
    private addressRepository: AddressRepository,
    private userAuthValidator: UserAuthValidator
  ) {}

  async getStateAndCity(pincode: string): Promise<PincodeResponseDTO> {
    const tag = 'AddressService.getStateAndCity';

    ConsoleLogger.log('GET_STATE_CITY_BY_PINCODE_START', {
      tag,
      data: { pincode },
    });

    const pincodeDetails = await this.pincodeRepository.findOne({ pincode }, [
      'city',
      'city.state',
      'city.state.region',
    ]);

    if (!pincodeDetails) {
      ConsoleLogger.warn('PINCODE_DETAILS_NOT_FOUND', {
        tag,
        data: { pincode },
      });

      throw new BusinessException(ERROR_CODES.ADDRESS.PINCODE_NOT_FOUND);
    }

    const city = pincodeDetails.city;
    const state = city?.state;
    const region = state?.region;

    const response = new PincodeResponseDTO(
      pincodeDetails.pincode || '',
      {
        id: region?.id?.toString() || '',
        name: region?.name || '',
      },
      {
        id: state?.id?.toString() || '',
        name: state?.name || '',
      },
      {
        id: city?.id?.toString() || '',
        name: city?.name || '',
      }
    );

    ConsoleLogger.log('GET_STATE_CITY_BY_PINCODE_SUCCESS', {
      tag,
      data: { pincode },
    });

    return response;
  }

  async getMyAddresses(userId: number, query: PaginationQueryDto): Promise<AddressListResponseDTO> {
    const tag = 'AddressesService.getMyAddresses';

    const page = query.page || 1;
    const limit = query.limit || 10;

    ConsoleLogger.log('GET_MY_ADDRESSES_START', {
      tag,
      data: { userId, page, limit },
    });

    const [addresses, totalItems] = await this.addressRepository.findByUserIdPaginated(
      userId,
      page,
      limit
    );

    ConsoleLogger.log('GET_MY_ADDRESSES_SUCCESS', {
      tag,
      data: { userId, totalItems },
    });

    return new AddressListResponseDTO(addresses, totalItems, page, limit);
  }

  async getAddressById(userId: number, addressId: string): Promise<AddressResponseDTO> {
    const tag = 'AddressesService.getAddressById';

    ConsoleLogger.log('GET_ADDRESS_BY_ID_START', {
      tag,
      data: { userId, addressId },
    });

    const address = await this.addressRepository.findActiveAddressById(addressId, userId);

    if (!address) {
      ConsoleLogger.warn('ADDRESS_NOT_FOUND', {
        tag,
        data: { userId, addressId },
      });

      throw new BusinessException(ERROR_CODES.ADDRESS.ADDRESS_NOT_FOUND);
    }

    ConsoleLogger.log('GET_ADDRESS_BY_ID_SUCCESS', {
      tag,
      data: { userId, addressId },
    });

    return new AddressResponseDTO(address);
  }

  async createAddress(userId: number, dto: CreateAddressDto): Promise<AddressResponseDTO> {
    const tag = 'AddressesService.createAddress';

    ConsoleLogger.log('CREATE_ADDRESS_START', {
      tag,
      data: { userId },
    });

    await this.userAuthValidator.validateActiveUserById(userId);

    const [addresses] = await this.addressRepository.findByUserIdPaginated(userId, 1, 5);

    if (addresses.length >= 5) {
      throw new BusinessException(ERROR_CODES.ADDRESS.ADDRESS_LIMIT_EXCEEDED);
    }

    const pincodeDetails = await this.getStateAndCity(dto.pincode);

    const isDefault = addresses.length === 0;

    const address = await this.addressRepository.create({
      user: { id: userId } as any,
      name: dto.fullName,
      mobile: dto.mobile,
      address_line_1: dto.addressLine1,
      address_line_2: dto.addressLine2,
      landmark: dto.landmark,
      pincode: dto.pincode,
      city_name: pincodeDetails.city.name,
      state_name: pincodeDetails.state.name,
      zone_name: pincodeDetails.region?.name || null,
      addressType: isDefault ? addressType.Primary : addressType.Secondary,
      isDefault,
      status: 1,
    });

    const savedAddress = await this.addressRepository.save(address);

    ConsoleLogger.log('CREATE_ADDRESS_SUCCESS', {
      tag,
      data: { userId, addressId: savedAddress.id },
    });

    return new AddressResponseDTO(savedAddress);
  }

  async updateAddress(
    userId: number,
    addressId: string,
    dto: UpdateAddressDto
  ): Promise<AddressResponseDTO> {
    const tag = 'AddressesService.updateAddress';

    ConsoleLogger.log('UPDATE_ADDRESS_START', {
      tag,
      data: { userId, addressId },
    });

    await this.userAuthValidator.validateActiveUserById(userId);

    console.log("sssssss")
    const address = await this.addressRepository.findActiveAddressById(addressId, userId);
    console.log("sssssss")

    console.log(address)
    if (!address) {
      throw new BusinessException(ERROR_CODES.ADDRESS.ADDRESS_NOT_FOUND);
    }

    let pincodeDetails: any = null;

    if (dto.pincode) {
      pincodeDetails = await this.getStateAndCity(dto.pincode);
    }

    if (dto.fullName !== undefined) {
      address.name = dto.fullName;
    }

    if (dto.mobile !== undefined) {
      address.mobile = dto.mobile;
    }

    if (dto.addressLine1 !== undefined) {
      address.address_line_1 = dto.addressLine1;
    }

    if (dto.addressLine2 !== undefined) {
      address.address_line_2 = dto.addressLine2;
    }

    if (dto.landmark !== undefined) {
      address.landmark = dto.landmark;
    }

    if (dto.pincode !== undefined && pincodeDetails) {
      address.pincode = dto.pincode;
      address.city_name = pincodeDetails.city.name;
      address.state_name = pincodeDetails.city.state.name;
      address.zone_name = pincodeDetails.city.state.region?.name || null;
    }

    const updatedAddress = await this.addressRepository.save(address);

    ConsoleLogger.log('UPDATE_ADDRESS_SUCCESS', {
      tag,
      data: { userId, addressId },
    });

    console.log("updatedAddress",updatedAddress)
    return new AddressResponseDTO(updatedAddress);
  }

  async deleteAddress(userId: number, addressId: string) {
    const tag = 'AddressesService.deleteAddress';

    ConsoleLogger.log('DELETE_ADDRESS_START', {
      tag,
      data: { userId, addressId },
    });

    const address = await this.addressRepository.findActiveAddressById(addressId, userId);

    if (!address) {
      throw new BusinessException(ERROR_CODES.ADDRESS.ADDRESS_NOT_FOUND);
    }

    await this.addressRepository.softDeleteAddress(addressId, userId);

    ConsoleLogger.log('DELETE_ADDRESS_SUCCESS', {
      tag,
      data: { userId, addressId },
    });

    return {
      addressId: addressId.toString(),
    };
  }
}
