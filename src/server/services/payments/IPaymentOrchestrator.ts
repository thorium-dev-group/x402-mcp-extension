import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { PaymentRequirements } from "x402/types";

export interface IPaymentOrchestrator {

    /**
     * Validate payment request and response (before handler execution)
     * Throws PaymentError if validation fails
     */
    validatePayment(
        handlerName: string,
        paymentRequirements: PaymentRequirements,
        extra: any
    ): Promise<void>;

    /**
     * Settle payment after successful handler execution
     * Throws PaymentError if settlement fails
     * Sends success notification on success
     */
    settlePayment(extra: any): Promise<void>;
}