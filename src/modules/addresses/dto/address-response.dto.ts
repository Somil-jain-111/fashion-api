import { ApiProperty } from '@nestjs/swagger';
import { Address } from '../entities/address.entity';

export class AddressResponseDTO {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  name: string | null;

  @ApiProperty()
  mobile: string;

  @ApiProperty()
  addressLine1: string;

  @ApiProperty({ nullable: true })
  addressLine2: string | null;

  @ApiProperty({ nullable: true })
  landmark: string | null;

  @ApiProperty()
  pincode: string;

  @ApiProperty({ nullable: true })
  cityName: string | null;

  @ApiProperty({ nullable: true })
  stateName: string | null;

  @ApiProperty({ nullable: true })
  zoneName: string | null;

  @ApiProperty({ nullable: true })
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
