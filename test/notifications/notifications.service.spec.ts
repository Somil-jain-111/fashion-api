import { Test } from '@nestjs/testing';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import {
  NotificationRepository,
  NotificationTemplateRepository,
} from 'src/modules/notifications/repository/notification.repository';
import { createMock } from '../utils/mock.util';
import { NotificationCategory, NotificationChannel } from 'src/modules/notifications/entities';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notifications: jest.Mocked<NotificationRepository>;
  let templates: jest.Mocked<NotificationTemplateRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationRepository, useValue: createMock<NotificationRepository>() },
        {
          provide: NotificationTemplateRepository,
          useValue: createMock<NotificationTemplateRepository>(),
        },
      ],
    }).compile();
    service = module.get(NotificationsService);
    notifications = module.get(NotificationRepository);
    templates = module.get(NotificationTemplateRepository);
  });

  it('renders only allow-listed template variables and stores a snapshot', async () => {
    templates.find.mockResolvedValue({
      code: 'PRODUCT_REJECTED',
      title: 'Product rejected',
      body: '{{productName}} rejected: {{reason}} {{secret}}',
      allowedVariables: ['productName', 'reason'],
    } as any);
    notifications.save.mockImplementation(async (value: any) => value);

    const result = await service.createFromTemplate({
      recipientId: 4,
      templateCode: 'PRODUCT_REJECTED',
      category: NotificationCategory.PRODUCT_APPROVAL,
      variables: { productName: 'Dress', reason: 'Dark image', secret: 'hidden' },
      dedupeKey: 'product:10:rejected:2',
    });

    expect(result.body).toBe('Dress rejected: Dark image ');
    expect(templates.find).toHaveBeenCalledWith('PRODUCT_REJECTED', NotificationChannel.IN_APP);
  });

  it('scopes read updates to the authenticated recipient', async () => {
    notifications.markRead.mockResolvedValue(true);
    await expect(service.markRead(7, 19)).resolves.toEqual({ updated: 'true' });
    expect(notifications.markRead).toHaveBeenCalledWith(19, 7);
  });
});
