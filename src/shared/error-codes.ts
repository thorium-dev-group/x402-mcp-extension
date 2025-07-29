export const ERROR_CODES = {
    METHOD_NOT_FOUND: -32601,
    INVALID_REQUEST: -32600,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    PAYMENT_REQUIRED: 40200, // Custom code for payment required
    // Payment validation errors
    PAYMENT_INVALID: 40201, // Invalid payment proof or requirements
    INSUFFICIENT_PAYMENT: 40202, // Payment amount is insufficient
    REPLAY_DETECTED: 40203, // Payment proof has already been used
    PAYMENT_EXECUTION_FAILED: 40204, // Payment execution failed on-chain
    
    // Guardrail errors
    GUARDRAIL_VIOLATION: 40210, // Payment blocked by guardrail (per-call limit, whitelist, etc.)
    WHITELIST_VIOLATION: 40211, // Payment recipient not in whitelist
  }; 