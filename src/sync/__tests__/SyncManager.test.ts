import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as Y from "yjs";
import { SyncManager } from "../SyncManager";
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
      { connect: true, disableBc: true },
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

    syncManager.connect("ws://localhost:8080", "test-room");
    listener.mockClear();

    const statusHandler = mockProvider.on.mock.calls.find(
      (c: unknown[]) => c[0] === "status",
    )?.[1] as (event: { status: string }) => void;

    statusHandler({ status: "disconnected" });
    expect(listener).toHaveBeenCalledWith("disconnected");
  });

  it("reports connection state from provider flags", () => {
    syncManager.connect("ws://localhost:8080", "test-room");

    mockProvider.wsconnecting = true;
    expect(syncManager.getConnectionState()).toBe("connecting");

    mockProvider.wsconnecting = false;
    mockProvider.wsconnected = true;
    expect(syncManager.getConnectionState()).toBe("connected");

    mockProvider.wsconnected = false;
    expect(syncManager.getConnectionState()).toBe("disconnected");
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

      awarenessStates.set(2, { user: { id: "valid", name: "Valid", color: "#000" } });
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
