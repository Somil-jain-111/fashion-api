
export const PRODUCT_ERRORS = {
  PRODUCT_NOT_FOUND: {
    code: "PRD_001",
    message: "Product not found",
    statusCode: 404,
  },
  PRODUCT_NOT_FOUND_BY_SKU: {
    code: "PRD_002",
    message: "Product not found for sku: {sku}",
    statusCode: 404,
  },
  INVALID_PRODUCT: {
    code: "PRD_003",
    message: "Invalid product selected",
    statusCode: 400,
  },
  PRODUCT_OUT_OF_STOCK: {
    code: "PRD_004",
    message: "Product is out of stock",
    statusCode: 400,
  },
  PRODUCT_ALREADY_EXISTS: {
    code: "PRD_005",
    message: "Product already exists",
    statusCode: 400,
}}as const; 