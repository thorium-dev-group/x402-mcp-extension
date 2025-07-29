import type { PaymentRequirements } from 'x402/types';
import { processPriceToAtomicAmount } from 'x402/shared';
import type { Network } from 'x402/types';
import { PaymentOptions } from '../../decorators/PaymentOptions';

/**
 * Assembles payment requirements from decorator options
 * Converts simple decorator options into full PaymentRequirements structure
 */
export function assemblePaymentRequirements(
  options: PaymentOptions,
  resourcePath: string,
  x402Config: { payTo: string; network: string },
  baseUrl?: string
): PaymentRequirements {
  // Use x402's processPriceToAtomicAmount to get correct asset info and atomic amount
  const result = processPriceToAtomicAmount(options.amount, x402Config.network as Network);
  if ('error' in result) {
    throw new Error(`Failed to process price for amount ${options.amount} on network ${x402Config.network}: ${result.error}`);
  }
  
  // Construct the full resource URL
  const resourceUrl = baseUrl ? new URL(resourcePath, baseUrl).toString() : resourcePath;
  
  return {
    scheme: "exact",
    network: x402Config.network as Network,
    maxAmountRequired: result.maxAmountRequired,
    resource: resourceUrl,
    description: options.description || "",
    mimeType: "application/json",
    payTo: x402Config.payTo,
    maxTimeoutSeconds: 60,
    asset: result.asset.address,
    outputSchema: undefined,
    extra: result.asset.eip712,
  };
} 