/** A message sent between turtles. */
export interface TurtleMessage {
  fromId: string;
  toId: string;
  data: unknown;
}

/**
 * Per-turtle message queues for point-to-point and broadcast messaging.
 *
 * Messages are enqueued via `send()` / `broadcast()` and consumed
 * via `receive()` (destructive) or `peek()` (non-destructive).
 */
export class MessageBus {
  private queues = new Map<string, TurtleMessage[]>();
  /** All known turtle IDs (for broadcast). */
  private registeredIds = new Set<string>();

  /** Register a turtle so it can receive broadcasts. */
  register(turtleId: string): void {
    this.registeredIds.add(turtleId);
    if (!this.queues.has(turtleId)) {
      this.queues.set(turtleId, []);
    }
  }

  /** Unregister a turtle and discard its queue. */
  unregister(turtleId: string): void {
    this.registeredIds.delete(turtleId);
    this.queues.delete(turtleId);
  }

  /** Send a message from one turtle to another. */
  send(fromId: string, toId: string, data: unknown): void {
    const queue = this.queues.get(toId);
    if (!queue) {
      throw new Error(`Unknown turtle "${toId}"`);
    }
    queue.push({ fromId, toId, data });
  }

  /** Broadcast a message from one turtle to all other registered turtles. */
  broadcast(fromId: string, data: unknown): void {
    for (const id of this.registeredIds) {
      if (id !== fromId) {
        const queue = this.queues.get(id)!;
        queue.push({ fromId, toId: id, data });
      }
    }
  }

  /** Dequeue the oldest message for a turtle, or undefined if empty. */
  receive(turtleId: string): TurtleMessage | undefined {
    const queue = this.queues.get(turtleId);
    if (!queue || queue.length === 0) return undefined;
    return queue.shift();
  }

  /** Read the oldest message without removing it, or undefined if empty. */
  peek(turtleId: string): TurtleMessage | undefined {
    const queue = this.queues.get(turtleId);
    if (!queue || queue.length === 0) return undefined;
    return queue[0];
  }

  /** Number of pending messages for a turtle. */
  pendingCount(turtleId: string): number {
    return this.queues.get(turtleId)?.length ?? 0;
  }

  /** Remove all messages and registrations. */
  clear(): void {
    this.queues.clear();
    this.registeredIds.clear();
  }
}

/**
 * Global key-value store visible to all turtles.
 *
 * Any turtle can `publish()` a value under a key, and any turtle
 * can `read()` it back. Keys are plain strings; values can be any
 * serializable Lua value (string, number, boolean, table → object/array).
 */
export class Blackboard {
  private store = new Map<string, unknown>();

  /** Set a value on the blackboard. */
  publish(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  /** Read a value from the blackboard, or undefined if the key doesn't exist. */
  read(key: string): unknown {
    return this.store.get(key);
  }

  /** Return all keys currently on the blackboard. */
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /** Check if a key exists. */
  has(key: string): boolean {
    return this.store.has(key);
  }

  /** Remove all entries. */
  clear(): void {
    this.store.clear();
  }
}
