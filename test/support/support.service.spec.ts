import { Test } from '@nestjs/testing';
import { SupportService } from 'src/modules/support/support.service';
import { SupportRepository } from 'src/modules/support/support.repository';
import { createMock } from '../utils/mock.util';
import { SupportTicketStatus } from 'src/modules/support/entities';

describe('SupportService', () => {
  let service: SupportService;
  let repository: jest.Mocked<SupportRepository>;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: SupportRepository, useValue: createMock<SupportRepository>() },
      ],
    }).compile();
    service = module.get(SupportService);
    repository = module.get(SupportRepository);
  });

  it('returns a safe overview assembled from DB-backed articles, categories and seller tickets', async () => {
    repository.articles.mockResolvedValue([
      { id: 1, type: 'FAQ', title: 'Question', content: 'Answer' },
    ] as any);
    repository.categories.mockResolvedValue([{ id: 2, code: 'ORDERS', name: 'Orders' }] as any);
    repository.list.mockResolvedValue({ items: [], total: 0 });
    const result = await service.overview(7);
    expect(repository.list).toHaveBeenCalledWith(7, undefined, 1, 5);
    expect(result.faqs[0]).toEqual(expect.objectContaining({ id: '1', title: 'Question' }));
  });

  it('requires resolution remarks before an admin resolves a ticket', async () => {
    await expect(
      service.adminUpdate(9, { status: SupportTicketStatus.RESOLVED })
    ).rejects.toMatchObject({ response: { errorCode: 'SUP_002' } });
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('returns not found when a seller cannot access a ticket', async () => {
    repository.detail.mockResolvedValue(null);
    await expect(service.detail(7, 99)).rejects.toMatchObject({
      response: { errorCode: 'SUP_001' },
    });
    expect(repository.detail).toHaveBeenCalledWith(99, 7);
  });
});
