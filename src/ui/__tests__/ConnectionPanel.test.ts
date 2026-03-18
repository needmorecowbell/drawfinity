// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ConnectionPanel } from "../ConnectionPanel";
import { SyncManager, ConnectionState } from "../../sync/SyncManager";

// Mock SyncManager
function makeMockSyncManager(): SyncManager & {
  _state: ConnectionState;
  _listener: ((state: ConnectionState) => void) | null;
  _simulateState(state: ConnectionState): void;
  _lastConnect: { url: string; room: string } | null;
} {
  let state: ConnectionState = "disconnected";
  let listener: ((s: ConnectionState) => void) | null = null;
  let lastConnect: { url: string; room: string } | null = null;

  return {
    _state: state,
    _listener: listener,
    _lastConnect: lastConnect,
    _simulateState(s: ConnectionState) {
      state = s;
      if (listener) listener(s);
    },
    getConnectionState() {
      return state;
    },
    onConnectionStateChange(cb: (s: ConnectionState) => void) {
      listener = cb;
      return () => { listener = null; };
    },
    connect(url: string, room: string) {
      lastConnect = { url, room };
      state = "connecting";
      if (listener) listener("connecting");
    },
    disconnect() {
      state = "disconnected";
      if (listener) listener("disconnected");
    },
    destroy() {},
  } as unknown as SyncManager & {
    _state: ConnectionState;
    _listener: ((state: ConnectionState) => void) | null;
    _simulateState(state: ConnectionState): void;
    _lastConnect: { url: string; room: string } | null;
  };
}

describe("ConnectionPanel", () => {
  let panel: ConnectionPanel;
  let sync: ReturnType<typeof makeMockSyncManager>;

  beforeEach(() => {
    sync = makeMockSyncManager();
    panel = new ConnectionPanel(sync);
  });

  afterEach(() => {
    panel.destroy();
  });

  it("is not visible by default", () => {
    expect(panel.isVisible()).toBe(false);
    expect(document.getElementById("connection-overlay")).toBeNull();
  });

  it("show() adds overlay to DOM", () => {
    panel.show();
    expect(panel.isVisible()).toBe(true);
    expect(document.getElementById("connection-overlay")).not.toBeNull();
    expect(document.getElementById("connection-panel")).not.toBeNull();
  });

  it("hide() removes overlay from DOM", () => {
    panel.show();
    panel.hide();
    expect(panel.isVisible()).toBe(false);
    expect(document.getElementById("connection-overlay")).toBeNull();
  });

  it("toggle() toggles visibility", () => {
    panel.toggle();
    expect(panel.isVisible()).toBe(true);
    panel.toggle();
    expect(panel.isVisible()).toBe(false);
  });

  it("renders server URL input with default value", () => {
    panel.show();
    const input = document.querySelector(".conn-input") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe("ws://localhost:8080");
  });

  it("renders room ID input", () => {
    panel.show();
    const input = document.querySelector(".conn-room-input") as HTMLInputElement;
    expect(input).not.toBeNull();
  });

  it("renders Random button for room ID", () => {
    panel.show();
    const btn = document.querySelector(".conn-btn-secondary") as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe("Random");
  });

  it("Random button generates a room ID", () => {
    panel.show();
    const roomInput = document.querySelector(".conn-room-input") as HTMLInputElement;
    const randomBtn = document.querySelector(".conn-btn-secondary") as HTMLButtonElement;
    expect(roomInput.value).toBe("");
    randomBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(roomInput.value.length).toBe(8);
  });

  it("renders status indicator showing Offline initially", () => {
    panel.show();
    const dot = document.querySelector(".conn-status-dot") as HTMLElement;
    const text = document.querySelector(".conn-status-text") as HTMLElement;
    expect(dot.dataset.state).toBe("disconnected");
    expect(text.textContent).toBe("Offline");
  });

  it("renders Connect button", () => {
    panel.show();
    const btn = document.querySelector(".conn-btn-primary") as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe("Connect");
  });

  it("clicking Connect calls syncManager.connect", () => {
    panel.show();
    const roomInput = document.querySelector(".conn-room-input") as HTMLInputElement;
    roomInput.value = "test-room";
    const connectBtn = document.querySelector(".conn-btn-primary") as HTMLButtonElement;
    connectBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    // Should now be in connecting state
    const text = document.querySelector(".conn-status-text") as HTMLElement;
    expect(text.textContent).toBe("Connecting...");
  });

  it("does not connect with empty room ID", () => {
    panel.show();
    const connectSpy = vi.spyOn(sync, "connect");
    const connectBtn = document.querySelector(".conn-btn-primary") as HTMLButtonElement;
    connectBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(connectSpy).not.toHaveBeenCalled();
  });

  it("updates UI when connection state changes to connected", () => {
    panel.show();
    sync._simulateState("connected");
    const dot = document.querySelector(".conn-status-dot") as HTMLElement;
    const text = document.querySelector(".conn-status-text") as HTMLElement;
    const btn = document.querySelector(".conn-btn-primary") as HTMLButtonElement;
    expect(dot.dataset.state).toBe("connected");
    expect(text.textContent).toBe("Connected");
    expect(btn.textContent).toBe("Disconnect");
  });

  it("disables inputs when connected", () => {
    panel.show();
    sync._simulateState("connected");
    const serverInput = document.querySelector(".conn-input:not(.conn-room-input)") as HTMLInputElement;
    const roomInput = document.querySelector(".conn-room-input") as HTMLInputElement;
    expect(serverInput.disabled).toBe(true);
    expect(roomInput.disabled).toBe(true);
  });

  it("clicking Disconnect disconnects", () => {
    panel.show();
    sync._simulateState("connected");
    const btn = document.querySelector(".conn-btn-primary") as HTMLButtonElement;
    btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    const text = document.querySelector(".conn-status-text") as HTMLElement;
    expect(text.textContent).toBe("Offline");
  });

  it("clicking overlay background hides panel", () => {
    panel.show();
    const overlay = document.getElementById("connection-overlay")!;
    overlay.dispatchEvent(new PointerEvent("pointerdown", { bubbles: false }));
    expect(panel.isVisible()).toBe(false);
  });

  it("destroy removes overlay and cleans up", () => {
    panel.show();
    panel.destroy();
    expect(document.getElementById("connection-overlay")).toBeNull();
    // Re-create for afterEach
    panel = new ConnectionPanel(sync);
  });
});
