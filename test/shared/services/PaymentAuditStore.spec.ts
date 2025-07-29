import { PaymentAuditStorage, PaymentAuditRecord } from '../../../src/client/PaymentAuditStore';
import { InMemoryStorage } from '../../../src/shared/services/InMemoryStorage';
import { RequestId } from '@modelcontextprotocol/sdk/types.js';

// Mock storage for testing
class MockStorage {
  private storage = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    this.storage.set(key, value);
  }

  async has(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  async delete(key: string): Promise<boolean> {
    return this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}

describe('PaymentAuditStorage', () => {
  let auditStore: PaymentAuditStorage;
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
    auditStore = new PaymentAuditStorage({ storage: mockStorage });
  });

  afterEach(async () => {
    await mockStorage.clear();
  });

  describe('storePendingRequest', () => {
    it('should store a pending request with correct status', async () => {
      const requestId = 'test-request-123';
      const record = {
        requestId,
        serverId: 'test-server',
        method: 'test-method',
        params: { test: 'data' },
        paymentAmount: '100',
        paymentNetwork: 'ethereum',
        paymentAsset: 'ETH',
        paymentPayTo: '0x1234567890abcdef'
      };

      await auditStore.storePendingRequest(record);

      const stored = await auditStore.getPendingRequest(requestId);
      expect(stored).toBeDefined();
      expect(stored?.requestId).toBe(requestId);
      expect(stored?.requestStatus).toBe('pending');
      expect(stored?.paymentStatus).toBe('pending');
      expect(stored?.createdAt).toBeDefined();
      expect(typeof stored?.createdAt).toBe('string');
      expect(stored?.serverId).toBe('test-server');
      expect(stored?.method).toBe('test-method');
      expect(stored?.params).toEqual({ test: 'data' });
      expect(stored?.paymentAmount).toBe('100');
      expect(stored?.paymentNetwork).toBe('ethereum');
      expect(stored?.paymentAsset).toBe('ETH');
      expect(stored?.paymentPayTo).toBe('0x1234567890abcdef');
    });

    it('should throw error when requestId is missing', async () => {
      const record = {
        requestId: '',
        serverId: 'test-server',
        method: 'test-method'
      };

      await expect(auditStore.storePendingRequest(record)).rejects.toThrow(
        'Invalid audit record: missing request id'
      );
    });

    it('should store minimal record with required fields only', async () => {
      const requestId = 'minimal-request';
      const record = {
        requestId,
        serverId: 'test-server',
        method: 'test-method'
      };

      await auditStore.storePendingRequest(record);

      const stored = await auditStore.getPendingRequest(requestId);
      expect(stored).toBeDefined();
      expect(stored?.requestId).toBe(requestId);
      expect(stored?.requestStatus).toBe('pending');
      expect(stored?.paymentStatus).toBe('pending');
      expect(stored?.createdAt).toBeDefined();
      expect(typeof stored?.createdAt).toBe('string');
    });
  });

  describe('getPendingRequest', () => {
    it('should return null for non-existent request', async () => {
      const result = await auditStore.getPendingRequest('non-existent');
      expect(result).toBeNull();
    });

    it('should return stored request', async () => {
      const requestId = 'test-request';
      const record = {
        requestId,
        serverId: 'test-server',
        method: 'test-method'
      };

      await auditStore.storePendingRequest(record);
      const retrieved = await auditStore.getPendingRequest(requestId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.requestId).toBe(requestId);
    });
  });

  describe('markRequestCompleted', () => {
    it('should mark request as completed and store with different key', async () => {
      const requestId = 'test-request';
      const record = {
        requestId,
        serverId: 'test-server',
        method: 'test-method'
      };

      await auditStore.storePendingRequest(record);
      const completedAt = new Date('2023-01-01T12:00:00Z');
      await auditStore.markRequestCompleted(requestId, completedAt);

      // The record should now be stored with the requestId as key (not pending:requestId)
      const stored = await mockStorage.get(requestId);
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.requestStatus).toBe('completed');
      expect(parsed.requestCompletedAt).toBe(completedAt.toISOString());
    });

    it('should use current date when completedAt is not provided', async () => {
      const requestId = 'test-request';
      const record = {
        requestId,
        serverId: 'test-server',
        method: 'test-method'
      };

      await auditStore.storePendingRequest(record);
      await auditStore.markRequestCompleted(requestId);

      const stored = await mockStorage.get(requestId);
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.requestStatus).toBe('completed');
      expect(parsed.requestCompletedAt).toBeDefined();
      expect(typeof parsed.requestCompletedAt).toBe('string');
    });

    it('should do nothing for non-existent request', async () => {
      await expect(auditStore.markRequestCompleted('non-existent')).resolves.not.toThrow();
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status to completed and store with different key', async () => {
      const requestId = 'test-request';
      const record = {
        requestId,
        serverId: 'test-server',
        method: 'test-method'
      };

      await auditStore.storePendingRequest(record);
      const completedAt = new Date('2023-01-01T12:00:00Z');
      await auditStore.updatePaymentStatus(requestId, 'completed', {
        transactionHash: '0xabc123',
        payerAddress: '0xdef456',
        completedAt
      });

      // The record should now be stored with the requestId as key
      const stored = await mockStorage.get(requestId);
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.paymentStatus).toBe('completed');
      expect(parsed.paymentCompletedAt).toBe(completedAt.toISOString());
      expect(parsed.transactionHash).toBe('0xabc123');
      expect(parsed.payerAddress).toBe('0xdef456');
    });

    it('should update payment status to failed', async () => {
      const requestId = 'test-request';
      const record = {
        requestId,
        serverId: 'test-server',
        method: 'test-method'
      };

      await auditStore.storePendingRequest(record);
      await auditStore.updatePaymentStatus(requestId, 'failed', {
        errorReason: 'Insufficient funds',
        completedAt: new Date()
      });

      const stored = await mockStorage.get(requestId);
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.paymentStatus).toBe('failed');
      expect(parsed.errorReason).toBe('Insufficient funds');
    });

    it('should update payment status to pending and keep pending key', async () => {
      const requestId = 'test-request';
      const record = {
        requestId,
        serverId: 'test-server',
        method: 'test-method'
      };

      await auditStore.storePendingRequest(record);
      await auditStore.updatePaymentStatus(requestId, 'pending');

      // Should still be stored with pending prefix
      const stored = await mockStorage.get(`pending:${requestId}`);
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.paymentStatus).toBe('pending');
    });

    it('should use current date when completedAt is not provided', async () => {
      const requestId = 'test-request';
      const record = {
        requestId,
        serverId: 'test-server',
        method: 'test-method'
      };

      await auditStore.storePendingRequest(record);
      await auditStore.updatePaymentStatus(requestId, 'completed');

      const stored = await mockStorage.get(requestId);
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.paymentStatus).toBe('completed');
      expect(parsed.paymentCompletedAt).toBeDefined();
      expect(typeof parsed.paymentCompletedAt).toBe('string');
    });

    it('should do nothing for non-existent request', async () => {
      await expect(auditStore.updatePaymentStatus('non-existent', 'completed')).resolves.not.toThrow();
    });

    it('should handle partial details', async () => {
      const requestId = 'test-request';
      const record = {
        requestId,
        serverId: 'test-server',
        method: 'test-method'
      };

      await auditStore.storePendingRequest(record);
      await auditStore.updatePaymentStatus(requestId, 'completed', {
        transactionHash: '0xabc123'
        // No payerAddress or errorReason
      });

      const stored = await mockStorage.get(requestId);
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.paymentStatus).toBe('completed');
      expect(parsed.transactionHash).toBe('0xabc123');
      expect(parsed.payerAddress).toBeUndefined();
      expect(parsed.errorReason).toBeUndefined();
    });
  });

  describe('removePendingRequest', () => {
    it('should remove pending request by deleting the requestId key', async () => {
      const requestId = 'test-request';
      const record = {
        requestId,
        serverId: 'test-server',
        method: 'test-method'
      };

      await auditStore.storePendingRequest(record);
      await auditStore.removePendingRequest(requestId);

      // Should delete the requestId key (not the pending:requestId key)
      const stored = await mockStorage.get(requestId);
      expect(stored).toBeNull();
    });

    it('should handle non-existent request gracefully', async () => {
      await expect(auditStore.removePendingRequest('non-existent')).resolves.not.toThrow();
    });
  });

  describe('Integration with Real Storage', () => {
    it('should work with InMemoryStorage', async () => {
      const realStorage = InMemoryStorage.create();
      const realAuditStore = new PaymentAuditStorage({ storage: realStorage });

      const requestId = 'integration-test';
      const record = {
        requestId,
        serverId: 'test-server',
        method: 'test-method'
      };

      await realAuditStore.storePendingRequest(record);
      const stored = await realAuditStore.getPendingRequest(requestId);
      expect(stored).toBeDefined();
      expect(stored?.requestId).toBe(requestId);

      await realAuditStore.markRequestCompleted(requestId);
      // After marking as completed, it should be stored with requestId key
      const completedRecord = await realStorage.get(requestId);
      expect(completedRecord).toBeDefined();
      
      const parsed = JSON.parse(completedRecord!);
      expect(parsed.requestStatus).toBe('completed');

      await realStorage.clear();
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in requestId', async () => {
      const requestId = 'request:with:colons';
      const record = {
        requestId,
        serverId: 'test-server',
        method: 'test-method'
      };

      await auditStore.storePendingRequest(record);
      const stored = await auditStore.getPendingRequest(requestId);
      expect(stored?.requestId).toBe(requestId);
    });

    it('should handle large data in params', async () => {
      const requestId = 'large-params-test';
      const largeParams = { data: 'x'.repeat(1000) };
      const record = {
        requestId,
        serverId: 'test-server',
        method: 'test-method',
        params: largeParams
      };

      await auditStore.storePendingRequest(record);
      const stored = await auditStore.getPendingRequest(requestId);
      expect(stored?.params).toEqual(largeParams);
    });

    it('should handle concurrent operations', async () => {
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < 5; i++) {
        const requestId = `concurrent-${i}`;
        const record = {
          requestId,
          serverId: 'test-server',
          method: 'test-method'
        };
        promises.push(auditStore.storePendingRequest(record));
      }

      await Promise.all(promises);

      for (let i = 0; i < 5; i++) {
        const requestId = `concurrent-${i}`;
        const stored = await auditStore.getPendingRequest(requestId);
        expect(stored?.requestId).toBe(requestId);
      }
    });
  });

  describe('Data Persistence', () => {
    it('should persist data correctly in JSON format', async () => {
      const requestId = 'persistence-test';
      const record = {
        requestId,
        serverId: 'test-server',
        method: 'test-method',
        paymentAmount: '100',
        paymentNetwork: 'ethereum'
      };

      await auditStore.storePendingRequest(record);

      // Verify the data is stored as JSON string
      const rawData = await mockStorage.get(`pending:${requestId}`);
      expect(rawData).toBeDefined();
      
      const parsed = JSON.parse(rawData!);
      expect(parsed.requestId).toBe(requestId);
      expect(parsed.paymentAmount).toBe('100');
      expect(parsed.paymentNetwork).toBe('ethereum');
    });

    it('should handle date serialization correctly', async () => {
      const requestId = 'date-test';
      const record = {
        requestId,
        serverId: 'test-server',
        method: 'test-method'
      };

      await auditStore.storePendingRequest(record);
      const stored = await auditStore.getPendingRequest(requestId);
      
      expect(stored?.createdAt).toBeDefined();
      expect(typeof stored?.createdAt).toBe('string');
      expect(new Date(stored?.createdAt!).getTime()).toBeGreaterThan(0);
    });
  });
}); 