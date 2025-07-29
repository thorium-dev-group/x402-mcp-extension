
export interface PaymentOptions {
  amount: number;
  description?: string;
  // Additional protocol-specific options (e.g., asset, assetType, paymentAddress, etc.)
  [key: string]: any;
}

/**
 * Generic utility to check if a method requires payment.
 * @param getOptions Function that retrieves the decorator options for a method
 * @param target The target object
 * @param propertyKey The property key
 * @returns True if the method requires payment
 */
export function isPaymentRequired<T extends { payment?: PaymentOptions }>(
  getOptions: (target: Object, propertyKey: string | symbol) => T | undefined,
  target: Object, 
  propertyKey: string | symbol
): boolean {
  const options = getOptions(target, propertyKey);
  return options?.payment !== undefined;
}

/**
 * Generic utility to get payment options from a method.
 * @param getOptions Function that retrieves the decorator options for a method
 * @param target The target object
 * @param propertyKey The property key
 * @returns Payment options if they exist
 */
export function getPaymentOptions<T extends { payment?: PaymentOptions }>(
  getOptions: (target: Object, propertyKey: string | symbol) => T | undefined,
  target: Object, 
  propertyKey: string | symbol
): PaymentOptions | undefined {
  const options = getOptions(target, propertyKey);
  return options?.payment;
}
