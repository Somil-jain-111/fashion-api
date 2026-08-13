import { Injectable, NotFoundException } from '@nestjs/common';

import products from './mock/products.json';
import categories from './mock/categories.json';
import subCategories from './mock/sub-categories.json';

import { ProductsMapper } from './mapper/products.mapper';
import { PaginationHelper } from './helper/pagination.helper';

@Injectable()
export class ProductsService {
  async findAll(query: any) {
    let data = [...products];

    if (query.categoryId) {
      data = data.filter((x) => x.categoryId === Number(query.categoryId));
    }

    if (query.subCategoryId) {
      data = data.filter((x) => x.subCategoryId === Number(query.subCategoryId));
    }

    if (query.search) {
      data = data.filter((x) => x.name.toLowerCase().includes(query.search.toLowerCase()));
    }

    if (query.minPrice !== undefined) {
      data = data.filter((x) => x.price >= Number(query.minPrice));
    }

    if (query.maxPrice !== undefined) {
      data = data.filter((x) => x.price <= Number(query.maxPrice));
    }

    if (query.minDiscount !== undefined) {
      data = data.filter((x) => x.discount >= Number(query.minDiscount));
    }

    if (query.isNew === 'true') {
      data = data.filter((x) => x.isNew === true);
    }

    if (query.size) {
      data = data.filter((x) =>
        x.sizes?.some((s) => s.size === query.size && s.isAvailable)
      );
    }

    if (query.color) {
      data = data.filter((x) =>
        x.colors?.some((c) => c.name.toLowerCase() === query.color.toLowerCase())
      );
    }

    if (query.sortBy === 'PRICE_LOW_TO_HIGH') {
      data.sort((a, b) => a.price - b.price);
    }

    if (query.sortBy === 'PRICE_HIGH_TO_LOW') {
      data.sort((a, b) => b.price - a.price);
    }

    if (query.sortBy === 'DISCOUNT') {
      data.sort((a, b) => b.discount - a.discount);
    }

    if (query.sortBy === 'NEWEST') {
      data.sort((a, b) => Number(b.isNew) - Number(a.isNew));
    }

    if (query.sortBy === 'POPULAR') {
      data.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    return PaginationHelper.paginate(data.map(ProductsMapper.toList), query.page, query.pageSize);
  }

  async findOne(id: number) {
    const product = products.find((x) => x.id === id);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      data: ProductsMapper.toDetails(product),
    };
  }

  async getCategories(query: any) {
    return PaginationHelper.paginate(categories, query.page, query.pageSize);
  }

  async getSubCategories(categoryId: number, query: any) {
    const data = subCategories.filter((x) => x.categoryId === categoryId);

    return PaginationHelper.paginate(data, query.page, query.pageSize);
  }
}
