// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { HomeScreen, HomeScreenCallbacks } from "../HomeScreen";
import { DrawingMetadata } from "../../persistence/DrawingManifest";

// Mock ServerApi module
vi.mock("../../sync/ServerApi", () => ({
  fetchRooms: vi.fn(),
  createRoom: vi.fn(),
  ServerApiError: class ServerApiError extends Error {
    statusCode?: number;
    constructor(message: string, statusCode?: number) {
      super(message);
      this.name = "ServerApiError";
      this.statusCode = statusCode;
    }
  },
}));

// Mock UserPreferences
vi.mock("../../user/UserPreferences", () => {
  let stored: Record<string, unknown> = {};
  return {
    loadPreferences: vi.fn(() => ({
      defaultBrush: 0,
      defaultColor: "#000000",
      ...stored,
    })),
    savePreferences: vi.fn((prefs: Record<string, unknown>) => {
      stored = { ...prefs };
    }),
  };
});

// Mock UserStore
vi.mock("../../user/UserStore", () => ({
  loadProfile: vi.fn(() => ({
    id: "test-user-id",
    name: "Test User",
    color: "#e74c3c",
  })),
}));

import { fetchRooms, createRoom } from "../../sync/ServerApi";
import { loadPreferences, savePreferences } from "../../user/UserPreferences";
import type { RoomInfo } from "../../sync/ServerApi";

const mockFetchRooms = vi.mocked(fetchRooms);
const mockCreateRoom = vi.mocked(createRoom);

function makeDrawing(
  overrides: Partial<DrawingMetadata> = {},
): DrawingMetadata {
  return {
    id: "d1",
    name: "My Drawing",
    createdAt: "2026-03-18T10:00:00.000Z",
    modifiedAt: "2026-03-18T10:00:00.000Z",
    fileName: "d1.drawfinity",
    ...overrides,
  };
}

function makeCallbacks(
  overrides: Partial<HomeScreenCallbacks> = {},
): HomeScreenCallbacks {
  return {
    onOpenDrawing: vi.fn(),
    onCreateDrawing: vi
      .fn()
      .mockResolvedValue(makeDrawing({ id: "new", name: "Untitled" })),
    onDeleteDrawing: vi.fn().mockResolvedValue(undefined),
    onRenameDrawing: vi.fn().mockResolvedValue(undefined),
    onDuplicateDrawing: vi
      .fn()
      .mockResolvedValue(makeDrawing({ id: "dup", name: "Copy" })),
    onJoinRoom: vi.fn(),
    ...overrides,
  };
}

function makeRoom(overrides: Partial<RoomInfo> = {}): RoomInfo {
  return {
    id: "room-1",
    name: "Test Room",
    clientCount: 2,
    createdAt: Math.floor(Date.now() / 1000) - 3600,
    lastActiveAt: Math.floor(Date.now() / 1000) - 60,
    ...overrides,
  };
}

describe("HomeScreen Shared Tab", () => {
  let screen: HomeScreen;
  let callbacks: HomeScreenCallbacks;

  beforeEach(() => {
    vi.clearAllMocks();
    callbacks = makeCallbacks();
    screen = new HomeScreen(callbacks);
  });

  afterEach(() => {
    screen.destroy();
  });

  describe("Tab bar", () => {
    it("renders tab bar with My Drawings and Shared tabs", () => {
      screen.show();
      const tabs = screen.getContainer().querySelectorAll(".home-tab");
      expect(tabs.length).toBe(2);
      expect(tabs[0].textContent).toBe("My Drawings");
      expect(tabs[1].textContent).toBe("Shared");
    });

    it("defaults to My Drawings tab active", () => {
      screen.show();
      expect(screen.getActiveTab()).toBe("my-drawings");
      const tabs = screen.getContainer().querySelectorAll(".home-tab");
      expect(tabs[0].classList.contains("active")).toBe(true);
      expect(tabs[1].classList.contains("active")).toBe(false);
    });

    it("switches to Shared tab when clicked", () => {
      screen.show();
      const sharedTab = screen
        .getContainer()
        .querySelectorAll(".home-tab")[1] as HTMLElement;
      sharedTab.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      expect(screen.getActiveTab()).toBe("shared");
      expect(sharedTab.classList.contains("active")).toBe(true);
    });

    it("hides my drawings content when shared tab is active", () => {
      screen.show();
      const sharedTab = screen
        .getContainer()
        .querySelectorAll(".home-tab")[1] as HTMLElement;
      sharedTab.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      const myContent = screen
        .getContainer()
        .querySelector(".home-my-drawings-content") as HTMLElement;
      const sharedContent = screen
        .getContainer()
        .querySelector(".home-shared-content") as HTMLElement;
      expect(myContent.style.display).toBe("none");
      expect(sharedContent.style.display).not.toBe("none");
    });

    it("switches back to My Drawings tab", () => {
      screen.show();
      screen.switchTab("shared");
      screen.switchTab("my-drawings");

      expect(screen.getActiveTab()).toBe("my-drawings");
      const myContent = screen
        .getContainer()
        .querySelector(".home-my-drawings-content") as HTMLElement;
      expect(myContent.style.display).not.toBe("none");
    });

    it("hides save directory row when on shared tab", () => {
      screen.show();
      screen.switchTab("shared");
      const saveRow = screen
        .getContainer()
        .querySelector(".home-save-dir-row") as HTMLElement;
      expect(saveRow.style.display).toBe("none");
    });

    it("hides search/sort controls when on shared tab", () => {
      screen.show();
      screen.switchTab("shared");
      const controlsRow = screen
        .getContainer()
        .querySelector(".home-controls-row") as HTMLElement;
      expect(controlsRow.style.display).toBe("none");
    });

    it("does nothing when switching to already active tab", () => {
      screen.show();
      screen.switchTab("my-drawings"); // Already active
      expect(screen.getActiveTab()).toBe("my-drawings");
    });
  });

  describe("Shared tab - Server connection", () => {
    it("renders server URL input and Connect button", () => {
      screen.show();
      screen.switchTab("shared");
      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.placeholder).toBe("ws://localhost:8080");

      const connectBtn = screen
        .getContainer()
        .querySelector(
          ".home-shared-content .home-btn-primary",
        ) as HTMLButtonElement;
      expect(connectBtn.textContent).toBe("Connect");
    });

    it("shows disconnected status by default", () => {
      screen.show();
      screen.switchTab("shared");
      expect(screen.getSharedConnectionStatus()).toBe("disconnected");
      const dot = screen
        .getContainer()
        .querySelector(".home-shared-status-dot") as HTMLElement;
      expect(dot.dataset.state).toBe("disconnected");
      const text = screen
        .getContainer()
        .querySelector(".home-shared-status-text") as HTMLElement;
      expect(text.textContent).toBe("Not connected");
    });

    it("pre-fills server URL from UserPreferences", () => {
      vi.mocked(loadPreferences).mockReturnValue({
        defaultBrush: 0,
        defaultColor: "#000000",
        serverUrl: "ws://saved-server:9090",
      });

      screen.destroy();
      screen = new HomeScreen(callbacks);
      screen.show();
      screen.switchTab("shared");

      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      expect(input.value).toBe("ws://saved-server:9090");
    });

    it("fetches rooms on Connect click and shows connected status", async () => {
      const rooms = [makeRoom()];
      mockFetchRooms.mockResolvedValue(rooms);

      screen.show();
      screen.switchTab("shared");

      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      input.value = "ws://localhost:8080";

      const connectBtn = screen
        .getContainer()
        .querySelector(
          ".home-shared-server-row .home-btn-primary",
        ) as HTMLElement;
      connectBtn.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      // Wait for async fetch
      await vi.waitFor(() => {
        expect(screen.getSharedConnectionStatus()).toBe("connected");
      });

      expect(mockFetchRooms).toHaveBeenCalledWith("ws://localhost:8080");
      expect(screen.getRooms().length).toBe(1);
    });

    it("saves server URL to preferences on successful connection", async () => {
      mockFetchRooms.mockResolvedValue([]);

      screen.show();
      screen.switchTab("shared");

      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      input.value = "ws://my-server:8080";

      const connectBtn = screen
        .getContainer()
        .querySelector(
          ".home-shared-server-row .home-btn-primary",
        ) as HTMLElement;
      connectBtn.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      await vi.waitFor(() => {
        expect(screen.getSharedConnectionStatus()).toBe("connected");
      });

      expect(savePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ serverUrl: "ws://my-server:8080" }),
      );
    });

    it("shows error status when connection fails", async () => {
      const { ServerApiError } = await import("../../sync/ServerApi");
      mockFetchRooms.mockRejectedValue(
        new ServerApiError("Server unreachable"),
      );

      screen.show();
      screen.switchTab("shared");

      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      input.value = "ws://bad-server";

      const connectBtn = screen
        .getContainer()
        .querySelector(
          ".home-shared-server-row .home-btn-primary",
        ) as HTMLElement;
      connectBtn.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      await vi.waitFor(() => {
        expect(screen.getSharedConnectionStatus()).toBe("error");
      });

      const text = screen
        .getContainer()
        .querySelector(".home-shared-status-text") as HTMLElement;
      expect(text.textContent).toBe("Server unreachable");
    });

    it("does not connect when URL is empty", () => {
      screen.show();
      screen.switchTab("shared");

      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      input.value = "";

      const connectBtn = screen
        .getContainer()
        .querySelector(
          ".home-shared-server-row .home-btn-primary",
        ) as HTMLElement;
      connectBtn.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      expect(mockFetchRooms).not.toHaveBeenCalled();
    });

    it("connects on Enter key in server URL input", async () => {
      mockFetchRooms.mockResolvedValue([]);

      screen.show();
      screen.switchTab("shared");

      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      input.value = "ws://localhost:8080";
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );

      await vi.waitFor(() => {
        expect(mockFetchRooms).toHaveBeenCalled();
      });
    });
  });

  describe("Shared tab - Room list", () => {
    it("renders room cards after connecting", async () => {
      mockFetchRooms.mockResolvedValue([
        makeRoom({ id: "r1", name: "Room A", clientCount: 3 }),
        makeRoom({ id: "r2", name: "Room B", clientCount: 1 }),
      ]);

      screen.show();
      screen.switchTab("shared");

      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      input.value = "ws://localhost:8080";
      const connectBtn = screen
        .getContainer()
        .querySelector(
          ".home-shared-server-row .home-btn-primary",
        ) as HTMLElement;
      connectBtn.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      await vi.waitFor(() => {
        const cards = screen
          .getContainer()
          .querySelectorAll(".home-room-card");
        expect(cards.length).toBe(2);
      });

      // Check card content
      const names = Array.from(
        screen.getContainer().querySelectorAll(".home-room-card .home-card-name"),
      ).map((el) => el.textContent);
      expect(names).toEqual(["Room A", "Room B"]);
    });

    it("shows room participant count and last activity", async () => {
      mockFetchRooms.mockResolvedValue([
        makeRoom({ clientCount: 5, lastActiveAt: Math.floor(Date.now() / 1000) - 120 }),
      ]);

      screen.show();
      screen.switchTab("shared");

      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      input.value = "ws://localhost:8080";
      const connectBtn = screen
        .getContainer()
        .querySelector(
          ".home-shared-server-row .home-btn-primary",
        ) as HTMLElement;
      connectBtn.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      await vi.waitFor(() => {
        const meta = screen
          .getContainer()
          .querySelector(".home-room-meta") as HTMLElement;
        expect(meta.textContent).toContain("5 participants");
        expect(meta.textContent).toContain("2m ago");
      });
    });

    it("shows singular 'participant' for count of 1", async () => {
      mockFetchRooms.mockResolvedValue([
        makeRoom({ clientCount: 1 }),
      ]);

      screen.show();
      screen.switchTab("shared");

      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      input.value = "ws://localhost:8080";
      const connectBtn = screen
        .getContainer()
        .querySelector(
          ".home-shared-server-row .home-btn-primary",
        ) as HTMLElement;
      connectBtn.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      await vi.waitFor(() => {
        const meta = screen
          .getContainer()
          .querySelector(".home-room-meta") as HTMLElement;
        expect(meta.textContent).toContain("1 participant");
      });
    });

    it("shows empty state when no rooms exist", async () => {
      mockFetchRooms.mockResolvedValue([]);

      screen.show();
      screen.switchTab("shared");

      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      input.value = "ws://localhost:8080";
      const connectBtn = screen
        .getContainer()
        .querySelector(
          ".home-shared-server-row .home-btn-primary",
        ) as HTMLElement;
      connectBtn.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      await vi.waitFor(() => {
        expect(screen.getSharedConnectionStatus()).toBe("connected");
      });

      const emptyState = screen
        .getContainer()
        .querySelector(
          ".home-shared-content .home-empty-state",
        ) as HTMLElement;
      expect(emptyState.style.display).not.toBe("none");
      expect(emptyState.textContent).toContain("No shared drawings yet");
    });

    it("shows Join button on room cards", async () => {
      mockFetchRooms.mockResolvedValue([makeRoom()]);

      screen.show();
      screen.switchTab("shared");

      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      input.value = "ws://localhost:8080";
      const connectBtn = screen
        .getContainer()
        .querySelector(
          ".home-shared-server-row .home-btn-primary",
        ) as HTMLElement;
      connectBtn.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      await vi.waitFor(() => {
        const joinBtn = screen
          .getContainer()
          .querySelector(".home-room-join-btn") as HTMLElement;
        expect(joinBtn).not.toBeNull();
        expect(joinBtn.textContent).toBe("Join");
      });
    });

    it("calls onJoinRoom when Join button clicked", async () => {
      mockFetchRooms.mockResolvedValue([
        makeRoom({ id: "room-abc" }),
      ]);

      screen.show();
      screen.switchTab("shared");

      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      input.value = "ws://localhost:8080";
      const connectBtn = screen
        .getContainer()
        .querySelector(
          ".home-shared-server-row .home-btn-primary",
        ) as HTMLElement;
      connectBtn.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      await vi.waitFor(() => {
        expect(screen.getRooms().length).toBe(1);
      });

      const joinBtn = screen
        .getContainer()
        .querySelector(".home-room-join-btn") as HTMLElement;
      joinBtn.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      expect(callbacks.onJoinRoom).toHaveBeenCalledWith(
        "room-abc",
        "ws://localhost:8080",
        "Test Room",
      );
    });

    it("calls onJoinRoom when room card is clicked", async () => {
      mockFetchRooms.mockResolvedValue([
        makeRoom({ id: "room-xyz" }),
      ]);

      screen.show();
      screen.switchTab("shared");

      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      input.value = "ws://localhost:8080";
      const connectBtn = screen
        .getContainer()
        .querySelector(
          ".home-shared-server-row .home-btn-primary",
        ) as HTMLElement;
      connectBtn.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      await vi.waitFor(() => {
        expect(screen.getRooms().length).toBe(1);
      });

      const card = screen
        .getContainer()
        .querySelector(".home-room-card") as HTMLElement;
      card.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      expect(callbacks.onJoinRoom).toHaveBeenCalledWith(
        "room-xyz",
        "ws://localhost:8080",
        "Test Room",
      );
    });

    it("uses room id as name when room has no name", async () => {
      mockFetchRooms.mockResolvedValue([
        makeRoom({ id: "anon-room", name: null }),
      ]);

      screen.show();
      screen.switchTab("shared");

      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      input.value = "ws://localhost:8080";
      const connectBtn = screen
        .getContainer()
        .querySelector(
          ".home-shared-server-row .home-btn-primary",
        ) as HTMLElement;
      connectBtn.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      await vi.waitFor(() => {
        const name = screen
          .getContainer()
          .querySelector(".home-room-card .home-card-name") as HTMLElement;
        expect(name.textContent).toBe("anon-room");
      });
    });
  });

  describe("Shared tab - Refresh and Create", () => {
    it("shows Refresh and Create buttons only when connected", async () => {
      screen.show();
      screen.switchTab("shared");

      // Initially hidden
      const sharedContent = screen
        .getContainer()
        .querySelector(".home-shared-content") as HTMLElement;
      const refreshBtn = sharedContent.querySelector(
        ".home-shared-status-row .home-btn-secondary",
      ) as HTMLElement;
      expect(refreshBtn.style.display).toBe("none");

      const createBtn = sharedContent.querySelector(
        ".home-shared-status-row .home-btn-primary",
      ) as HTMLElement;
      expect(createBtn.style.display).toBe("none");

      // Connect
      mockFetchRooms.mockResolvedValue([]);
      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      input.value = "ws://localhost:8080";
      const connectBtnEl = screen
        .getContainer()
        .querySelector(
          ".home-shared-server-row .home-btn-primary",
        ) as HTMLElement;
      connectBtnEl.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      await vi.waitFor(() => {
        expect(refreshBtn.style.display).not.toBe("none");
        expect(createBtn.style.display).not.toBe("none");
      });
    });

    it("Refresh button re-fetches rooms", async () => {
      mockFetchRooms.mockResolvedValue([]);

      screen.show();
      screen.switchTab("shared");

      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      input.value = "ws://localhost:8080";
      const connectBtnEl = screen
        .getContainer()
        .querySelector(
          ".home-shared-server-row .home-btn-primary",
        ) as HTMLElement;
      connectBtnEl.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      await vi.waitFor(() => {
        expect(screen.getSharedConnectionStatus()).toBe("connected");
      });

      // Now add rooms for refresh
      mockFetchRooms.mockResolvedValue([makeRoom()]);

      const refreshBtn = screen
        .getContainer()
        .querySelector(
          ".home-shared-status-row .home-btn-secondary",
        ) as HTMLElement;
      refreshBtn.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      await vi.waitFor(() => {
        expect(screen.getRooms().length).toBe(1);
      });

      // fetchRooms called twice: once for connect, once for refresh
      expect(mockFetchRooms).toHaveBeenCalledTimes(2);
    });

    it("Create Shared Drawing prompts for name and creates room", async () => {
      mockFetchRooms.mockResolvedValue([]);
      const newRoom = makeRoom({ id: "new-room", name: "My Collab" });
      mockCreateRoom.mockResolvedValue(newRoom);
      vi.stubGlobal("prompt", vi.fn().mockReturnValue("My Collab"));

      screen.show();
      screen.switchTab("shared");

      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      input.value = "ws://localhost:8080";
      const connectBtnEl = screen
        .getContainer()
        .querySelector(
          ".home-shared-server-row .home-btn-primary",
        ) as HTMLElement;
      connectBtnEl.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      await vi.waitFor(() => {
        expect(screen.getSharedConnectionStatus()).toBe("connected");
      });

      const createBtn = screen
        .getContainer()
        .querySelector(
          ".home-shared-status-row .home-btn-primary",
        ) as HTMLElement;
      createBtn.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      await vi.waitFor(() => {
        expect(mockCreateRoom).toHaveBeenCalledWith(
          "ws://localhost:8080",
          "My Collab",
          "Test User",
        );
      });

      expect(callbacks.onJoinRoom).toHaveBeenCalledWith(
        "new-room",
        "ws://localhost:8080",
        "My Collab",
      );

      vi.unstubAllGlobals();
    });

    it("Create Shared Drawing does nothing when prompt cancelled", async () => {
      mockFetchRooms.mockResolvedValue([]);
      vi.stubGlobal("prompt", vi.fn().mockReturnValue(null));

      screen.show();
      screen.switchTab("shared");

      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      input.value = "ws://localhost:8080";
      const connectBtnEl = screen
        .getContainer()
        .querySelector(
          ".home-shared-server-row .home-btn-primary",
        ) as HTMLElement;
      connectBtnEl.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      await vi.waitFor(() => {
        expect(screen.getSharedConnectionStatus()).toBe("connected");
      });

      const createBtn = screen
        .getContainer()
        .querySelector(
          ".home-shared-status-row .home-btn-primary",
        ) as HTMLElement;
      createBtn.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );

      // Give a tick
      await new Promise((r) => setTimeout(r, 10));
      expect(mockCreateRoom).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });

  describe("Shared tab - keydown stopPropagation", () => {
    it("keydown in server URL input does not propagate", () => {
      screen.show();
      screen.switchTab("shared");
      const input = screen
        .getContainer()
        .querySelector(".home-shared-server-input") as HTMLInputElement;
      const event = new KeyboardEvent("keydown", { key: "b", bubbles: true });
      const stopSpy = vi.spyOn(event, "stopPropagation");
      input.dispatchEvent(event);
      expect(stopSpy).toHaveBeenCalled();
    });
  });
});
