import { of } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { SellerApprovalWriteInterceptor } from 'src/default/common/interceptors/seller-approval-write.interceptor';
import { SellerWriteAccessService } from 'src/default/common/services/seller-write-access.service';
import { UserRole } from 'src/default/common/enums/user-type.enum';

describe('SellerApprovalWriteInterceptor', () => {
  const next = { handle: jest.fn(() => of('ok')) } as any;
  const context = (request: any) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => 'handler',
      getClass: () => 'controller',
    }) as any;

  it('allows every GET request even when seller approval is pending', async () => {
    const reflector = { getAllAndOverride: jest.fn() } as any as Reflector;
    const access = { isApproved: jest.fn() } as any as SellerWriteAccessService;
    const interceptor = new SellerApprovalWriteInterceptor(reflector, access);
    await interceptor.intercept(context({ method: 'GET' }), next);
    expect(access.isApproved).not.toHaveBeenCalled();
  });

  it('blocks a pending seller POST on a seller endpoint', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === 'roles' ? [UserRole.SELLER_ADMIN] : false
      ),
    } as any as Reflector;
    const access = { isApproved: jest.fn().mockResolvedValue(false) } as any;
    const interceptor = new SellerApprovalWriteInterceptor(reflector, access);
    await expect(
      interceptor.intercept(
        context({ method: 'POST', user: { id: 7, role: [UserRole.SELLER_ADMIN] } }),
        next
      )
    ).rejects.toMatchObject({ response: { errorCode: 'SEL_000' } });
  });

  it('does not block customer endpoints for a dual customer/seller account', async () => {
    const reflector = { getAllAndOverride: jest.fn(() => undefined) } as any as Reflector;
    const access = { isApproved: jest.fn() } as any;
    const interceptor = new SellerApprovalWriteInterceptor(reflector, access);
    await interceptor.intercept(
      context({
        method: 'POST',
        url: '/api/v1/cart/items',
        user: { id: 7, role: [UserRole.CUSTOMER, UserRole.SELLER_ADMIN] },
      }),
      next
    );
    expect(access.isApproved).not.toHaveBeenCalled();
  });

  it('allows explicitly exempt KYC/profile writes', async () => {
    const reflector = { getAllAndOverride: jest.fn(() => true) } as any as Reflector;
    const access = { isApproved: jest.fn() } as any;
    const interceptor = new SellerApprovalWriteInterceptor(reflector, access);
    await interceptor.intercept(
      context({ method: 'POST', user: { id: 7, role: [UserRole.SELLER_ADMIN] } }),
      next
    );
    expect(access.isApproved).not.toHaveBeenCalled();
  });
});
