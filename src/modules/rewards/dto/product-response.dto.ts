export class GetProductResponseDTO {
  public projectProductId: string;
  public productId: string;
  public type: string;
  public brand: string;
  public name: string;
  public sku: string;
  public categoryName: string;
  public subCategoryName: string;
  public hsn: string;
  public mrp: string;
  public atsCost: string;
  public discount: string;
  public pricePoints: string;
  public gst: string;
  public landingCost: string;
  public quantity: string;
  public status: string;
  public main_image: string;
  public short_description: string;
  public long_description: string;
  public createdAt: string;
  public updatedAt: string;

  constructor(
    projectProductId: string,
    productId: string,
    type: string,
    brand: string,
    name: string,
    sku: string,
    categoryName: string,
    subCategoryName: string,
    hsn: string,
    mrp: string,
    atsCost: string,
    discount: string,
    pricePoints: string,
    gst: string,
    landingCost: string,
    quantity: string,
    status: string,
    main_image: string,
    short_description: string,
    long_description: string,
    createdAt: string,
    updatedAt: string,
  ) {
    this.projectProductId = projectProductId;
    this.productId = productId;
    this.type = type;
    this.brand = brand;
    this.name = name;
    this.sku = sku;
    this.categoryName = categoryName;
    this.subCategoryName = subCategoryName;
    this.hsn = hsn;
    this.mrp = mrp;
    this.atsCost = atsCost;
    this.discount = discount;
    this.pricePoints = pricePoints;
    this.gst = gst;
    this.landingCost = landingCost;
    this.quantity = quantity;
    this.status = status;
    this.main_image = main_image;
    this.short_description = short_description;
    this.long_description = long_description;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
