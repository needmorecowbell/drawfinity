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
  scripts: [
    {
      id: "spiral",
      title: "Spiral",
      description: "A cool spiral",
      author: "alice",
      tags: ["pattern"],
      path: "scripts/spiral",
    },
    {
      id: "tree",
      title: "Tree",
      description: "Fractal tree",
      author: "bob",
      tags: ["fractal"],
      path: "scripts/tree",
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
    length: 0,
    key: () => null,
  });
});

describe("TurtlePanel Exchange UI", () => {
  let panel: TurtlePanel;

  beforeEach(() => {
    panel = new TurtlePanel("test-drawing");
    panel.show();
  });

  afterEach(() => {
    panel.destroy();
    vi.restoreAllMocks();
  });

  it("renders a Community button in the bottom bar", () => {
    const buttons = document.querySelectorAll(".turtle-btn-secondary");
    const communityBtn = Array.from(buttons).find(
      (b) => b.textContent === "Community",
    );
    expect(communityBtn).toBeTruthy();
  });

  it("opens exchange overlay and renders script list from fetched index", async () => {
    const fetchMock = mockFetchOk(MOCK_INDEX);
    vi.stubGlobal("fetch", fetchMock);

    // Click the Community button
    const buttons = document.querySelectorAll(".turtle-btn-secondary");
    const communityBtn = Array.from(buttons).find(
      (b) => b.textContent === "Community",
    ) as HTMLButtonElement;
    communityBtn.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );

    // Wait for async fetch
    await vi.waitFor(() => {
      const items = document.querySelectorAll(".turtle-exchange-item");
      expect(items.length).toBe(2);
    });

    const titles = document.querySelectorAll(".turtle-exchange-item-title");
    expect(titles[0].textContent).toBe("Spiral");
    expect(titles[1].textContent).toBe("Tree");
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
    const communityBtn = Array.from(buttons).find(
      (b) => b.textContent === "Community",
    ) as HTMLButtonElement;
    communityBtn.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );

    // Wait for script list
    await vi.waitFor(() => {
      expect(document.querySelectorAll(".turtle-exchange-item").length).toBe(2);
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
});
