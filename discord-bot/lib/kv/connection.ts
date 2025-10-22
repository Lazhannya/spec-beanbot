// Deno KV connection wrapper with error handling and type safety

export interface KVConnection {
  get<T>(key: Deno.KvKey): Promise<Deno.KvEntryMaybe<T>>;
  set(key: Deno.KvKey, value: unknown): Promise<Deno.KvCommitResult>;
  delete(key: Deno.KvKey): Promise<void>;
  list<T>(selector: Deno.KvListSelector): Deno.KvListIterator<T>;
  atomic(): Deno.AtomicOperation;
  close(): void;
}

export class KVConnectionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "KVConnectionError";
  }
}

class KVConnectionImpl implements KVConnection {
  constructor(private kv: Deno.Kv) {}

  async get<T>(key: Deno.KvKey): Promise<Deno.KvEntryMaybe<T>> {
    try {
      return await this.kv.get(key);
    } catch (error) {
      throw new KVConnectionError(
        `Failed to get key: ${JSON.stringify(key)}`,
        error as Error
      );
    }
  }

  async set(key: Deno.KvKey, value: unknown): Promise<Deno.KvCommitResult> {
    try {
      return await this.kv.set(key, value);
    } catch (error) {
      throw new KVConnectionError(
        `Failed to set key: ${JSON.stringify(key)}`,
        error as Error
      );
    }
  }

  async delete(key: Deno.KvKey): Promise<void> {
    try {
      await this.kv.delete(key);
    } catch (error) {
      throw new KVConnectionError(
        `Failed to delete key: ${JSON.stringify(key)}`,
        error as Error
      );
    }
  }

  list<T>(selector: Deno.KvListSelector): Deno.KvListIterator<T> {
    return this.kv.list<T>(selector);
  }

  atomic(): Deno.AtomicOperation {
    return this.kv.atomic();
  }

  close(): void {
    this.kv.close();
  }
}

let globalConnection: KVConnection | null = null;

export async function getKVConnection(): Promise<KVConnection> {
  if (globalConnection) {
    return globalConnection;
  }

  try {
    const kv = await Deno.openKv();
    globalConnection = new KVConnectionImpl(kv);
    return globalConnection;
  } catch (error) {
    throw new KVConnectionError(
      "Failed to open Deno KV database",
      error as Error
    );
  }
}

export function closeKVConnection(): void {
  if (globalConnection) {
    globalConnection.close();
    globalConnection = null;
  }
}

// For testing - allows injection of mock connection
export function setKVConnection(connection: KVConnection): void {
  globalConnection = connection;
}