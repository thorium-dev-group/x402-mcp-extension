/**
 * Abstract storage interface for replay protection and other services
 */
export interface IStorageInterface {
    /**
     * Gets a value from storage
     */
    get(key: string): Promise<string | null>;

    /**
     * Sets a value in storage with optional TTL
     */
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;

    /**
     * Checks if a key exists in storage
     */
    has(key: string): Promise<boolean>;

    /**
     * Removes a key from storage
     */
    delete(key: string): Promise<boolean>;

    /**
     * Clears all data from storage
     */
    clear(): Promise<void>;
} 