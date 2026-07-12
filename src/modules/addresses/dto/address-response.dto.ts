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
  isDefault: boolean;

  constructor(address: any) {
    this.id = address.id?.toString() || '';
    this.name = address.name || null;
    this.mobile = address.mobile?.toString() || '';
    this.addressLine1 = address.addressLine1 || address.address || '';
    this.addressLine2 = address.addressLine2 || null;
    this.landmark = address.landmark || null;
    this.pincode = address.pincode?.toString() || '';
    this.cityName = address.cityName || null;
    this.stateName = address.stateName || null;
    this.zoneName = address.zoneName || null;
    this.addressType = address.addressType || address.address_type || null;
    this.isDefault = Boolean(address.isDefault);
  }
}
