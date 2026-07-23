import { ProductCartonDto } from './product-carton.dto';
import { ProductColorDto } from './product-color.dto';
import { ProductListDto } from './product-list.dto';

export class ProductDetailsDto {
  id: string;

  categoryId: string;

  subCategoryId: string;

  name: string;

  description: string;

  price: string;

  mrp: string;

  discount: string;

  badge: string;

  images: string[];

  colors: ProductColorDto[];

  sizes: string[];

  cartons: ProductCartonDto[];

  relatedProducts: ProductListDto[];
}
