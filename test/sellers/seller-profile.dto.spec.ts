import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSellerProfileDto } from 'src/modules/sellers/dto';
import { SellerBusinessType } from 'src/modules/sellers/entities';

const validProfile = {
  businessName: 'Fashion Store',
  panNumber: 'ABCDE1234F',
  streetAddress: '12 Market Road',
  city: 'Delhi',
  state: 'Delhi',
  pincode: '110001',
  contactName: 'Seller Name',
  contactEmail: 'seller@example.com',
  contactPhone: '9876543210',
};

describe('CreateSellerProfileDto', () => {
  it('allows an individual profile without GSTIN', async () => {
    const dto = plainToInstance(CreateSellerProfileDto, {
      ...validProfile,
      businessType: SellerBusinessType.INDIVIDUAL,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('requires GSTIN for a non-individual profile', async () => {
    const dto = plainToInstance(CreateSellerProfileDto, {
      ...validProfile,
      businessType: SellerBusinessType.PARTNERSHIP,
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'gstinNumber')).toBe(true);
  });
});
