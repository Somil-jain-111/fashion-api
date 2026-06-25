export class LocationValueDTO {
  id: string;
  name: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
}

export class PincodeResponseDTO {
  pincode: string;
  region: LocationValueDTO;
  state: LocationValueDTO;
  city: LocationValueDTO;

  constructor(
    pincode: string,
    region: LocationValueDTO,
    state: LocationValueDTO,
    city: LocationValueDTO
  ) {
    this.pincode = pincode;
    this.region = region;
    this.state = state;
    this.city = city;
  }
}
