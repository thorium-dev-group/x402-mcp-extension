
export class PaymentError extends Error {
    public readonly code: number;
    public readonly details?: any;
  
    constructor(code: number, message: string, details?: any) {
      super(message);
      this.name = 'PaymentError';
      this.code = code;
      this.details = details;
    }
  } 