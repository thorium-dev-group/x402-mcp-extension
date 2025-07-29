import 'reflect-metadata';
import { PaymentOptions, isPaymentRequired, getPaymentOptions } from '../../../src/server/decorators/PaymentOptions';

describe('PaymentOptions Shared Utilities', () => {
  let testClass: any;
  let mockGetOptions: jest.Mock;

  beforeEach(() => {
    // Create a mock getOptions function
    mockGetOptions = jest.fn();
    
    // Create a test class
    testClass = class TestClass {
      testMethod() {}
    };
  });

  describe('isPaymentRequired', () => {
    it('should return true when payment options exist', () => {
      // Arrange
      mockGetOptions.mockReturnValue({
        name: 'test',
        payment: { amount: 100, description: 'Test payment' }
      });

      // Act
      const result = isPaymentRequired(mockGetOptions, testClass.prototype, 'testMethod');

      // Assert
      expect(result).toBe(true);
      expect(mockGetOptions).toHaveBeenCalledWith(testClass.prototype, 'testMethod');
    });

    it('should return false when payment options do not exist', () => {
      // Arrange
      mockGetOptions.mockReturnValue({
        name: 'test'
        // No payment property
      });

      // Act
      const result = isPaymentRequired(mockGetOptions, testClass.prototype, 'testMethod');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when options are undefined', () => {
      // Arrange
      mockGetOptions.mockReturnValue(undefined);

      // Act
      const result = isPaymentRequired(mockGetOptions, testClass.prototype, 'testMethod');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when payment is undefined', () => {
      // Arrange
      mockGetOptions.mockReturnValue({
        name: 'test',
        payment: undefined
      });

      // Act
      const result = isPaymentRequired(mockGetOptions, testClass.prototype, 'testMethod');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getPaymentOptions', () => {
    it('should return payment options when they exist', () => {
      // Arrange
      const paymentOptions: PaymentOptions = { amount: 100, description: 'Test payment' };
      mockGetOptions.mockReturnValue({
        name: 'test',
        payment: paymentOptions
      });

      // Act
      const result = getPaymentOptions(mockGetOptions, testClass.prototype, 'testMethod');

      // Assert
      expect(result).toEqual(paymentOptions);
      expect(mockGetOptions).toHaveBeenCalledWith(testClass.prototype, 'testMethod');
    });

    it('should return undefined when payment options do not exist', () => {
      // Arrange
      mockGetOptions.mockReturnValue({
        name: 'test'
        // No payment property
      });

      // Act
      const result = getPaymentOptions(mockGetOptions, testClass.prototype, 'testMethod');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when options are undefined', () => {
      // Arrange
      mockGetOptions.mockReturnValue(undefined);

      // Act
      const result = getPaymentOptions(mockGetOptions, testClass.prototype, 'testMethod');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when payment is undefined', () => {
      // Arrange
      mockGetOptions.mockReturnValue({
        name: 'test',
        payment: undefined
      });

      // Act
      const result = getPaymentOptions(mockGetOptions, testClass.prototype, 'testMethod');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('PaymentOptions interface', () => {
    it('should allow basic payment options', () => {
      const options: PaymentOptions = {
        amount: 100,
        description: 'Test payment'
      };

      expect(options.amount).toBe(100);
      expect(options.description).toBe('Test payment');
    });

    it('should allow additional properties', () => {
      const options: PaymentOptions = {
        amount: 100,
        description: 'Test payment',
        asset: 'ETH',
        assetType: 'erc20',
        paymentAddress: '0x1234567890123456789012345678901234567890'
      };

      expect(options.asset).toBe('ETH');
      expect(options.assetType).toBe('erc20');
      expect(options.paymentAddress).toBe('0x1234567890123456789012345678901234567890');
    });
  });
}); 