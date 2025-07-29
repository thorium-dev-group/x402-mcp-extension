import { assemblePaymentRequirements } from '../../../../src/server/services/handlers/payment-utils';
import { type PaymentOptions } from '../../../../src/shared/interfaces';
import { processPriceToAtomicAmount } from 'x402/shared';

// Mock dependencies
jest.mock('x402/shared');

describe('Payment Utils', () => {
  let mockPaymentOptions: PaymentOptions;
  let mockX402Config: { payTo: string; network: string };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock payment options
    mockPaymentOptions = {
      amount: 100,
      description: 'Test payment'
    };

    // Create mock x402 config
    mockX402Config = {
      payTo: '0x1234567890123456789012345678901234567890',
      network: 'base'
    };

    // Setup processPriceToAtomicAmount mock
    (processPriceToAtomicAmount as jest.Mock).mockReturnValue({
      maxAmountRequired: '1000000000000000000',
      asset: {
        address: '0x1234567890123456789012345678901234567890',
        eip712: {
          domain: { name: 'Test Asset', version: '1' },
          types: { Asset: [{ name: 'address', type: 'address' }] },
          value: { address: '0x1234567890123456789012345678901234567890' }
        }
      }
    });
  });

  describe('assemblePaymentRequirements', () => {
    it('should assemble payment requirements correctly', () => {
      // Act
      const result = assemblePaymentRequirements(
        mockPaymentOptions,
        'test-resource',
        mockX402Config,
        'https://example.com'
      );

      // Assert
      expect(processPriceToAtomicAmount).toHaveBeenCalledWith(100, 'base');
      expect(result).toEqual({
        scheme: 'exact',
        network: 'base',
        maxAmountRequired: '1000000000000000000',
        resource: 'https://example.com/test-resource',
        description: 'Test payment',
        mimeType: 'application/json',
        payTo: '0x1234567890123456789012345678901234567890',
        maxTimeoutSeconds: 60,
        asset: '0x1234567890123456789012345678901234567890',
        outputSchema: undefined,
        extra: {
          domain: { name: 'Test Asset', version: '1' },
          types: { Asset: [{ name: 'address', type: 'address' }] },
          value: { address: '0x1234567890123456789012345678901234567890' }
        }
      });
    });

    it('should handle payment options without description', () => {
      // Arrange
      const optionsWithoutDescription: PaymentOptions = {
        amount: 100
      };

      // Act
      const result = assemblePaymentRequirements(
        optionsWithoutDescription,
        'test-resource',
        mockX402Config,
        'https://example.com'
      );

      // Assert
      expect(result.description).toBe('');
    });

    it('should handle payment options with custom description', () => {
      // Arrange
      const optionsWithCustomDescription: PaymentOptions = {
        amount: 100,
        description: 'Custom payment description'
      };

      // Act
      const result = assemblePaymentRequirements(
        optionsWithCustomDescription,
        'test-resource',
        mockX402Config,
        'https://example.com'
      );

      // Assert
      expect(result.description).toBe('Custom payment description');
    });

    it('should construct resource URL with base URL', () => {
      // Act
      const result = assemblePaymentRequirements(
        mockPaymentOptions,
        'test-resource',
        mockX402Config,
        'https://example.com'
      );

      // Assert
      expect(result.resource).toBe('https://example.com/test-resource');
    });

    it('should use resource path directly when no base URL', () => {
      // Act
      const result = assemblePaymentRequirements(
        mockPaymentOptions,
        'test-resource',
        mockX402Config
      );

      // Assert
      expect(result.resource).toBe('test-resource');
    });

    it('should handle complex resource paths', () => {
      // Act
      const result = assemblePaymentRequirements(
        mockPaymentOptions,
        'api/v1/resources/test',
        mockX402Config,
        'https://example.com'
      );

      // Assert
      expect(result.resource).toBe('https://example.com/api/v1/resources/test');
    });

    it('should handle different networks', () => {
      // Arrange
      const configWithDifferentNetwork = {
        payTo: '0x1234567890123456789012345678901234567890',
        network: 'avalanche'
      };

      // Act
      const result = assemblePaymentRequirements(
        mockPaymentOptions,
        'test-resource',
        configWithDifferentNetwork,
        'https://example.com'
      );

      // Assert
      expect(processPriceToAtomicAmount).toHaveBeenCalledWith(100, 'avalanche');
      expect(result.network).toBe('avalanche');
    });

    it('should include additional payment options', () => {
      // Arrange
      const optionsWithExtra: PaymentOptions = {
        amount: 100,
        description: 'Test payment',
        customField: 'custom value',
        metadata: { key: 'value' }
      };

      // Act
      const result = assemblePaymentRequirements(
        optionsWithExtra,
        'test-resource',
        mockX402Config,
        'https://example.com'
      );

      // Assert
      expect(result).toMatchObject({
        scheme: 'exact',
        network: 'base',
        maxAmountRequired: '1000000000000000000',
        resource: 'https://example.com/test-resource',
        description: 'Test payment',
        mimeType: 'application/json',
        payTo: '0x1234567890123456789012345678901234567890',
        maxTimeoutSeconds: 60,
        asset: '0x1234567890123456789012345678901234567890'
      });
    });

    it('should throw error when processPriceToAtomicAmount fails', () => {
      // Arrange
      (processPriceToAtomicAmount as jest.Mock).mockReturnValue({
        error: 'Invalid amount'
      });

      // Act & Assert
      expect(() => {
        assemblePaymentRequirements(
          mockPaymentOptions,
          'test-resource',
          mockX402Config,
          'https://example.com'
        );
      }).toThrow('Failed to process price for amount 100 on network base: Invalid amount');
    });

    it('should handle zero amount', () => {
      // Arrange
      const zeroAmountOptions: PaymentOptions = {
        amount: 0,
        description: 'Free service'
      };

      // Act
      const result = assemblePaymentRequirements(
        zeroAmountOptions,
        'free-resource',
        mockX402Config,
        'https://example.com'
      );

      // Assert
      expect(processPriceToAtomicAmount).toHaveBeenCalledWith(0, 'base');
    });

    it('should handle large amounts', () => {
      // Arrange
      const largeAmountOptions: PaymentOptions = {
        amount: 999999999,
        description: 'Large payment'
      };

      // Act
      const result = assemblePaymentRequirements(
        largeAmountOptions,
        'expensive-resource',
        mockX402Config,
        'https://example.com'
      );

      // Assert
      expect(processPriceToAtomicAmount).toHaveBeenCalledWith(999999999, 'base');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty resource path', () => {
      // Act
      const result = assemblePaymentRequirements(
        mockPaymentOptions,
        '',
        mockX402Config,
        'https://example.com'
      );

      // Assert
      expect(result.resource).toBe('https://example.com/');
    });

    it('should handle resource path with leading slash', () => {
      // Act
      const result = assemblePaymentRequirements(
        mockPaymentOptions,
        '/test-resource',
        mockX402Config,
        'https://example.com'
      );

      // Assert
      expect(result.resource).toBe('https://example.com/test-resource');
    });

    it('should handle base URL with trailing slash', () => {
      // Act
      const result = assemblePaymentRequirements(
        mockPaymentOptions,
        'test-resource',
        mockX402Config,
        'https://example.com/'
      );

      // Assert
      expect(result.resource).toBe('https://example.com/test-resource');
    });

    it('should handle complex base URLs', () => {
      // Act
      const result = assemblePaymentRequirements(
        mockPaymentOptions,
        'test-resource',
        mockX402Config,
        'https://api.example.com/v1'
      );

      // Assert
      expect(result.resource).toBe('https://api.example.com/test-resource');
    });

    it('should handle payment options with null/undefined values', () => {
      // Arrange
      const optionsWithNulls: PaymentOptions = {
        amount: 100,
        description: null as any,
        customField: undefined
      };

      // Act
      const result = assemblePaymentRequirements(
        optionsWithNulls,
        'test-resource',
        mockX402Config,
        'https://example.com'
      );

      // Assert
      expect(result.description).toBe('');
    });

    it('should handle different network types', () => {
      const networks = ['base', 'base-sepolia', 'avalanche', 'avalanche-fuji', 'iotex'] as const;
      
      networks.forEach(network => {
        // Arrange
        const configWithNetwork = {
          payTo: '0x1234567890123456789012345678901234567890',
          network
        };

        // Act
        const result = assemblePaymentRequirements(
          mockPaymentOptions,
          'test-resource',
          configWithNetwork,
          'https://example.com'
        );

        // Assert
        expect(processPriceToAtomicAmount).toHaveBeenCalledWith(100, network);
        expect(result.network).toBe(network);
      });
    });
  });
}); 