export class ProductsMapper {
  static toList(product: any) {
    return {
      id: product.id,
      name: product.name,
      thumbnail: product.thumbnail,
      price: product.price,
      mrp: product.mrp,
      discount: product.discount,
      badge: product.badge,
    };
  }

  static toDetails(product: any) {
    return {
      ...product,
    };
  }
}
