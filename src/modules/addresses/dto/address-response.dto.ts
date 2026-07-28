import { Address } from '../entities/address.entity';

export class AddressResponseDTO {
  id: string;
  name: string | null;
  mobile: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  pincode: string;
  cityName: string | null;
  stateName: string | null;
  zoneName: string | null;
  addressType: string | null;

  constructor(address: Address) {
    this.id = address.id?.toString() || '';
    this.name = address.name || null;
    this.mobile = address.mobile?.toString() || '';
    this.addressLine1 = address.address_line_1 || '';
    this.addressLine2 = address.address_line_2 || null;
    this.landmark = address.landmark || null;
    this.pincode = address.pincode?.toString() || '';
    this.cityName = address.city_name || null;
    this.stateName = address.state_name || null;
    this.zoneName = address.zone_name || null;
    this.addressType = address.addressType || '';
  }
}
