import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as Y from "yjs";
import { SyncManager } from "../SyncManager";

// Mock y-websocket
const mockProvider = {
  on: vi.fn(),
  disconnect: vi.fn(),
  destroy: vi.fn(),
  wsconnected: false,
  wsconnecting: false,
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
});
