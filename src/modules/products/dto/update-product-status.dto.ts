import { IsEnum } from 'class-validator';
import { ProductStatus } from 'src/default/common/enums/product.enum';

export class UpdateProductStatusDto {
  @IsEnum(ProductStatus)
  status!: ProductStatus.APPROVED | ProductStatus.INACTIVE;
}
