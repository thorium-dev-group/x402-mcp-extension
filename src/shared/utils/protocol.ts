import { PaymentPayload, PaymentRequirements } from "x402/types";
import { PaymentRequiredRequest, PaymentRequiredRequestSchema, PaymentRequiredResponse, PaymentRequiredResponseSchema } from "../schemas";
import { PaymentError } from "../errors/PaymentError";
import { ERROR_CODES } from "../error-codes";

/**
 * Builds a payment_required request message
 */
export function buildPaymentRequiredRequest(
    id: string | number,
    paymentRequirements: PaymentRequirements,
    paymentId?: string,
    requestId?: string
): PaymentRequiredRequest {
    const request: PaymentRequiredRequest = {
        jsonrpc: '2.0',
        id,
        method: PaymentRequiredRequestSchema.shape.method.value,
        params: {
            ...paymentRequirements,
            x402Version: 1,
            ...(paymentId && { paymentId }),
            ...(requestId && { requestId }),
        },
    };

    // Validate the request before returning
    try {
        PaymentRequiredRequestSchema.parse(request);
    } catch (error) {
        throw new PaymentError(ERROR_CODES.INVALID_REQUEST, error.message);
    }
    return request;
}

/**
* Builds a payment_required response message
*/
export function buildPaymentRequiredResponse(
    id: string | number,
    payment: PaymentPayload
): PaymentRequiredResponse {
    const response: PaymentRequiredResponse = {
        jsonrpc: '2.0',
        id,
        result: {
            payment,
        },
    };

    // Validate the response before returning
    try {
        PaymentRequiredResponseSchema.parse(response);
    } catch (error) {
        throw new PaymentError(ERROR_CODES.INVALID_REQUEST, error.message);
    }
    return response;
}