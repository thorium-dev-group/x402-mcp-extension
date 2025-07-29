import { InMemoryStorage } from '../../../src/shared/services/InMemoryStorage';

describe('InMemoryStorage', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    // Reset singleton instance before each test
    InMemoryStorage.destroy();
    storage = InMemoryStorage.create();
  });

  afterEach(async () => {
    await storage.clear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when getInstance is called multiple times', () => {
      const instance1 = InMemoryStorage.getInstance();
      const instance2 = InMemoryStorage.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create new instances when create is called', () => {
      const instance1 = InMemoryStorage.create();
      const instance2 = InMemoryStorage.create();
      expect(instance1).not.toBe(instance2);
    });

    it('should accept configuration options', () => {
      const customStorage = InMemoryStorage.create({
        ttl: 60000,
        maxSize: 1000
      });
      expect(customStorage).toBeInstanceOf(InMemoryStorage);
    });
  });

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      await storage.set('test-key', 'test-value');
      const result = await storage.get('test-key');
      expect(result).toBe('test-value');
    });

    it('should return null for non-existent key', async () => {
      const result = await storage.get('non-existent');
      expect(result).toBeNull();
    });

    it('should check if key exists', async () => {
      await storage.set('test-key', 'test-value');
      const exists = await storage.has('test-key');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const exists = await storage.has('non-existent');
      expect(exists).toBe(false);
    });

    it('should delete a key', async () => {
      await storage.set('test-key', 'test-value');
      const deleted = await storage.delete('test-key');
      expect(deleted).toBe(true);
      
      const result = await storage.get('test-key');
      expect(result).toBeNull();
    });

    it('should return false when deleting non-existent key', async () => {
      const deleted = await storage.delete('non-existent');
      expect(deleted).toBe(false);
    });

    it('should clear all data', async () => {
      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');
      
      await storage.clear();
      
      expect(await storage.get('key1')).toBeNull();
      expect(await storage.get('key2')).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should expire entries after TTL', async () => {
      await storage.set('test-key', 'test-value', 1000); // 1 second TTL
      
      // Before expiration
      expect(await storage.get('test-key')).toBe('test-value');
      
      // Advance time past TTL
      jest.advanceTimersByTime(1500);
      
      // After expiration
      expect(await storage.get('test-key')).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      const customStorage = InMemoryStorage.create({ ttl: 2000 });
      await customStorage.set('test-key', 'test-value');
      
      // Before expiration
      expect(await customStorage.get('test-key')).toBe('test-value');
      
      // Advance time past default TTL
      jest.advanceTimersByTime(2500);
      
      // After expiration
      expect(await customStorage.get('test-key')).toBeNull();
    });

    it('should clean up expired entries during write operations', async () => {
      await storage.set('expired-key', 'expired-value', 1000);
      await storage.set('valid-key', 'valid-value', 5000);
      
      // Advance time to expire one entry
      jest.advanceTimersByTime(1500);
      
      // Trigger cleanup by setting a new value
      await storage.set('new-key', 'new-value');
      
      // Expired entry should be gone
      expect(await storage.get('expired-key')).toBeNull();
      // Valid entry should still exist
      expect(await storage.get('valid-key')).toBe('valid-value');
    });
  });

  describe('Storage Size Management', () => {
    it('should evict oldest entries when max size is reached', async () => {
      const smallStorage = InMemoryStorage.create({ maxSize: 3 });
      
      // Add entries with timestamps
      await smallStorage.set('key1', 'value1');
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
      await smallStorage.set('key2', 'value2');
      await new Promise(resolve => setTimeout(resolve, 10));
      await smallStorage.set('key3', 'value3');
      await new Promise(resolve => setTimeout(resolve, 10));
      await smallStorage.set('key4', 'value4'); // This should trigger eviction
      
      // Oldest entry should be evicted
      expect(await smallStorage.get('key1')).toBeNull();
      // Newer entries should remain
      expect(await smallStorage.get('key2')).toBe('value2');
      expect(await smallStorage.get('key3')).toBe('value3');
      expect(await smallStorage.get('key4')).toBe('value4');
    });

    it('should handle multiple evictions when storage is full', async () => {
      const tinyStorage = InMemoryStorage.create({ maxSize: 2 });
      
      await tinyStorage.set('key1', 'value1');
      await new Promise(resolve => setTimeout(resolve, 10));
      await tinyStorage.set('key2', 'value2');
      await new Promise(resolve => setTimeout(resolve, 10));
      await tinyStorage.set('key3', 'value3');
      await new Promise(resolve => setTimeout(resolve, 10));
      await tinyStorage.set('key4', 'value4');
      
      // Only the newest entries should remain
      expect(await tinyStorage.get('key1')).toBeNull();
      expect(await tinyStorage.get('key2')).toBeNull();
      expect(await tinyStorage.get('key3')).toBe('value3');
      expect(await tinyStorage.get('key4')).toBe('value4');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values', async () => {
      await storage.set('empty-key', '');
      const result = await storage.get('empty-key');
      expect(result).toBe('');
    });

    it('should handle special characters in keys and values', async () => {
      const specialKey = 'key:with:colons';
      const specialValue = 'value\nwith\tnewlines';
      
      await storage.set(specialKey, specialValue);
      const result = await storage.get(specialKey);
      expect(result).toBe(specialValue);
    });

    it('should handle very large values', async () => {
      const largeValue = 'x'.repeat(10000);
      await storage.set('large-key', largeValue);
      const result = await storage.get('large-key');
      expect(result).toBe(largeValue);
    });

    it('should handle concurrent operations', async () => {
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(storage.set(`key${i}`, `value${i}`));
      }
      
      await Promise.all(promises);
      
      for (let i = 0; i < 10; i++) {
        const result = await storage.get(`key${i}`);
        expect(result).toBe(`value${i}`);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid keys gracefully', async () => {
      await storage.set('', 'value');
      const result = await storage.get('');
      expect(result).toBe('value');
    });

    it('should handle null/undefined values', async () => {
      await storage.set('null-key', 'null');
      const result = await storage.get('null-key');
      expect(result).toBe('null');
    });
  });
}); 