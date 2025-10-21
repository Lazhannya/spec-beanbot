// Deno KV storage layer for the Discord bot
// Handles persistent data storage using Deno's built-in key-value store

let kvInstance: Deno.Kv | null = null;

// Initialize the KV database
export async function initKV(path?: string): Promise<Deno.Kv> {
  if (kvInstance) {
    return kvInstance;
  }

  try {
    kvInstance = await Deno.openKv(path);
    console.log("✅ Deno KV database initialized");
    return kvInstance;
  } catch (error) {
    console.error("❌ Failed to initialize Deno KV:", error);
    throw error;
  }
}

// Get the current KV instance
export function getKV(): Deno.Kv {
  if (!kvInstance) {
    throw new Error("KV database not initialized. Call initKV() first.");
  }
  return kvInstance;
}

// Close the KV database
export async function closeKV(): Promise<void> {
  if (kvInstance) {
    await kvInstance.close();
    kvInstance = null;
    console.log("🔒 Deno KV database closed");
  }
}

// Generic KV operations

// Set a value with optional expiration
export async function kvSet<T>(
  key: Deno.KvKey, 
  value: T, 
  options?: { expireIn?: number }
): Promise<boolean> {
  try {
    const kv = getKV();
    const setOptions: Deno.KvSetOptions = {};
    
    if (options?.expireIn) {
      setOptions.expireIn = options.expireIn;
    }

    const result = await kv.set(key, value, setOptions);
    return result.ok;
  } catch (error) {
    console.error("KV set error:", error);
    return false;
  }
}

// Get a value by key
export async function kvGet<T>(key: Deno.KvKey): Promise<T | null> {
  try {
    const kv = getKV();
    const result = await kv.get<T>(key);
    return result.value;
  } catch (error) {
    console.error("KV get error:", error);
    return null;
  }
}

// Delete a value by key
export async function kvDelete(key: Deno.KvKey): Promise<boolean> {
  try {
    const kv = getKV();
    await kv.delete(key);
    return true;
  } catch (error) {
    console.error("KV delete error:", error);
    return false;
  }
}

// Check if a key exists
export async function kvExists(key: Deno.KvKey): Promise<boolean> {
  try {
    const kv = getKV();
    const result = await kv.get(key);
    return result.value !== null;
  } catch (error) {
    console.error("KV exists error:", error);
    return false;
  }
}

// List keys with a prefix
export async function kvList<T>(
  prefix: Deno.KvKey,
  options?: { limit?: number; reverse?: boolean }
): Promise<Array<{ key: Deno.KvKey; value: T }>> {
  try {
    const kv = getKV();
    const entries: Array<{ key: Deno.KvKey; value: T }> = [];
    
    const listOptions: Deno.KvListOptions = {};
    if (options?.limit) listOptions.limit = options.limit;
    if (options?.reverse) listOptions.reverse = options.reverse;

    for await (const entry of kv.list<T>({ prefix }, listOptions)) {
      entries.push({ key: entry.key, value: entry.value });
    }

    return entries;
  } catch (error) {
    console.error("KV list error:", error);
    return [];
  }
}

// Atomic operations
export async function kvAtomic(): Promise<Deno.AtomicOperation> {
  const kv = getKV();
  return kv.atomic();
}

// Batch operations
export interface KVBatchOperation<T> {
  type: "set" | "delete";
  key: Deno.KvKey;
  value?: T;
  options?: Deno.KvSetOptions;
}

export async function kvBatch<T>(operations: KVBatchOperation<T>[]): Promise<boolean> {
  try {
    const kv = getKV();
    let atomic = kv.atomic();

    for (const op of operations) {
      if (op.type === "set" && op.value !== undefined) {
        atomic = atomic.set(op.key, op.value, op.options);
      } else if (op.type === "delete") {
        atomic = atomic.delete(op.key);
      }
    }

    const result = await atomic.commit();
    return result.ok;
  } catch (error) {
    console.error("KV batch error:", error);
    return false;
  }
}

// Increment/decrement numeric values
export async function kvIncrement(
  key: Deno.KvKey, 
  amount: number = 1
): Promise<number | null> {
  try {
    const kv = getKV();
    const current = await kv.get<number>(key);
    const newValue = (current.value || 0) + amount;
    
    const result = await kv.set(key, newValue);
    if (result.ok) {
      return newValue;
    }
    return null;
  } catch (error) {
    console.error("KV increment error:", error);
    return null;
  }
}

// Store JSON data with automatic serialization
export async function kvSetJSON<T>(
  key: Deno.KvKey,
  value: T,
  options?: { expireIn?: number }
): Promise<boolean> {
  try {
    const serialized = {
      data: value,
      timestamp: new Date().toISOString(),
      type: typeof value
    };
    return await kvSet(key, serialized, options);
  } catch (error) {
    console.error("KV setJSON error:", error);
    return false;
  }
}

export async function kvGetJSON<T>(key: Deno.KvKey): Promise<T | null> {
  try {
    const result = await kvGet<{ data: T; timestamp: string; type: string }>(key);
    return result?.data || null;
  } catch (error) {
    console.error("KV getJSON error:", error);
    return null;
  }
}

// Utility functions for key management
export const KV_KEYS = {
  // User sessions
  session: (sessionId: string) => ["sessions", sessionId],
  userSessions: (userId: string) => ["user_sessions", userId],
  
  // Reminders
  reminder: (reminderId: string) => ["reminders", reminderId],
  userReminders: (userId: string) => ["user_reminders", userId],
  scheduledReminders: () => ["scheduled_reminders"],
  
  // Pattern matches
  patternMatch: (matchId: string) => ["pattern_matches", matchId],
  patternStats: (patternId: string) => ["pattern_stats", patternId],
  
  // Bot metrics
  botStats: () => ["bot_stats"],
  errorLogs: (timestamp: string) => ["error_logs", timestamp],
  
  // Cache
  cache: (cacheKey: string) => ["cache", cacheKey],
  
  // Configuration
  config: (key: string) => ["config", key]
} as const;

// Helper for creating time-based keys
export function createTimeKey(prefix: string[]): Deno.KvKey {
  const timestamp = new Date().toISOString();
  return [...prefix, timestamp];
}

// Helper for creating UUID-based keys
export function createUuidKey(prefix: string[]): Deno.KvKey {
  const uuid = crypto.randomUUID();
  return [...prefix, uuid];
}

// Cleanup expired entries (manual cleanup since Deno KV handles TTL automatically)
export async function kvCleanupExpired(prefix: Deno.KvKey): Promise<number> {
  try {
    const kv = getKV();
    let deletedCount = 0;

    for await (const entry of kv.list({ prefix })) {
      // Check if entry has expired (this is mainly for manual tracking)
      const value = entry.value as any;
      if (value && value.expiresAt) {
        const expiresAt = new Date(value.expiresAt);
        if (expiresAt < new Date()) {
          await kv.delete(entry.key);
          deletedCount++;
        }
      }
    }

    console.log(`🧹 Cleaned up ${deletedCount} expired entries`);
    return deletedCount;
  } catch (error) {
    console.error("KV cleanup error:", error);
    return 0;
  }
}

// Database health check
export async function kvHealthCheck(): Promise<{
  healthy: boolean;
  operations: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  error?: string;
}> {
  try {
    const kv = getKV();
    const testKey = ["health_check", "test"];
    const testValue = { timestamp: new Date().toISOString() };

    // Test write
    const writeResult = await kv.set(testKey, testValue);
    if (!writeResult.ok) {
      return {
        healthy: false,
        operations: { read: false, write: false, delete: false },
        error: "Write operation failed"
      };
    }

    // Test read
    const readResult = await kv.get(testKey);
    if (!readResult.value) {
      return {
        healthy: false,
        operations: { read: false, write: true, delete: false },
        error: "Read operation failed"
      };
    }

    // Test delete
    await kv.delete(testKey);
    const deleteCheck = await kv.get(testKey);
    if (deleteCheck.value !== null) {
      return {
        healthy: false,
        operations: { read: true, write: true, delete: false },
        error: "Delete operation failed"
      };
    }

    return {
      healthy: true,
      operations: { read: true, write: true, delete: true }
    };
  } catch (error) {
    return {
      healthy: false,
      operations: { read: false, write: false, delete: false },
      error: `Health check failed: ${error.message}`
    };
  }
}