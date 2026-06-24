export class StatusCodeUtil {
  /**
   * Get a custom status code based on action type and context.
   * @param action - The action being performed ('create', 'update', 'delete', 'fetch', etc.).
   * @param success - Whether the operation is successful.
   * @param context - Additional context to generate more specific codes (e.g., entity name).
   * @returns The custom status code.
   */
  static getStatusCode(
    action: string,
    success: boolean,
    context?: string,
  ): number {
    // Define base codes for actions
    const baseCodes = {
      create: 20001,
      update: 20002,
      delete: 20003,
      fetch: 20004,
    };

    // Default base code for unknown actions
    const baseCode = baseCodes[action] || 20000;

    // Calculate the specific offset for the context
    const contextOffset = context ? this.getContextOffset(context) : 0;

    // Add offset for error or success
    const statusCode = success
      ? baseCode + contextOffset
      : baseCode + contextOffset + 50000;

    return statusCode;
  }

  /**
   * Generates a context-based offset for finer granularity.
   * @param context - The context (e.g., 'user', 'order').
   * @returns An offset number.
   */
  private static getContextOffset(context: string): number {
    const contextOffsets = {
      user: 10, // Example: Add 10 for user-related actions
      order: 20, // Example: Add 20 for order-related actions
      product: 30, // Example: Add 30 for product-related actions
    };

    // Default to 0 if the context is not predefined
    return contextOffsets[context.toLowerCase()] || 0;
  }
}
