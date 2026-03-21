// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TurtlePanel } from "../TurtlePanel";

function mockFetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () =>
      Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response);
}

const MOCK_INDEX = {
  version: "2026-03-21T00:00:00Z",
  scripts: [
    {
      id: "spiral",
      title: "Spiral",
      description: "A cool spiral",
      author: "alice",
      tags: ["pattern"],
      path: "scripts/spiral",
      version: "1.0.0",
    },
    {
      id: "tree",
      title: "Tree",
      description: "Fractal tree",
      author: "bob",
      tags: ["fractal"],
      path: "scripts/tree",
      version: "1.0.0",
    },
  ],
};

const storageMap = new Map<string, string>();
beforeEach(() => {
  storageMap.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, value: string) => storageMap.set(key, value),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
    get length() {
      return storageMap.size;
    },
    key: (index: number) => {
      const keys = [...storageMap.keys()];
      return keys[index] ?? null;
    },
  });
});

describe("TurtlePanel Unified Script Browser", () => {
  let panel: TurtlePanel;

  beforeEach(() => {
    panel = new TurtlePanel("test-drawing");
    panel.show();
  });

  afterEach(() => {
    panel.destroy();
    vi.restoreAllMocks();
  });

  it("renders a Scripts button in the bottom bar (no Community or Examples buttons)", () => {
    const buttons = document.querySelectorAll(".turtle-btn-secondary");
    const scriptsBtn = Array.from(buttons).find(
      (b) => b.textContent?.startsWith("Scripts"),
    );
    expect(scriptsBtn).toBeTruthy();

    // No Community or Examples buttons
    const communityBtn = Array.from(buttons).find(
      (b) => b.textContent === "Community",
    );
    expect(communityBtn).toBeFalsy();

    const examplesBtn = Array.from(buttons).find(
      (b) => b.textContent?.includes("Examples"),
    );
    expect(examplesBtn).toBeFalsy();
  });

  it("opens exchange overlay and renders scripts from snapshot immediately", () => {
    // Mock fetch to be slow/fail — we should still see snapshot scripts
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline")),
    );

    // Click the Scripts button
    const buttons = document.querySelectorAll(".turtle-btn-secondary");
    const scriptsBtn = Array.from(buttons).find(
      (b) => b.textContent?.startsWith("Scripts"),
    ) as HTMLButtonElement;
    scriptsBtn.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );

    // Scripts from snapshot should appear immediately (no loading state)
    const items = document.querySelectorAll(".turtle-exchange-item");
    expect(items.length).toBeGreaterThan(0);

    // Title should be "Turtle Scripts"
    const title = document.querySelector(".turtle-exchange-title");
    expect(title?.textContent).toBe("Turtle Scripts");
  });

  it("updates script list when fresh index is fetched", async () => {
    const fetchMock = mockFetchOk(MOCK_INDEX);
    vi.stubGlobal("fetch", fetchMock);

    const buttons = document.querySelectorAll(".turtle-btn-secondary");
    const scriptsBtn = Array.from(buttons).find(
      (b) => b.textContent?.startsWith("Scripts"),
    ) as HTMLButtonElement;
    scriptsBtn.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );

    // Wait for async fetch to update the list
    await vi.waitFor(() => {
      const titles = document.querySelectorAll(".turtle-exchange-item-title");
      const titleTexts = Array.from(titles).map((t) => t.textContent);
      // Should eventually show the mock index scripts
      expect(titleTexts.some((t) => t?.includes("Spiral"))).toBe(true);
      expect(titleTexts.some((t) => t?.includes("Tree"))).toBe(true);
    });
  });

  it("shows status badges for installed and update-available scripts", () => {
    // Pre-populate cache with one script
    storageMap.set(
      "drawfinity:exchange:script:spiral",
      JSON.stringify({
        id: "spiral",
        title: "Spiral",
        description: "A cool spiral",
        author: "alice",
        tags: ["pattern"],
        path: "scripts/spiral",
        version: "1.0.0",
        code: "forward(100)",
        cachedAt: Date.now(),
      }),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline")),
    );

    // Set update result: tree has an update
    panel.setUpdateResult({
      hasUpdates: true,
      newScripts: [],
      updatedScripts: [
        {
          entry: MOCK_INDEX.scripts[1],
          currentVersion: "1.0.0",
          newVersion: "2.0.0",
        },
      ],
      remoteIndex: MOCK_INDEX,
    });

    // Open browser — need to use cached index for these scripts to show
    storageMap.set(
      "drawfinity:exchange:index",
      JSON.stringify({ ...MOCK_INDEX, cachedAt: Date.now() }),
    );

    const buttons = document.querySelectorAll(".turtle-btn-secondary");
    const scriptsBtn = Array.from(buttons).find(
      (b) => b.textContent?.startsWith("Scripts"),
    ) as HTMLButtonElement;
    scriptsBtn.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );

    const statusBadges = document.querySelectorAll(".turtle-exchange-status");
    const statuses = Array.from(statusBadges).map((b) => b.textContent);
    expect(statuses).toContain("Installed");
    expect(statuses).toContain("Update Available");
  });

  it("shows update badge on Scripts button when updates exist", () => {
    panel.setUpdateResult({
      hasUpdates: true,
      newScripts: [MOCK_INDEX.scripts[0]],
      updatedScripts: [
        {
          entry: MOCK_INDEX.scripts[1],
          currentVersion: "1.0.0",
          newVersion: "2.0.0",
        },
      ],
      remoteIndex: MOCK_INDEX,
    });

    const badge = document.querySelector(".turtle-scripts-badge") as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.style.display).not.toBe("none");
    expect(badge.textContent).toBe("2");
  });

  it("hides update badge when no updates", () => {
    panel.setUpdateResult({
      hasUpdates: false,
      newScripts: [],
      updatedScripts: [],
      remoteIndex: MOCK_INDEX,
    });

    const badge = document.querySelector(".turtle-scripts-badge") as HTMLElement;
    expect(badge.style.display).toBe("none");
  });

  it("imports a script into the editor on Import click", async () => {
    const luaCode = "forward(100)\nright(90)";
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // index fetch
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(MOCK_INDEX),
            text: () => Promise.resolve(JSON.stringify(MOCK_INDEX)),
          });
        }
        // script fetch
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(luaCode),
          text: () => Promise.resolve(luaCode),
        });
      }),
    );

    // Open exchange
    const buttons = document.querySelectorAll(".turtle-btn-secondary");
    const scriptsBtn = Array.from(buttons).find(
      (b) => b.textContent?.startsWith("Scripts"),
    ) as HTMLButtonElement;
    scriptsBtn.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );

    // Wait for script list to update from fetch
    await vi.waitFor(() => {
      const items = document.querySelectorAll(".turtle-exchange-item");
      expect(items.length).toBe(2);
    });

    // Click Import on first script
    const importBtn = document.querySelector(
      ".turtle-exchange-import-btn",
    ) as HTMLButtonElement;
    importBtn.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );

    // Wait for import to complete (overlay closes)
    await vi.waitFor(() => {
      expect(document.querySelector(".turtle-exchange-overlay")).toBeNull();
    });

    // Editor should contain the imported code
    expect(panel.getScript()).toBe(luaCode);
  });

  it("shows Update button for scripts with update-available status", () => {
    // Set up cached index and update result
    storageMap.set(
      "drawfinity:exchange:index",
      JSON.stringify({ ...MOCK_INDEX, cachedAt: Date.now() }),
    );
    storageMap.set(
      "drawfinity:exchange:script:spiral",
      JSON.stringify({
        id: "spiral",
        title: "Spiral",
        description: "A cool spiral",
        author: "alice",
        tags: ["pattern"],
        path: "scripts/spiral",
        version: "1.0.0",
        code: "forward(100)",
        cachedAt: Date.now(),
      }),
    );

    panel.setUpdateResult({
      hasUpdates: true,
      newScripts: [],
      updatedScripts: [
        {
          entry: MOCK_INDEX.scripts[0],
          currentVersion: "1.0.0",
          newVersion: "2.0.0",
        },
      ],
      remoteIndex: MOCK_INDEX,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline")),
    );

    const buttons = document.querySelectorAll(".turtle-btn-secondary");
    const scriptsBtn = Array.from(buttons).find(
      (b) => b.textContent?.startsWith("Scripts"),
    ) as HTMLButtonElement;
    scriptsBtn.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );

    const actionBtns = document.querySelectorAll(".turtle-exchange-import-btn");
    const updateBtn = Array.from(actionBtns).find(
      (b) => b.textContent === "Update",
    );
    expect(updateBtn).toBeTruthy();
    expect(updateBtn?.classList.contains("turtle-btn-update")).toBe(true);
  });
});
