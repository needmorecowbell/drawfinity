// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ConnectionPanel } from "../ConnectionPanel";
import { SyncManager, ConnectionState, RemoteUser } from "../../sync/SyncManager";

// Mock SyncManager
function makeMockSyncManager(): SyncManager & {
  _state: ConnectionState;
  _listener: ((state: ConnectionState) => void) | null;
  _userListener: ((users: RemoteUser[]) => void) | null;
  _simulateState(state: ConnectionState): void;
  _simulateUsers(users: RemoteUser[]): void;
  _lastConnect: { url: string; room: string } | null;
  _remoteUsers: RemoteUser[];
} {
  let state: ConnectionState = "disconnected";
  let listener: ((s: ConnectionState) => void) | null = null;
  let userListener: ((users: RemoteUser[]) => void) | null = null;
  let lastConnect: { url: string; room: string } | null = null;
  let remoteUsers: RemoteUser[] = [];

  return {
    _state: state,
    _listener: listener,
    _userListener: userListener,
    _lastConnect: lastConnect,
    _remoteUsers: remoteUsers,
    _simulateState(s: ConnectionState) {
      state = s;
      if (listener) listener(s);
    },
    _simulateUsers(users: RemoteUser[]) {
      remoteUsers = users;
      if (userListener) userListener(users);
    },
    getConnectionState() {
      return state;
    },
    onConnectionStateChange(cb: (s: ConnectionState) => void) {
      listener = cb;
      return () => { listener = null; };
    },
    onRemoteUsersChange(cb: (users: RemoteUser[]) => void) {
      userListener = cb;
      return () => { userListener = null; };
    },
    getRemoteUsers() {
      return remoteUsers;
    },
    connect(url: string, room: string) {
      lastConnect = { url, room };
      state = "connecting";
      if (listener) listener("connecting");
    },
    disconnect() {
      state = "disconnected";
      remoteUsers = [];
      if (listener) listener("disconnected");
    },
    destroy() {},
  } as unknown as SyncManager & {
    _state: ConnectionState;
    _listener: ((state: ConnectionState) => void) | null;
    _userListener: ((users: RemoteUser[]) => void) | null;
    _simulateState(state: ConnectionState): void;
    _simulateUsers(users: RemoteUser[]): void;
    _lastConnect: { url: string; room: string } | null;
    _remoteUsers: RemoteUser[];
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
    expect(dot.dataset.state).toBe("connected");
    expect(text.textContent).toBe("Connected");
  });

  it("hides connect form and shows connected info when connected", () => {
    panel.show();
    sync._simulateState("connected");
    const form = document.querySelector(".conn-connect-form") as HTMLElement;
    const info = document.querySelector(".conn-connected-info") as HTMLElement;
    expect(form.style.display).toBe("none");
    expect(info.style.display).toBe("");
  });

  it("shows Leave Session button when connected", () => {
    panel.show();
    sync._simulateState("connected");
    const leaveBtn = document.querySelector(".conn-btn-danger") as HTMLButtonElement;
    const connectBtn = document.querySelector(".conn-btn-primary") as HTMLButtonElement;
    expect(leaveBtn.style.display).toBe("");
    expect(connectBtn.style.display).toBe("none");
  });

  it("hides connected info and shows form when disconnected", () => {
    panel.show();
    sync._simulateState("connected");
    sync._simulateState("disconnected");
    const form = document.querySelector(".conn-connect-form") as HTMLElement;
    const info = document.querySelector(".conn-connected-info") as HTMLElement;
    expect(form.style.display).toBe("");
    expect(info.style.display).toBe("none");
  });

  it("disables inputs when connecting", () => {
    panel.show();
    sync._simulateState("connecting");
    const serverInput = document.querySelector(".conn-input:not(.conn-room-input)") as HTMLInputElement;
    const roomInput = document.querySelector(".conn-room-input") as HTMLInputElement;
    expect(serverInput.disabled).toBe(true);
    expect(roomInput.disabled).toBe(true);
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

  describe("room info", () => {
    it("setRoomInfo displays room name and ID", () => {
      panel.show();
      panel.setRoomInfo("abc123", "My Room");
      sync._simulateState("connected");
      const name = document.querySelector(".conn-room-name") as HTMLElement;
      const id = document.querySelector(".conn-room-id") as HTMLElement;
      expect(name.textContent).toBe("My Room");
      expect(id.textContent).toBe("Room: abc123");
    });

    it("setRoomInfo defaults name to room ID when no name given", () => {
      panel.show();
      panel.setRoomInfo("xyz789");
      sync._simulateState("connected");
      const name = document.querySelector(".conn-room-name") as HTMLElement;
      expect(name.textContent).toBe("xyz789");
    });
  });

  describe("participant list", () => {
    it("shows participant count including self", () => {
      panel.show();
      sync._simulateState("connected");
      const count = document.querySelector(".conn-participant-count") as HTMLElement;
      // Only self, no remote users
      expect(count.textContent).toBe("1 participant");
    });

    it("updates participant count when remote users change", () => {
      panel.show();
      sync._simulateState("connected");
      sync._simulateUsers([
        { id: "u1", name: "Alice", color: "#ff0000", cursor: null },
        { id: "u2", name: "Bob", color: "#00ff00", cursor: null },
      ]);
      const count = document.querySelector(".conn-participant-count") as HTMLElement;
      expect(count.textContent).toBe("3 participants");
    });

    it("renders user list items with color and name", () => {
      panel.show();
      sync._simulateState("connected");
      sync._simulateUsers([
        { id: "u1", name: "Alice", color: "#ff0000", cursor: null },
      ]);
      const items = document.querySelectorAll(".conn-user-item");
      expect(items.length).toBe(1);
      const color = items[0].querySelector(".conn-user-color") as HTMLElement;
      const name = items[0].querySelector(".conn-user-name") as HTMLElement;
      expect(color.style.backgroundColor).toBe("rgb(255, 0, 0)");
      expect(name.textContent).toBe("Alice");
    });

    it("shows empty message when no other participants", () => {
      panel.show();
      sync._simulateState("connected");
      sync._simulateUsers([]);
      const empty = document.querySelector(".conn-user-list-empty") as HTMLElement;
      expect(empty).not.toBeNull();
      expect(empty.textContent).toBe("No other participants");
    });
  });

  describe("copy room ID", () => {
    it("copies room ID to clipboard", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      panel.show();
      panel.setRoomInfo("test-room", "Test Room");
      sync._simulateState("connected");

      const copyBtn = document.querySelector(".conn-btn-small") as HTMLButtonElement;
      copyBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(writeText).toHaveBeenCalledWith("test-room");
      expect(copyBtn.textContent).toBe("Copied!");
    });
  });

  describe("leave session", () => {
    it("Leave Session disconnects and hides panel", () => {
      const onLeave = vi.fn();
      panel.destroy();
      panel = new ConnectionPanel(sync, { onLeaveSession: onLeave });
      panel.show();
      sync._simulateState("connected");

      const leaveBtn = document.querySelector(".conn-btn-danger") as HTMLButtonElement;
      leaveBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(panel.isVisible()).toBe(false);
      expect(sync.getConnectionState()).toBe("disconnected");
      expect(onLeave).toHaveBeenCalledOnce();
    });

    it("Leave Session button is hidden when disconnected", () => {
      panel.show();
      const leaveBtn = document.querySelector(".conn-btn-danger") as HTMLButtonElement;
      expect(leaveBtn.style.display).toBe("none");
    });
  });
});
