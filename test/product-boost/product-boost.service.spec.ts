import { createHmac } from 'crypto';
import { ProductBoostService } from 'src/modules/product-boost/product-boost.service';
import { ProductBoostRepository } from 'src/modules/product-boost/product-boost.repository';
import { ProductRepository } from 'src/modules/products/repository';
import { TransactionService } from 'src/default/databases/transaction';
import { AppConfigService } from 'src/default/config/config.service';
import { ProductStatus } from 'src/default/common/enums/product.enum';
import { BoostOrderStatus, BoostTargetType } from 'src/modules/product-boost/entities';
import { createMock } from '../utils/mock.util';
import { SellerKycService } from 'src/modules/seller-kyc/seller-kyc.service';

describe('ProductBoostService', () => {
  let service: ProductBoostService;
  let boosts: jest.Mocked<ProductBoostRepository>;
  let products: jest.Mocked<ProductRepository>;
  let transactions: jest.Mocked<TransactionService>;
  let config: jest.Mocked<AppConfigService>;
  let sellerKyc: jest.Mocked<SellerKycService>;

  beforeEach(() => {
    boosts = createMock<ProductBoostRepository>();
    products = createMock<ProductRepository>();
    transactions = createMock<TransactionService>();
    config = createMock<AppConfigService>();
    sellerKyc = createMock<SellerKycService>();
    transactions.execute.mockImplementation(async (callback: any) => callback({}));
    config.get.mockImplementation((key: string) => {
      if (key === 'BOOST_PRICE_PER_DAY') return '125';
      if (key === 'BOOST_CATEGORY_PRICE_MULTIPLIER') return '2';
      return 'test-webhook-secret';
    });
    sellerKyc.isSellerKycApproved.mockResolvedValue(true);
    service = new ProductBoostService(boosts, products, transactions, config, sellerKyc);
  });

  it('creates a server-priced pending payment order for an owned approved product', async () => {
    products.findBoostEligibilityForUpdate.mockResolvedValue({
      id: 4,
      sellerId: 8,
      categoryId: 3,
      status: ProductStatus.APPROVED,
    } as any);
    boosts.hasPendingOrActiveBoost.mockResolvedValue(false);
    boosts.createOrder.mockImplementation(async (data: any) => ({ id: 1, ...data }));
    boosts.createOrderItems.mockImplementation(async (data: any[]) =>
      data.map((item, index) => ({ id: index + 1, ...item }))
    );

    const result = await service.createOrder(8, {
      items: [{ productId: 4, targetType: BoostTargetType.CATEGORY, durationDays: 3 }],
    });

    expect(result).toMatchObject({ amount: 750, currency: 'INR' });
    expect(boosts.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 750 }),
      expect.anything()
    );
    expect(boosts.createOrderItems).toHaveBeenCalledWith(
      [expect.objectContaining({ productId: 4, categoryId: 3, lineAmount: 750 })],
      expect.anything()
    );
  });

  it('creates one payment order containing multiple uniquely selected products', async () => {
    products.findBoostEligibilityForUpdate
      .mockResolvedValueOnce({
        id: 4,
        sellerId: 8,
        categoryId: 3,
        status: ProductStatus.APPROVED,
      } as any)
      .mockResolvedValueOnce({
        id: 5,
        sellerId: 8,
        categoryId: 7,
        status: ProductStatus.APPROVED,
      } as any);
    boosts.hasPendingOrActiveBoost.mockResolvedValue(false);
    boosts.createOrder.mockImplementation(async (data: any) => ({ id: 1, ...data }));
    boosts.createOrderItems.mockImplementation(async (data: any[]) =>
      data.map((item, index) => ({ id: index + 1, ...item }))
    );

    const result = await service.createOrder(8, {
      items: [
        { productId: 5, targetType: BoostTargetType.CATEGORY, durationDays: 2 },
        { productId: 4, targetType: BoostTargetType.PRODUCT, durationDays: 3 },
      ],
    });

    expect(result).toMatchObject({ amount: 875, currency: 'INR' });
    expect(result.items).toHaveLength(2);
    expect(products.findBoostEligibilityForUpdate.mock.calls.map(([id]) => id)).toEqual([4, 5]);
    expect(boosts.createOrder).toHaveBeenCalledTimes(1);
    expect(boosts.createOrderItems).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ productId: 4, lineAmount: 375 }),
        expect.objectContaining({ productId: 5, lineAmount: 500 }),
      ]),
      expect.anything()
    );
  });

  it('rejects boosting another seller product', async () => {
    products.findBoostEligibilityForUpdate.mockResolvedValue({
      id: 4,
      sellerId: 99,
      categoryId: 3,
      status: ProductStatus.APPROVED,
    } as any);

    await expect(
      service.createOrder(8, {
        items: [{ productId: 4, targetType: BoostTargetType.PRODUCT, durationDays: 1 }],
      })
    ).rejects.toMatchObject({ response: { errorCode: 'BST_001' } });
  });

  it('activates a campaign only after a correctly signed matching payment', async () => {
    const body = Buffer.from(
      JSON.stringify({ orderId: 'order-1', paymentId: 'pay-1', amount: 250, currency: 'INR' })
    );
    const signature = createHmac('sha256', 'test-webhook-secret').update(body).digest('hex');
    boosts.findOrderForUpdate.mockResolvedValue({
      id: 1,
      publicId: 'order-1',
      sellerId: 8,
      amount: 250,
      currency: 'INR',
      status: BoostOrderStatus.PENDING_PAYMENT,
      expiresAt: new Date(Date.now() + 60_000),
      items: [
        {
          id: 10,
          orderId: 1,
          productId: 4,
          categoryId: 3,
          targetType: BoostTargetType.PRODUCT,
          durationDays: 2,
          lineAmount: 250,
        },
      ],
    } as any);
    boosts.paymentIdExists.mockResolvedValue(false);

    await expect(
      service.processPayment(
        { orderId: 'order-1', paymentId: 'pay-1', amount: 250, currency: 'INR' },
        body,
        signature
      )
    ).resolves.toEqual({ processed: true, idempotent: false });
    expect(boosts.activatePaidOrder).toHaveBeenCalled();
  });

  it('rejects an invalid payment webhook signature', async () => {
    await expect(
      service.processPayment(
        { orderId: 'order-1', paymentId: 'pay-1', amount: 250, currency: 'INR' },
        Buffer.from('{}'),
        'bad-signature'
      )
    ).rejects.toMatchObject({ response: { errorCode: 'BST_004' } });
  });
});
