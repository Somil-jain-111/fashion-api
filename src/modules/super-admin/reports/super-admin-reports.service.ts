import { Injectable } from '@nestjs/common';
import { SuperAdminReportsRepository } from './repository/super-admin-reports.repository';
import {
  ListDbtPayoutsQueryDto,
  ListPointsQueryDto,
  ListRedemptionOrdersQueryDto,
  ListStockOrdersQueryDto,
} from './dto';

function paginate(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

@Injectable()
export class SuperAdminReportsService {
  constructor(private readonly reports: SuperAdminReportsRepository) {}

  async redemptionOrders(query: ListRedemptionOrdersQueryDto) {
    const { items, total } = await this.reports.listRedemptionOrders({
      userId: query.userId,
      status: query.status,
      orderType: query.orderType,
      productType: query.productType,
      deliveryStatus: query.deliveryStatus,
      search: query.search,
      fromDate: query.fromDate,
      toDate: query.toDate,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: items.map((order) => ({
        id: order.id,
        orderNumber: order.order_number,
        orderType: order.order_type,
        status: order.status,
        totalItems: order.totalItems,
        orderDate: order.order_date,
        estimatedDate: order.estimated_date,
        remarks: order.remarks,
        totalPoints: Number(order.total_points),
        taxablePoints: Number(order.taxable_points),
        tdsPercentage: order.tds_percentage,
        tdsPoints: Number(order.tds_points),
        grandTotalPoints: Number(order.grand_total_points),
        userId: order.user?.id,
        userName: order.user?.firmName ?? order.user?.username,
        userMobile: order.user?.mobile,
        createdAt: order.createdAt,
        items: (order.items ?? []).map((item) => ({
          id: item.id,
          orderNumber: item.orderNumber,
          productId: item.productId,
          productName: item.productName,
          productType: item.productType,
          productSku: item.productSku,
          productImageUrl: item.productImageUrl,
          shortDesc: item.shortDesc,
          pricePoint: item.pricePoint,
          quantity: item.quantity,
          totalPoints: item.totalPoints,
          cost: item.cost,
          mrp: item.mrp,
          status: item.status,
          shippingDetail: item.shippingDetail
            ? {
                id: item.shippingDetail.id,
                shipDate: item.shippingDetail.ship_date,
                trackingNumber: item.shippingDetail.tracking_number,
                trackingUrl: item.shippingDetail.tracking_url,
                podLink: item.shippingDetail.pod_link,
                deliveryPartner: item.shippingDetail.delivery_partner,
                remarks: item.shippingDetail.remarks,
                addressLine1: item.shippingDetail.addressLine1,
                addressLine2: item.shippingDetail.addressLine2,
                landmark: item.shippingDetail.landmark,
                pincode: item.shippingDetail.pincode,
                cityName: item.shippingDetail.cityName,
                stateName: item.shippingDetail.stateName,
                zoneName: item.shippingDetail.zoneName,
                deliveryStatus: item.shippingDetail.delivery_status,
                fullname: item.shippingDetail.fullname,
                mobile: item.shippingDetail.mobile,
              }
            : null,
          voucher: item.voucher
            ? {
                id: item.voucher.id,
                couponCode: item.voucher.coupon_code,
                vPin: item.voucher.v_pin,
                expiryDate: item.voucher.expiry_date,
              }
            : null,
        })),
      })),
      pagination: paginate(query.page, query.limit, total),
    };
  }

  async stockOrders(query: ListStockOrdersQueryDto) {
    const { items, total } = await this.reports.listStockOrders({
      userId: query.userId,
      distributorId: query.distributorId,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: items.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        source: order.source,
        status: order.status,
        totalQuantity: order.totalQuantity,
        totalPayable: Number(order.totalPayable),
        userId: order.user?.id,
        userName: order.user?.firmName ?? order.user?.username,
        distributorId: order.distributor?.id,
        distributorName: order.distributor?.firmName ?? order.distributor?.username,
        createdAt: order.createdAt,
      })),
      pagination: paginate(query.page, query.limit, total),
    };
  }

  async points(query: ListPointsQueryDto) {
    const { items, total } = await this.reports.listPoints({
      userId: query.userId,
      type: query.type,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: items.map((entry) => ({
        id: entry.id,
        points: entry.points,
        type: entry.type,
        status: entry.status,
        description: entry.description,
        userRemainingPoints: entry.user_remaining_points,
        userId: entry.user?.id,
        userName: entry.user?.firmName ?? entry.user?.username,
        date: entry.date,
      })),
      pagination: paginate(query.page, query.limit, total),
    };
  }

  async dbtPayouts(query: ListDbtPayoutsQueryDto) {
    const { items, total } = await this.reports.listDbtPayouts({
      userId: query.userId,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: items.map((payout) => ({
        id: payout.id,
        transactionId: payout.transaction_id,
        points: payout.points,
        amount: Number(payout.amount),
        status: payout.status,
        bankName: payout.bank_name,
        accountNumber: payout.account_number,
        userId: payout.user?.id,
        userName: payout.user?.firmName ?? payout.user?.username,
        createdAt: payout.createdAt,
      })),
      pagination: paginate(query.page, query.limit, total),
    };
  }
}
