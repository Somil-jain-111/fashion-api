export class ProductAttributeResponseDto {
  key!: string;
  optionId!: string;
  value!: string;
}

export class ProductVariantResponseDto {
  id!: string;
  colorOptionId!: string;
  sizeOptionId!: string;
  size!: string;
  sku!: string;
  priceOverride!: string;
  stockQuantity!: string;
}

export class ProductImageResponseDto {
  id!: string;
  variantId!: string;
  url!: string;
  isPrimary!: string;
  sortOrder!: string;
}

export class ProductCategoryResponseDto {
  id!: string;
  name!: string;
  slug!: string;
  parentId!: string;
  commissionRate!: string;
}

/** API contract: all scalar response fields are strings. */
export class ProductResponseDto {
  id!: string;
  sellerId!: string;
  categoryId!: string;
  name!: string;
  sellerSku!: string;
  brandOptionId!: string;
  productTypeOptionId!: string;
  genderOptionId!: string;
  countryOptionId!: string;
  shortDescription!: string;
  description!: string;
  highlights!: string;
  materialAndFabric!: string;
  careInstructions!: string;
  attributeValues!: ProductAttributeResponseDto[];
  basePrice!: string;
  wholesalePrice!: string;
  mrp!: string;
  discountPercentage!: string;
  currentPrice!: string;
  zone!: string;
  status!: string;
  rejectionReason!: string;
  ratingAverage!: string;
  ratingCount!: string;
  reviewedBy!: string;
  reviewedAt!: string;
  createdAt!: string;
  updatedAt!: string;
  category?: ProductCategoryResponseDto;
  variants?: ProductVariantResponseDto[];
  images?: ProductImageResponseDto[];
}

export class ProductListResponseDto {
  items!: ProductResponseDto[];
  page!: string;
  limit!: string;
  total!: string;
  totalPages!: string;
}

export class AdminProductSellerResponseDto {
  id!: string;
  uuid!: string;
  username!: string;
  email!: string;
  mobile!: string;
  status!: string;
  imageUrl!: string;
  ratingAverage!: string;
  ratingCount!: string;
  storeName!: string;
  businessType!: string;
  city!: string;
  state!: string;
  contactName!: string;
  contactEmail!: string;
  contactPhone!: string;
  onboardingStatus!: string;
}

export class AdminProductResponseDto extends ProductResponseDto {
  sellerBasicDetails!: AdminProductSellerResponseDto;
}

export class ProductAuditResponseDto {
  id!: string;
  resourceType!: string;
  resourceId!: string;
  actorId!: string;
  actorRole!: string;
  action!: string;
  changes!: Record<string, unknown>;
  createdAt!: string;
}

export class AdminProductDetailResponseDto extends AdminProductResponseDto {
  audit!: ProductAuditResponseDto[];
}

export class AdminProductListResponseDto {
  items!: AdminProductResponseDto[];
  page!: string;
  limit!: string;
  total!: string;
  totalPages!: string;
}

export class ProductOptionResponseDto {
  id!: string;
  code!: string;
  label!: string;
}

export class ProductCategoryOptionResponseDto {
  id!: string;
  name!: string;
  parentId!: string;
  commissionRate!: string;
}

export class ProductDropdownsResponseDto {
  brands!: ProductOptionResponseDto[];
  productTypes!: ProductOptionResponseDto[];
  genders!: ProductOptionResponseDto[];
  countries!: ProductOptionResponseDto[];
  materials!: ProductOptionResponseDto[];
  fits!: ProductOptionResponseDto[];
  neckTypes!: ProductOptionResponseDto[];
  sleeves!: ProductOptionResponseDto[];
  occasions!: ProductOptionResponseDto[];
  colors!: ProductOptionResponseDto[];
  sizes!: ProductOptionResponseDto[];
}

export class ProductFormOptionsResponseDto {
  categories!: ProductCategoryOptionResponseDto[];
  options!: Record<string, ProductOptionResponseDto[]>;
  dropdowns!: ProductDropdownsResponseDto;
}

export class ProductDeleteResponseDto {
  deleted!: string;
}
