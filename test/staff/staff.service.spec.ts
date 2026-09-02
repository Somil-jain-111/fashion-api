import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StaffService } from 'src/modules/staff/staff.service';
import { StaffRepository } from 'src/modules/staff/staff.repository';
import { UserRepository } from 'src/modules/auth/repository';
import { createMock } from '../utils/mock.util';
import { StaffStatus } from 'src/modules/staff/entities';

describe('StaffService', () => {
  let service: StaffService;
  let repository: jest.Mocked<StaffRepository>;
  let users: jest.Mocked<UserRepository>;
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: StaffRepository, useValue: createMock<StaffRepository>() },
        { provide: UserRepository, useValue: createMock<UserRepository>() },
        { provide: EventEmitter2, useValue: createMock<EventEmitter2>() },
      ],
    }).compile();
    service = m.get(StaffService);
    repository = m.get(StaffRepository);
    users = m.get(UserRepository);
  });
  it('creates a time-limited hashed invitation without returning the raw token', async () => {
    repository.findRole.mockResolvedValue({ id: 2, name: 'Order Staff' } as any);
    repository.findExisting.mockResolvedValue(null);
    repository.create.mockImplementation(async (data: any) => ({ id: 8, ...data }));
    const result = await service.invite(4, {
      fullName: 'Ravi Kumar',
      email: 'RAVI@example.com',
      mobile: '+919876543210',
      roleId: 2,
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerId: 4,
        email: 'ravi@example.com',
        status: StaffStatus.INVITED,
        inviteTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      4
    );
    expect(result).not.toHaveProperty('token');
  });
  it('rejects invitation acceptance by a different identity', async () => {
    repository.findByTokenHash.mockResolvedValue({
      id: 8,
      email: 'ravi@example.com',
      mobile: '+919876543210',
      inviteExpiresAt: new Date(Date.now() + 60000),
      status: StaffStatus.INVITED,
    } as any);
    users.findProfileSummaryById.mockResolvedValue({
      id: 9,
      email: 'other@example.com',
      mobile: '+911111111111',
    } as any);
    await expect(service.accept(9, { token: 'valid-looking-token' })).rejects.toMatchObject({
      response: { errorCode: 'STF_005' },
    });
  });
  it('cannot update staff belonging to another seller', async () => {
    repository.findEntity.mockResolvedValue(null);
    await expect(service.status(4, 99, StaffStatus.INACTIVE)).rejects.toMatchObject({
      response: { errorCode: 'STF_001' },
    });
  });
});
