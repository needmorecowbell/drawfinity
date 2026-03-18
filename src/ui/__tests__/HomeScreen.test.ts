// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { HomeScreen, HomeScreenCallbacks } from "../HomeScreen";
import { DrawingMetadata } from "../../persistence/DrawingManifest";

function makeDrawing(overrides: Partial<DrawingMetadata> = {}): DrawingMetadata {
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
    onCreateDrawing: vi.fn().mockResolvedValue(makeDrawing({ id: "new", name: "Untitled" })),
    onDeleteDrawing: vi.fn().mockResolvedValue(undefined),
    onRenameDrawing: vi.fn().mockResolvedValue(undefined),
    onDuplicateDrawing: vi.fn().mockResolvedValue(makeDrawing({ id: "dup", name: "Copy" })),
    ...overrides,
  };
}

describe("HomeScreen", () => {
  let screen: HomeScreen;
  let callbacks: HomeScreenCallbacks;

  beforeEach(() => {
    callbacks = makeCallbacks();
    screen = new HomeScreen(callbacks);
  });

  afterEach(() => {
    screen.destroy();
  });

  it("is not visible by default", () => {
    expect(screen.isVisible()).toBe(false);
    expect(document.getElementById("home-screen")).toBeNull();
  });

  it("show() adds container to DOM", () => {
    screen.show();
    expect(screen.isVisible()).toBe(true);
    expect(document.getElementById("home-screen")).not.toBeNull();
  });

  it("hide() hides container", () => {
    screen.show();
    screen.hide();
    expect(screen.isVisible()).toBe(false);
    expect(screen.getContainer().style.display).toBe("none");
  });

  it("shows empty state when no drawings", () => {
    screen.show();
    screen.setDrawings([]);
    const emptyState = screen.getContainer().querySelector(".home-empty-state") as HTMLElement;
    expect(emptyState.style.display).not.toBe("none");
    expect(emptyState.textContent).toBe("Create your first drawing!");
  });

  it("renders drawing cards", () => {
    screen.show();
    screen.setDrawings([
      makeDrawing({ id: "d1", name: "Drawing 1" }),
      makeDrawing({ id: "d2", name: "Drawing 2" }),
    ]);

    const cards = screen.getContainer().querySelectorAll(".home-card");
    expect(cards.length).toBe(2);
  });

  it("displays drawing name and date on cards", () => {
    screen.show();
    screen.setDrawings([makeDrawing({ name: "Test Art" })]);

    const name = screen.getContainer().querySelector(".home-card-name");
    expect(name?.textContent).toBe("Test Art");

    const date = screen.getContainer().querySelector(".home-card-date");
    expect(date?.textContent).toBeTruthy();
  });

  it("displays thumbnail when available", () => {
    screen.show();
    screen.setDrawings([makeDrawing({ thumbnail: "data:image/png;base64,abc" })]);

    const img = screen.getContainer().querySelector(".home-card-thumbnail img") as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toBe("data:image/png;base64,abc");
  });

  it("displays placeholder when no thumbnail", () => {
    screen.show();
    screen.setDrawings([makeDrawing()]);

    const placeholder = screen.getContainer().querySelector(".home-card-placeholder");
    expect(placeholder?.textContent).toBe("No preview");
  });

  it("clicking a card calls onOpenDrawing", () => {
    screen.show();
    screen.setDrawings([makeDrawing({ id: "abc" })]);

    const card = screen.getContainer().querySelector(".home-card") as HTMLElement;
    card.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(callbacks.onOpenDrawing).toHaveBeenCalledWith("abc");
  });

  it("New Drawing button calls onCreateDrawing", () => {
    screen.show();
    const btn = screen.getContainer().querySelector(".home-btn-primary") as HTMLElement;
    btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(callbacks.onCreateDrawing).toHaveBeenCalled();
  });

  it("search filters drawings by name", () => {
    screen.show();
    screen.setDrawings([
      makeDrawing({ id: "d1", name: "Landscape" }),
      makeDrawing({ id: "d2", name: "Portrait" }),
      makeDrawing({ id: "d3", name: "Land Art" }),
    ]);

    const searchInput = screen.getContainer().querySelector(".home-search-input") as HTMLInputElement;
    searchInput.value = "land";
    searchInput.dispatchEvent(new Event("input"));

    const cards = screen.getContainer().querySelectorAll(".home-card");
    expect(cards.length).toBe(2);
  });

  it("search shows no-results message when nothing matches", () => {
    screen.show();
    screen.setDrawings([makeDrawing({ name: "Landscape" })]);

    const searchInput = screen.getContainer().querySelector(".home-search-input") as HTMLInputElement;
    searchInput.value = "zzzzz";
    searchInput.dispatchEvent(new Event("input"));

    const noResults = screen.getContainer().querySelector(".home-no-results");
    expect(noResults?.textContent).toBe("No drawings match your search.");
  });

  it("sort by name orders alphabetically", () => {
    screen.show();
    screen.setDrawings([
      makeDrawing({ id: "d1", name: "Zebra" }),
      makeDrawing({ id: "d2", name: "Apple" }),
      makeDrawing({ id: "d3", name: "Mango" }),
    ]);

    const sortSelect = screen.getContainer().querySelector(".home-sort-select") as HTMLSelectElement;
    sortSelect.value = "name";
    sortSelect.dispatchEvent(new Event("change"));

    const names = Array.from(
      screen.getContainer().querySelectorAll(".home-card-name"),
    ).map((el) => el.textContent);
    expect(names).toEqual(["Apple", "Mango", "Zebra"]);
  });

  it("sort by date orders by most recent first", () => {
    screen.show();
    screen.setDrawings([
      makeDrawing({ id: "d1", name: "Old", modifiedAt: "2026-01-01T00:00:00.000Z" }),
      makeDrawing({ id: "d2", name: "New", modifiedAt: "2026-03-18T00:00:00.000Z" }),
      makeDrawing({ id: "d3", name: "Mid", modifiedAt: "2026-02-15T00:00:00.000Z" }),
    ]);

    // Default sort is by date
    const names = Array.from(
      screen.getContainer().querySelectorAll(".home-card-name"),
    ).map((el) => el.textContent);
    expect(names).toEqual(["New", "Mid", "Old"]);
  });

  it("menu button opens context menu", () => {
    screen.show();
    screen.setDrawings([makeDrawing()]);

    const menuBtn = screen.getContainer().querySelector(".home-card-menu-btn") as HTMLElement;
    menuBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    const menu = document.querySelector(".home-context-menu");
    expect(menu).not.toBeNull();
    const items = menu!.querySelectorAll(".home-context-menu-item");
    expect(items.length).toBe(3);
    expect(items[0].textContent).toBe("Rename");
    expect(items[1].textContent).toBe("Duplicate");
    expect(items[2].textContent).toBe("Delete");
  });

  it("context menu delete item has danger styling", () => {
    screen.show();
    screen.setDrawings([makeDrawing()]);

    const menuBtn = screen.getContainer().querySelector(".home-card-menu-btn") as HTMLElement;
    menuBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    const deleteItem = document.querySelector(".home-context-menu-danger");
    expect(deleteItem).not.toBeNull();
    expect(deleteItem?.textContent).toBe("Delete");
  });

  it("Rename prompts and calls onRenameDrawing", () => {
    vi.stubGlobal("prompt", vi.fn().mockReturnValue("New Name"));
    screen.show();
    screen.setDrawings([makeDrawing({ id: "d1", name: "Old Name" })]);

    const menuBtn = screen.getContainer().querySelector(".home-card-menu-btn") as HTMLElement;
    menuBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    const renameItem = document.querySelector(".home-context-menu-item") as HTMLElement;
    renameItem.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(callbacks.onRenameDrawing).toHaveBeenCalledWith("d1", "New Name");
    vi.unstubAllGlobals();
  });

  it("Rename does nothing when prompt is cancelled", () => {
    vi.stubGlobal("prompt", vi.fn().mockReturnValue(null));
    screen.show();
    screen.setDrawings([makeDrawing()]);

    const menuBtn = screen.getContainer().querySelector(".home-card-menu-btn") as HTMLElement;
    menuBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    const renameItem = document.querySelector(".home-context-menu-item") as HTMLElement;
    renameItem.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(callbacks.onRenameDrawing).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("Delete calls onDeleteDrawing with confirmation", () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    screen.show();
    screen.setDrawings([makeDrawing({ id: "d1" })]);

    const menuBtn = screen.getContainer().querySelector(".home-card-menu-btn") as HTMLElement;
    menuBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    const items = document.querySelectorAll(".home-context-menu-item");
    const deleteItem = items[2] as HTMLElement;
    deleteItem.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(callbacks.onDeleteDrawing).toHaveBeenCalledWith("d1");
    vi.unstubAllGlobals();
  });

  it("Delete does nothing when not confirmed", () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    screen.show();
    screen.setDrawings([makeDrawing()]);

    const menuBtn = screen.getContainer().querySelector(".home-card-menu-btn") as HTMLElement;
    menuBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    const items = document.querySelectorAll(".home-context-menu-item");
    const deleteItem = items[2] as HTMLElement;
    deleteItem.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(callbacks.onDeleteDrawing).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("Duplicate calls onDuplicateDrawing", () => {
    screen.show();
    screen.setDrawings([makeDrawing({ id: "d1", name: "Art" })]);

    const menuBtn = screen.getContainer().querySelector(".home-card-menu-btn") as HTMLElement;
    menuBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    const items = document.querySelectorAll(".home-context-menu-item");
    const dupItem = items[1] as HTMLElement;
    dupItem.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(callbacks.onDuplicateDrawing).toHaveBeenCalledWith("d1", "Art (copy)");
  });

  it("setSaveDirectory updates display", () => {
    screen.show();
    screen.setSaveDirectory("/home/user/Documents/Drawfinity");

    const path = screen.getContainer().querySelector(".home-save-dir-path");
    expect(path?.textContent).toBe("/home/user/Documents/Drawfinity");
  });

  it("Change button is shown when onChangeSaveDirectory callback is provided", () => {
    screen.destroy();
    const cb = makeCallbacks({ onChangeSaveDirectory: vi.fn().mockResolvedValue(null) });
    screen = new HomeScreen(cb);
    screen.show();

    const changeBtn = screen.getContainer().querySelector(".home-btn-small");
    expect(changeBtn).not.toBeNull();
    expect(changeBtn?.textContent).toBe("Change");
  });

  it("Change button is not shown without onChangeSaveDirectory callback", () => {
    screen.show();
    const changeBtn = screen.getContainer().querySelector(".home-btn-small");
    expect(changeBtn).toBeNull();
  });

  it("right-click on card opens context menu", () => {
    screen.show();
    screen.setDrawings([makeDrawing()]);

    const card = screen.getContainer().querySelector(".home-card") as HTMLElement;
    const event = new MouseEvent("contextmenu", { bubbles: true });
    event.preventDefault = vi.fn();
    card.dispatchEvent(event);

    const menu = document.querySelector(".home-context-menu");
    expect(menu).not.toBeNull();
  });

  it("destroy cleans up DOM", () => {
    screen.show();
    screen.destroy();
    expect(screen.isVisible()).toBe(false);
    expect(screen.getContainer().children.length).toBe(0);
  });

  it("keydown in search input does not propagate", () => {
    screen.show();
    const input = screen.getContainer().querySelector(".home-search-input") as HTMLInputElement;
    const event = new KeyboardEvent("keydown", { key: "b", bubbles: true });
    const stopSpy = vi.spyOn(event, "stopPropagation");
    input.dispatchEvent(event);
    expect(stopSpy).toHaveBeenCalled();
  });
});
