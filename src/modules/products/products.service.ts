import { Injectable, NotFoundException } from '@nestjs/common';

import * as products from './mock/products.json';
import * as categories from './mock/categories.json';
import * as subCategories from './mock/sub-categories.json';

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

    if (query.sortBy === 'PRICE_LOW_TO_HIGH') {
      data.sort((a, b) => a.price - b.price);
    }

    if (query.sortBy === 'PRICE_HIGH_TO_LOW') {
      data.sort((a, b) => b.price - a.price);
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
