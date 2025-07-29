import type { IStorageInterface } from '../interfaces';

interface StorageEntry {
  value: string;
  timestamp: number;
  ttl?: number;
}

interface InMemoryStorageConfig {
  ttl?: number; // Default TTL in milliseconds
  maxSize?: number; // Maximum number of entries
}

/**
 * In-memory storage implementation with singleton behavior and lazy expiration
 */
export class InMemoryStorage implements IStorageInterface {
  private static instance: InMemoryStorage;
  private storage = new Map<string, StorageEntry>();
  private readonly defaultTtl: number;
  private readonly maxSize: number;

  private constructor(config: InMemoryStorageConfig = {}) {
    this.defaultTtl = config.ttl || 300000; // 5 minutes default
    this.maxSize = config.maxSize || 10000; // 10k entries default
  }

  /**
   * Gets the singleton instance of in-memory storage
   */
  static getInstance(config: InMemoryStorageConfig = {}): InMemoryStorage {
    if (!InMemoryStorage.instance) {
      InMemoryStorage.instance = new InMemoryStorage(config);
    }
    return InMemoryStorage.instance;
  }

  /**
   * Creates a new instance (useful for testing or when singleton is not desired)
   */
  static create(config: InMemoryStorageConfig = {}): InMemoryStorage {
    return new InMemoryStorage(config);
  }

  /**
   * Gets a value from storage
   */
  async get(key: string): Promise<string | null> {
    const entry = this.storage.get(key);
    if (!entry) return null;

    // Check if entry has expired and remove it
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.storage.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Sets a value in storage with optional TTL
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    // Clean up expired entries before adding new ones
    this.cleanupExpired();
    
    // Evict oldest entries if storage is full
    if (this.storage.size >= this.maxSize) {
      this.evictOldest();
    }

    this.storage.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    });
  }

  /**
   * Checks if a key exists in storage
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Removes a key from storage
   */
  async delete(key: string): Promise<boolean> {
    // Clean up expired entries before deletion
    this.cleanupExpired();
    return this.storage.delete(key);
  }

  /**
   * Clears all data from storage
   */
  async clear(): Promise<void> {
    this.storage.clear();
  }

  /**
   * Cleans up expired entries during write operations
   */
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        this.storage.delete(key);
      }
    }
  }

  /**
   * Evicts the oldest entries from storage
   */
  private evictOldest(): void {
    const entries = Array.from(this.storage.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toEvict = Math.ceil(this.maxSize * 0.1); // Evict 10% of entries
    for (let i = 0; i < toEvict && i < entries.length; i++) {
      this.storage.delete(entries[i][0]);
    }
  }

  /**
   * Destroys the singleton instance (useful for testing)
   */
  static destroy(): void {
    if (InMemoryStorage.instance) {
      InMemoryStorage.instance = null as any;
    }
  }
} 