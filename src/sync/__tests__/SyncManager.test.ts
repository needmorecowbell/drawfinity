import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as Y from "yjs";
import { SyncManager } from "../SyncManager";
import type { ConnectionState } from "../SyncManager";
import type { UserProfile } from "../../user";

// Mock awareness
const awarenessStates = new Map<number, Record<string, unknown>>();
const awarenessListeners: Array<() => void> = [];
let awarenessClientID = 1;

const mockAwareness = {
  clientID: awarenessClientID,
  setLocalStateField: vi.fn((field: string, value: unknown) => {
    const current = awarenessStates.get(awarenessClientID) || {};
    current[field] = value;
    awarenessStates.set(awarenessClientID, current);
  }),
  getStates: vi.fn(() => awarenessStates),
  on: vi.fn((_event: string, callback: () => void) => {
    awarenessListeners.push(callback);
  }),
};

// Mock y-websocket
const mockProvider = {
  on: vi.fn(),
  disconnect: vi.fn(),
  destroy: vi.fn(),
  wsconnected: false,
  wsconnecting: false,
  awareness: mockAwareness,
};

vi.mock("y-websocket", () => ({
  WebsocketProvider: vi.fn(function MockWebsocketProvider() {
    return mockProvider;
  }),
}));

import { WebsocketProvider } from "y-websocket";

describe("SyncManager", () => {
  let doc: Y.Doc;
  let syncManager: SyncManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockProvider.wsconnected = false;
    mockProvider.wsconnecting = false;
    mockProvider.on.mockReset();
    mockProvider.disconnect.mockReset();
    mockProvider.destroy.mockReset();
    mockAwareness.setLocalStateField.mockClear();
    mockAwareness.getStates.mockClear();
    mockAwareness.on.mockClear();
    awarenessStates.clear();
    awarenessListeners.length = 0;
    awarenessClientID = 1;
    mockAwareness.clientID = awarenessClientID;
    doc = new Y.Doc();
    syncManager = new SyncManager(doc);
  });

  afterEach(() => {
    syncManager.destroy();
    vi.useRealTimers();
  });

  it("starts in disconnected state", () => {
    expect(syncManager.getConnectionState()).toBe("disconnected");
  });

  it("creates WebsocketProvider on connect", () => {
    syncManager.connect("ws://localhost:8080", "test-room");

    expect(WebsocketProvider).toHaveBeenCalledWith(
      "ws://localhost:8080",
      "test-room",
      doc,
      { connect: true, disableBc: true, maxBackoffTime: 0 },
    );
  });

  it("notifies listeners of connecting state on connect", () => {
    const listener = vi.fn();
    syncManager.onConnectionStateChange(listener);

    syncManager.connect("ws://localhost:8080", "test-room");

    expect(listener).toHaveBeenCalledWith("connecting");
  });

  it("notifies listeners when provider reports connected", () => {
    const listener = vi.fn();
    syncManager.onConnectionStateChange(listener);

    syncManager.connect("ws://localhost:8080", "test-room");
    listener.mockClear();

    // Simulate the provider emitting a status event
    const statusHandler = mockProvider.on.mock.calls.find(
      (c: unknown[]) => c[0] === "status",
    )?.[1] as (event: { status: string }) => void;
    expect(statusHandler).toBeDefined();

    statusHandler({ status: "connected" });
    expect(listener).toHaveBeenCalledWith("connected");
  });

  it("notifies listeners when provider reports disconnected", () => {
    const listener = vi.fn();
    syncManager.onConnectionStateChange(listener);

    // Use reconnect disabled to get simple disconnected behavior
    syncManager = new SyncManager(doc, { enabled: false });
    syncManager.onConnectionStateChange(listener);
    syncManager.connect("ws://localhost:8080", "test-room");
    listener.mockClear();

    const statusHandler = mockProvider.on.mock.calls.find(
      (c: unknown[]) => c[0] === "status",
    )?.[1] as (event: { status: string }) => void;

    statusHandler({ status: "disconnected" });
    expect(listener).toHaveBeenCalledWith("disconnected");
  });

  it("reports connection state via getConnectionState", () => {
    syncManager.connect("ws://localhost:8080", "test-room");

    // After connect, state should be "connecting"
    expect(syncManager.getConnectionState()).toBe("connecting");

    // Simulate connected
    const statusHandler = mockProvider.on.mock.calls.find(
      (c: unknown[]) => c[0] === "status",
    )?.[1] as (event: { status: string }) => void;

    statusHandler({ status: "connected" });
    expect(syncManager.getConnectionState()).toBe("connected");
  });

  it("disconnect destroys provider and notifies listeners", () => {
    const listener = vi.fn();
    syncManager.onConnectionStateChange(listener);

    syncManager.connect("ws://localhost:8080", "test-room");
    listener.mockClear();

    syncManager.disconnect();

    expect(mockProvider.disconnect).toHaveBeenCalled();
    expect(mockProvider.destroy).toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith("disconnected");
    expect(syncManager.getConnectionState()).toBe("disconnected");
  });

  it("disconnect when already disconnected is a no-op", () => {
    const listener = vi.fn();
    syncManager.onConnectionStateChange(listener);

    syncManager.disconnect();

    // Still notifies (idempotent notification)
    expect(listener).toHaveBeenCalledWith("disconnected");
    expect(mockProvider.disconnect).not.toHaveBeenCalled();
  });

  it("reconnect disconnects previous provider first", () => {
    syncManager.connect("ws://localhost:8080", "room-1");
    expect(WebsocketProvider).toHaveBeenCalledTimes(1);

    syncManager.connect("ws://localhost:8080", "room-2");

    // First provider was destroyed
    expect(mockProvider.disconnect).toHaveBeenCalled();
    expect(mockProvider.destroy).toHaveBeenCalled();
    // New provider created
    expect(WebsocketProvider).toHaveBeenCalledTimes(2);
  });

  it("unsubscribe removes listener", () => {
    const listener = vi.fn();
    const unsubscribe = syncManager.onConnectionStateChange(listener);

    unsubscribe();

    syncManager.connect("ws://localhost:8080", "test-room");
    // listener should not be called for "connecting"
    expect(listener).not.toHaveBeenCalled();
  });

  it("destroy cleans up everything", () => {
    const listener = vi.fn();
    syncManager.onConnectionStateChange(listener);

    syncManager.connect("ws://localhost:8080", "test-room");
    listener.mockClear();

    syncManager.destroy();

    expect(mockProvider.disconnect).toHaveBeenCalled();
    expect(mockProvider.destroy).toHaveBeenCalled();

    // After destroy, listeners should be cleared — no further notifications
    // We verify by checking the listener was called for disconnect during destroy
    expect(listener).toHaveBeenCalledWith("disconnected");
  });

  it("onStatusChange is an alias for onConnectionStateChange", () => {
    const listener = vi.fn();
    const unsub = syncManager.onStatusChange(listener);

    syncManager.connect("ws://localhost:8080", "test-room");
    expect(listener).toHaveBeenCalledWith("connecting");

    unsub();
    listener.mockClear();

    syncManager.disconnect();
    expect(listener).not.toHaveBeenCalled();
  });

  describe("auto-reconnect", () => {
    let listener: ReturnType<typeof vi.fn<(state: ConnectionState) => void>>;

    function simulateConnected(): void {
      const statusHandler = mockProvider.on.mock.calls.find(
        (c: unknown[]) => c[0] === "status",
      )?.[1] as (event: { status: string }) => void;
      statusHandler({ status: "connected" });
    }

    function simulateDisconnected(): void {
      const statusHandler = mockProvider.on.mock.calls.find(
        (c: unknown[]) => c[0] === "status",
      )?.[1] as (event: { status: string }) => void;
      statusHandler({ status: "disconnected" });
    }

    function getLatestStatusHandler(): (event: {
      status: string;
    }) => void {
      const calls = mockProvider.on.mock.calls.filter(
        (c: unknown[]) => c[0] === "status",
      );
      return calls[calls.length - 1]?.[1] as (event: {
        status: string;
      }) => void;
    }

    beforeEach(() => {
      listener = vi.fn();
    });

    it("enters reconnecting state after unexpected disconnect", () => {
      syncManager = new SyncManager(doc, {
        enabled: true,
        initialDelayMs: 1000,
      });
      syncManager.onConnectionStateChange(listener);
      syncManager.connect("ws://localhost:8080", "test-room");

      simulateConnected();
      listener.mockClear();

      simulateDisconnected();

      expect(listener).toHaveBeenCalledWith("reconnecting");
      expect(syncManager.getConnectionState()).toBe("reconnecting");
    });

    it("does not reconnect on intentional disconnect", () => {
      syncManager = new SyncManager(doc, { enabled: true });
      syncManager.onConnectionStateChange(listener);
      syncManager.connect("ws://localhost:8080", "test-room");

      simulateConnected();
      listener.mockClear();

      syncManager.disconnect();

      expect(listener).toHaveBeenCalledWith("disconnected");
      expect(listener).not.toHaveBeenCalledWith("reconnecting");
    });

    it("does not reconnect when reconnect is disabled", () => {
      syncManager = new SyncManager(doc, { enabled: false });
      syncManager.onConnectionStateChange(listener);
      syncManager.connect("ws://localhost:8080", "test-room");

      simulateConnected();
      listener.mockClear();

      simulateDisconnected();

      expect(listener).toHaveBeenCalledWith("disconnected");
      expect(listener).not.toHaveBeenCalledWith("reconnecting");
    });

    it("uses exponential backoff for reconnect delays", () => {
      syncManager = new SyncManager(doc, {
        enabled: true,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        maxAttempts: 5,
      });
      syncManager.connect("ws://localhost:8080", "test-room");

      simulateConnected();

      // First disconnect -> reconnecting
      simulateDisconnected();
      expect(syncManager.getReconnectAttempts()).toBe(1);

      // After 1000ms, should attempt reconnect (creates new provider)
      const providerCountBefore = (WebsocketProvider as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
      vi.advanceTimersByTime(1000);
      expect((WebsocketProvider as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(providerCountBefore + 1);

      // Second disconnect -> 2000ms delay
      getLatestStatusHandler()({ status: "disconnected" });
      expect(syncManager.getReconnectAttempts()).toBe(2);

      vi.advanceTimersByTime(1999);
      const countBeforeSecond = (WebsocketProvider as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
      expect((WebsocketProvider as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(countBeforeSecond);
      vi.advanceTimersByTime(1);
      expect((WebsocketProvider as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(countBeforeSecond + 1);
    });

    it("caps backoff delay at maxDelayMs", () => {
      syncManager = new SyncManager(doc, {
        enabled: true,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        maxAttempts: 10,
      });
      syncManager.connect("ws://localhost:8080", "test-room");
      simulateConnected();

      // Trigger multiple disconnects to push backoff past max
      for (let i = 0; i < 5; i++) {
        getLatestStatusHandler()({ status: "disconnected" });
        vi.advanceTimersByTime(30000); // advance well past any delay
      }

      // At attempt 5, delay would be 1000*2^4=16000, but capped at 5000
      const countBefore = (WebsocketProvider as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
      getLatestStatusHandler()({ status: "disconnected" });

      // Should reconnect after 5000ms (capped), not 16000ms
      vi.advanceTimersByTime(5000);
      expect((WebsocketProvider as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(countBefore + 1);
    });

    it("transitions to failed after maxAttempts", () => {
      syncManager = new SyncManager(doc, {
        enabled: true,
        initialDelayMs: 100,
        maxAttempts: 3,
      });
      syncManager.onConnectionStateChange(listener);
      syncManager.connect("ws://localhost:8080", "test-room");

      simulateConnected();
      listener.mockClear();

      // Exhaust all 3 attempts
      for (let i = 0; i < 3; i++) {
        getLatestStatusHandler()({ status: "disconnected" });
        vi.advanceTimersByTime(30000);
      }

      // 4th disconnect should give "failed"
      getLatestStatusHandler()({ status: "disconnected" });
      expect(listener).toHaveBeenCalledWith("failed");
      expect(syncManager.getConnectionState()).toBe("failed");
    });

    it("resets reconnect attempts on successful connection", () => {
      syncManager = new SyncManager(doc, {
        enabled: true,
        initialDelayMs: 100,
        maxAttempts: 5,
      });
      syncManager.connect("ws://localhost:8080", "test-room");
      simulateConnected();

      // First disconnect -> attempt 1
      simulateDisconnected();
      expect(syncManager.getReconnectAttempts()).toBe(1);

      vi.advanceTimersByTime(100);

      // Reconnect succeeds
      getLatestStatusHandler()({ status: "connected" });
      expect(syncManager.getReconnectAttempts()).toBe(0);
    });

    it("re-sets awareness state on reconnect", () => {
      const profile: UserProfile = {
        id: "user-1",
        name: "Test",
        color: "#ff0000",
      };
      syncManager = new SyncManager(doc, {
        enabled: true,
        initialDelayMs: 100,
      });
      syncManager.setUser(profile);
      syncManager.connect("ws://localhost:8080", "test-room");
      simulateConnected();

      mockAwareness.setLocalStateField.mockClear();

      // Disconnect and reconnect
      simulateDisconnected();
      vi.advanceTimersByTime(100);

      // Awareness should be re-set when new provider is created
      expect(mockAwareness.setLocalStateField).toHaveBeenCalledWith("user", {
        id: "user-1",
        name: "Test",
        color: "#ff0000",
        cursor: null,
      });
    });

    it("cancels pending reconnect on explicit disconnect", () => {
      syncManager = new SyncManager(doc, {
        enabled: true,
        initialDelayMs: 5000,
      });
      syncManager.onConnectionStateChange(listener);
      syncManager.connect("ws://localhost:8080", "test-room");
      simulateConnected();

      simulateDisconnected(); // starts reconnect timer
      listener.mockClear();

      syncManager.disconnect();

      // Advance past the reconnect delay
      const countBefore = (WebsocketProvider as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
      vi.advanceTimersByTime(10000);
      // No new provider should be created
      expect((WebsocketProvider as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(countBefore);
    });

    it("cancels pending reconnect on new connect call", () => {
      syncManager = new SyncManager(doc, {
        enabled: true,
        initialDelayMs: 5000,
      });
      syncManager.connect("ws://localhost:8080", "room-1");
      simulateConnected();
      simulateDisconnected();

      // New connect resets everything
      syncManager.connect("ws://localhost:8080", "room-2");
      expect(syncManager.getReconnectAttempts()).toBe(0);
    });

    it("does not reconnect if never successfully connected", () => {
      syncManager = new SyncManager(doc, { enabled: true });
      syncManager.onConnectionStateChange(listener);
      syncManager.connect("ws://localhost:8080", "test-room");

      // Disconnect without ever connecting
      simulateDisconnected();

      expect(listener).toHaveBeenCalledWith("disconnected");
      expect(listener).not.toHaveBeenCalledWith("reconnecting");
    });

    it("uses default config when none provided", () => {
      syncManager = new SyncManager(doc);
      syncManager.connect("ws://localhost:8080", "test-room");
      simulateConnected();
      simulateDisconnected();

      // Should enter reconnecting (default is enabled)
      expect(syncManager.getConnectionState()).toBe("reconnecting");
    });

    it("destroy cancels pending reconnect timer", () => {
      syncManager = new SyncManager(doc, {
        enabled: true,
        initialDelayMs: 5000,
      });
      syncManager.connect("ws://localhost:8080", "test-room");
      simulateConnected();
      simulateDisconnected();

      syncManager.destroy();

      const countBefore = (WebsocketProvider as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
      vi.advanceTimersByTime(10000);
      expect((WebsocketProvider as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(countBefore);
    });
  });

  describe("awareness integration", () => {
    const testProfile: UserProfile = {
      id: "user-123",
      name: "Test User",
      color: "#e74c3c",
    };

    it("sets awareness local state on connect when user is set before connect", () => {
      syncManager.setUser(testProfile);
      syncManager.connect("ws://localhost:8080", "test-room");

      expect(mockAwareness.setLocalStateField).toHaveBeenCalledWith("user", {
        id: "user-123",
        name: "Test User",
        color: "#e74c3c",
        cursor: null,
      });
    });

    it("sets awareness local state when setUser is called after connect", () => {
      syncManager.connect("ws://localhost:8080", "test-room");
      mockAwareness.setLocalStateField.mockClear();

      syncManager.setUser(testProfile);

      expect(mockAwareness.setLocalStateField).toHaveBeenCalledWith("user", {
        id: "user-123",
        name: "Test User",
        color: "#e74c3c",
        cursor: null,
      });
    });

    it("setUser before connect does not call awareness", () => {
      syncManager.setUser(testProfile);

      // No provider yet, so awareness shouldn't be touched
      expect(mockAwareness.setLocalStateField).not.toHaveBeenCalled();
    });

    it("updateCursorPosition sets cursor in awareness", () => {
      syncManager.setUser(testProfile);
      syncManager.connect("ws://localhost:8080", "test-room");
      mockAwareness.setLocalStateField.mockClear();

      syncManager.updateCursorPosition(100, 200);

      expect(mockAwareness.setLocalStateField).toHaveBeenCalledWith("user", {
        id: "user-123",
        name: "Test User",
        color: "#e74c3c",
        cursor: { x: 100, y: 200 },
      });
    });

    it("updateCursorPosition is a no-op when disconnected", () => {
      syncManager.updateCursorPosition(100, 200);
      expect(mockAwareness.setLocalStateField).not.toHaveBeenCalled();
    });

    it("getRemoteUsers returns empty array when disconnected", () => {
      expect(syncManager.getRemoteUsers()).toEqual([]);
    });

    it("getRemoteUsers excludes self and returns remote users", () => {
      syncManager.setUser(testProfile);
      syncManager.connect("ws://localhost:8080", "test-room");

      // Add a remote user to awareness states
      awarenessStates.set(2, {
        user: {
          id: "remote-456",
          name: "Remote User",
          color: "#3498db",
          cursor: { x: 50, y: 75 },
        },
      });

      const remoteUsers = syncManager.getRemoteUsers();

      expect(remoteUsers).toEqual([
        {
          id: "remote-456",
          name: "Remote User",
          color: "#3498db",
          cursor: { x: 50, y: 75 },
        },
      ]);
    });

    it("getRemoteUsers filters out states without valid user data", () => {
      syncManager.connect("ws://localhost:8080", "test-room");

      awarenessStates.set(2, {
        user: { id: "valid", name: "Valid", color: "#000" },
      });
      awarenessStates.set(3, { user: { id: "no-name" } }); // missing name/color
      awarenessStates.set(4, {}); // no user field

      const remoteUsers = syncManager.getRemoteUsers();

      expect(remoteUsers).toHaveLength(1);
      expect(remoteUsers[0].id).toBe("valid");
    });

    it("getRemoteUsers returns null cursor when cursor is missing", () => {
      syncManager.connect("ws://localhost:8080", "test-room");

      awarenessStates.set(2, {
        user: { id: "u1", name: "User", color: "#fff" },
      });

      const remoteUsers = syncManager.getRemoteUsers();
      expect(remoteUsers[0].cursor).toBeNull();
    });

    it("onRemoteUsersChange notifies on awareness changes", () => {
      const callback = vi.fn();
      syncManager.onRemoteUsersChange(callback);
      syncManager.connect("ws://localhost:8080", "test-room");

      // Simulate awareness change
      awarenessStates.set(2, {
        user: { id: "r1", name: "R1", color: "#abc", cursor: null },
      });

      // Trigger awareness change listener
      expect(awarenessListeners.length).toBeGreaterThan(0);
      awarenessListeners[0]();

      expect(callback).toHaveBeenCalledWith([
        { id: "r1", name: "R1", color: "#abc", cursor: null },
      ]);
    });

    it("onRemoteUsersChange unsubscribe stops notifications", () => {
      const callback = vi.fn();
      const unsub = syncManager.onRemoteUsersChange(callback);
      syncManager.connect("ws://localhost:8080", "test-room");

      unsub();

      awarenessStates.set(2, {
        user: { id: "r1", name: "R1", color: "#abc", cursor: null },
      });
      if (awarenessListeners.length > 0) {
        awarenessListeners[0]();
      }

      expect(callback).not.toHaveBeenCalled();
    });

    it("disconnect notifies remote user listeners with empty array", () => {
      const callback = vi.fn();
      syncManager.onRemoteUsersChange(callback);
      syncManager.connect("ws://localhost:8080", "test-room");
      callback.mockClear();

      syncManager.disconnect();

      expect(callback).toHaveBeenCalledWith([]);
    });

    it("destroy clears remote user listeners", () => {
      const callback = vi.fn();
      syncManager.onRemoteUsersChange(callback);
      syncManager.connect("ws://localhost:8080", "test-room");

      syncManager.destroy();
      callback.mockClear();

      // After destroy, no more notifications
      if (awarenessListeners.length > 0) {
        awarenessListeners[0]();
      }
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
