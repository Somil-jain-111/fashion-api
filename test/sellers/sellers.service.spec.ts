import { Test } from '@nestjs/testing';
import { SellersService } from 'src/modules/sellers/sellers.service';
import { UserRepository, RolesRepository } from 'src/modules/auth/repository';
import { StoreInformationRepository } from 'src/modules/sellers/repository';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { createMock } from '../utils/mock.util';

describe('SellersService', () => {
  let service: SellersService;
  let userRepository: jest.Mocked<UserRepository>;
  let rolesRepository: jest.Mocked<RolesRepository>;
  let storeInformationRepository: jest.Mocked<StoreInformationRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SellersService,
        { provide: UserRepository, useValue: createMock<UserRepository>() },
        { provide: RolesRepository, useValue: createMock<RolesRepository>() },
        { provide: StoreInformationRepository, useValue: createMock<StoreInformationRepository>() },
      ],
    }).compile();

    service = module.get(SellersService);
    userRepository = module.get(UserRepository);
    rolesRepository = module.get(RolesRepository);
    storeInformationRepository = module.get(StoreInformationRepository);
  });

  it('rejects an account that already holds the seller_admin role', async () => {
    userRepository.hasRole.mockResolvedValue(true);

    await expect(service.onboard(4, { storeName: 'My Store' })).rejects.toMatchObject({
      response: { errorCode: 'SEL_001' },
    });
    expect(storeInformationRepository.save).not.toHaveBeenCalled();
  });

  it('rejects when the seller_admin role does not exist in the DB', async () => {
    userRepository.hasRole.mockResolvedValue(false);
    rolesRepository.findByName.mockResolvedValue(null);

    await expect(service.onboard(4, { storeName: 'My Store' })).rejects.toMatchObject({
      response: { errorCode: 'ROL_001' },
    });
  });

  it('creates the store and grants the seller role on success, without touching existing roles', async () => {
    userRepository.hasRole.mockResolvedValue(false);
    rolesRepository.findByName.mockResolvedValue({ id: 3, name: UserRole.SELLER_ADMIN } as any);
    storeInformationRepository.save.mockResolvedValue({ storeName: 'My Store' } as any);
    userRepository.addRole.mockResolvedValue(undefined as any);

    const result = await service.onboard(4, { storeName: 'My Store' });

    expect(storeInformationRepository.save).toHaveBeenCalledWith({
      sellerId: 4,
      storeName: 'My Store',
    });
    expect(userRepository.addRole).toHaveBeenCalledWith(4, 3);
    expect(result).toEqual({ sellerId: 4, storeName: 'My Store' });
  });
});
