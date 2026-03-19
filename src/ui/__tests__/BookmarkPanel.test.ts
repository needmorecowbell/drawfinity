// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BookmarkPanel } from "../BookmarkPanel";
import { DrawfinityDoc } from "../../crdt/DrawfinityDoc";
import { Camera } from "../../camera/Camera";
import { CameraBookmark } from "../../model/Bookmark";

function makeBookmark(overrides: Partial<CameraBookmark> = {}): CameraBookmark {
  return {
    id: "bm-1",
    label: "Bookmark 1",
    x: 100,
    y: 200,
    zoom: 1.5,
    createdBy: "user-1",
    createdAt: 1710000000000,
    ...overrides,
  };
}

describe("BookmarkPanel", () => {
  let panel: BookmarkPanel;
  let doc: DrawfinityDoc;
  let camera: Camera;
  let navigateSpy: ReturnType<typeof vi.fn<(bookmark: CameraBookmark) => void>>;

  beforeEach(() => {
    doc = new DrawfinityDoc();
    camera = new Camera();
    camera.x = 50;
    camera.y = 75;
    camera.zoom = 2;
    navigateSpy = vi.fn<(bookmark: CameraBookmark) => void>();
    panel = new BookmarkPanel(doc, camera, {
      onNavigate: navigateSpy,
      getUserId: () => "test-user",
      getUserName: () => "Test User",
    });
  });

  afterEach(() => {
    panel.destroy();
  });

  it("is not visible by default", () => {
    expect(panel.isVisible()).toBe(false);
    expect(document.getElementById("bookmark-panel")).toBeNull();
  });

  it("show() adds panel to DOM", () => {
    panel.show();
    expect(panel.isVisible()).toBe(true);
    expect(document.getElementById("bookmark-panel")).not.toBeNull();
  });

  it("hide() removes panel from DOM", () => {
    panel.show();
    panel.hide();
    expect(panel.isVisible()).toBe(false);
    expect(document.getElementById("bookmark-panel")).toBeNull();
  });

  it("toggle() toggles visibility", () => {
    panel.toggle();
    expect(panel.isVisible()).toBe(true);
    panel.toggle();
    expect(panel.isVisible()).toBe(false);
  });

  it("renders empty state when no bookmarks", () => {
    panel.show();
    const empty = document.querySelector(".bm-empty") as HTMLElement;
    expect(empty).not.toBeNull();
    expect(empty.textContent).toContain("No bookmarks yet");
  });

  it("renders bookmark items when bookmarks exist", () => {
    doc.addBookmark(makeBookmark({ id: "bm-1", label: "View A" }));
    doc.addBookmark(makeBookmark({ id: "bm-2", label: "View B" }));
    panel.show();

    const items = document.querySelectorAll(".bm-item");
    expect(items.length).toBe(2);

    const labels = document.querySelectorAll(".bm-label");
    expect(labels[0].textContent).toBe("View A");
    expect(labels[1].textContent).toBe("View B");
  });

  it("hides empty state when bookmarks exist", () => {
    doc.addBookmark(makeBookmark());
    panel.show();
    const empty = document.querySelector(".bm-empty");
    expect(empty).toBeNull();
  });

  it("clicking a bookmark label triggers onNavigate callback", () => {
    const bm = makeBookmark({ id: "bm-nav", label: "Navigate Here" });
    doc.addBookmark(bm);
    panel.show();

    const label = document.querySelector(".bm-label") as HTMLElement;
    label.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(navigateSpy).toHaveBeenCalledOnce();
    const called = navigateSpy.mock.calls[0][0] as CameraBookmark;
    expect(called.id).toBe("bm-nav");
    expect(called.x).toBe(100);
    expect(called.y).toBe(200);
    expect(called.zoom).toBe(1.5);
  });

  it("clicking delete button removes the bookmark", () => {
    doc.addBookmark(makeBookmark({ id: "bm-del" }));
    panel.show();

    expect(document.querySelectorAll(".bm-item").length).toBe(1);

    const deleteBtn = document.querySelector(".bm-action-delete") as HTMLButtonElement;
    deleteBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(doc.getBookmarks().length).toBe(0);
    // Panel re-renders on change
    expect(document.querySelectorAll(".bm-item").length).toBe(0);
    expect(document.querySelector(".bm-empty")).not.toBeNull();
  });

  it("clicking edit button shows inline input", () => {
    doc.addBookmark(makeBookmark({ id: "bm-edit", label: "Original" }));
    panel.show();

    const editBtn = document.querySelector(".bm-action-btn") as HTMLButtonElement;
    editBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    const input = document.querySelector(".bm-edit-input") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe("Original");
  });

  it("pressing Enter in edit input commits the new label", () => {
    doc.addBookmark(makeBookmark({ id: "bm-edit2", label: "Old Name" }));
    panel.show();

    // Start editing
    const editBtn = document.querySelector(".bm-action-btn") as HTMLButtonElement;
    editBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    const input = document.querySelector(".bm-edit-input") as HTMLInputElement;
    input.value = "New Name";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    const bookmarks = doc.getBookmarks();
    expect(bookmarks[0].label).toBe("New Name");
  });

  it("pressing Escape in edit input cancels editing", () => {
    doc.addBookmark(makeBookmark({ id: "bm-esc", label: "Keep This" }));
    panel.show();

    const editBtn = document.querySelector(".bm-action-btn") as HTMLButtonElement;
    editBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    const input = document.querySelector(".bm-edit-input") as HTMLInputElement;
    input.value = "Changed";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    const bookmarks = doc.getBookmarks();
    expect(bookmarks[0].label).toBe("Keep This");
  });

  describe("addBookmark()", () => {
    it("adds a bookmark at current camera position", () => {
      panel.addBookmark();

      const bookmarks = doc.getBookmarks();
      expect(bookmarks.length).toBe(1);
      expect(bookmarks[0].x).toBe(50);
      expect(bookmarks[0].y).toBe(75);
      expect(bookmarks[0].zoom).toBe(2);
      expect(bookmarks[0].label).toBe("Bookmark 1");
      expect(bookmarks[0].createdBy).toBe("test-user");
    });

    it("uses custom label when provided", () => {
      panel.addBookmark("My Spot");

      const bookmarks = doc.getBookmarks();
      expect(bookmarks[0].label).toBe("My Spot");
    });

    it("increments default label number", () => {
      panel.addBookmark();
      panel.addBookmark();

      const bookmarks = doc.getBookmarks();
      expect(bookmarks[0].label).toBe("Bookmark 1");
      expect(bookmarks[1].label).toBe("Bookmark 2");
    });

    it("shows panel if not already visible", () => {
      expect(panel.isVisible()).toBe(false);
      panel.addBookmark();
      expect(panel.isVisible()).toBe(true);
    });
  });

  it("renders header with title and add button", () => {
    panel.show();
    const title = document.querySelector(".bm-title") as HTMLElement;
    expect(title.textContent).toBe("Bookmarks");

    const addBtn = document.querySelector(".bm-add-btn") as HTMLButtonElement;
    expect(addBtn).not.toBeNull();
  });

  it("clicking add button adds a bookmark", () => {
    panel.show();
    const addBtn = document.querySelector(".bm-add-btn") as HTMLButtonElement;
    addBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(doc.getBookmarks().length).toBe(1);
  });

  it("each item has edit and delete action buttons", () => {
    doc.addBookmark(makeBookmark());
    panel.show();

    const actions = document.querySelectorAll(".bm-action-btn");
    expect(actions.length).toBe(2); // edit + delete
  });

  it("updates list when bookmarks change externally", () => {
    panel.show();
    expect(document.querySelectorAll(".bm-item").length).toBe(0);

    // Simulate external addition (e.g. from remote collaborator)
    doc.addBookmark(makeBookmark({ id: "remote-bm", label: "Remote View" }));

    const items = document.querySelectorAll(".bm-item");
    expect(items.length).toBe(1);
    expect(document.querySelector(".bm-label")?.textContent).toBe("Remote View");
  });

  it("destroy removes panel and cleans up", () => {
    panel.show();
    panel.destroy();
    expect(document.getElementById("bookmark-panel")).toBeNull();
    // Re-create for afterEach
    panel = new BookmarkPanel(doc, camera);
  });

  describe("collaboration sync", () => {
    let collabPanel: BookmarkPanel;

    afterEach(() => {
      collabPanel?.destroy();
    });

    it("shows creator name for remote bookmarks in collaborative mode", () => {
      collabPanel = new BookmarkPanel(doc, camera, {
        getUserId: () => "local-user",
        getUserName: () => "Local User",
        resolveUserName: (userId) => (userId === "remote-1" ? "Alice" : undefined),
        isCollaborating: () => true,
      });

      doc.addBookmark(makeBookmark({ id: "bm-remote", label: "Remote View", createdBy: "remote-1", createdByName: "Alice" }));
      collabPanel.show();

      const creator = document.querySelector(".bm-creator") as HTMLElement;
      expect(creator).not.toBeNull();
      expect(creator.textContent).toBe("Alice");
    });

    it("hides creator name for own bookmarks", () => {
      collabPanel = new BookmarkPanel(doc, camera, {
        getUserId: () => "local-user",
        getUserName: () => "Local User",
        resolveUserName: () => undefined,
        isCollaborating: () => true,
      });

      doc.addBookmark(makeBookmark({ id: "bm-own", label: "My View", createdBy: "local-user" }));
      collabPanel.show();

      const creator = document.querySelector(".bm-creator");
      expect(creator).toBeNull();
    });

    it("hides creator name when not collaborating", () => {
      collabPanel = new BookmarkPanel(doc, camera, {
        getUserId: () => "local-user",
        getUserName: () => "Local User",
        resolveUserName: () => "Alice",
        isCollaborating: () => false,
      });

      doc.addBookmark(makeBookmark({ id: "bm-solo", label: "Solo View", createdBy: "remote-1" }));
      collabPanel.show();

      const creator = document.querySelector(".bm-creator");
      expect(creator).toBeNull();
    });

    it("falls back to stored createdByName when user is not connected", () => {
      collabPanel = new BookmarkPanel(doc, camera, {
        getUserId: () => "local-user",
        getUserName: () => "Local User",
        resolveUserName: () => undefined, // user not in awareness
        isCollaborating: () => true,
      });

      doc.addBookmark(makeBookmark({ id: "bm-gone", label: "Gone User", createdBy: "gone-user", createdByName: "Bob" }));
      collabPanel.show();

      const creator = document.querySelector(".bm-creator") as HTMLElement;
      expect(creator).not.toBeNull();
      expect(creator.textContent).toBe("Bob");
    });

    it("stores createdByName when adding a bookmark", () => {
      collabPanel = new BookmarkPanel(doc, camera, {
        getUserId: () => "test-user",
        getUserName: () => "Test User",
        isCollaborating: () => true,
      });

      collabPanel.addBookmark("My Spot");

      const bookmarks = doc.getBookmarks();
      expect(bookmarks[0].createdByName).toBe("Test User");
    });

    it("refreshList() re-renders the bookmark list", () => {
      collabPanel = new BookmarkPanel(doc, camera, {
        getUserId: () => "local-user",
        getUserName: () => "Local User",
        resolveUserName: () => undefined,
        isCollaborating: () => true,
      });

      doc.addBookmark(makeBookmark({ id: "bm-ref", label: "Refresh Test", createdBy: "remote-1", createdByName: "Old Name" }));
      collabPanel.show();

      // Initially shows stored name
      let creator = document.querySelector(".bm-creator") as HTMLElement;
      expect(creator.textContent).toBe("Old Name");

      // Destroy and recreate with updated resolveUserName
      collabPanel.destroy();
      collabPanel = new BookmarkPanel(doc, camera, {
        getUserId: () => "local-user",
        getUserName: () => "Local User",
        resolveUserName: () => "New Name",
        isCollaborating: () => true,
      });
      collabPanel.show();
      collabPanel.refreshList();

      creator = document.querySelector(".bm-creator") as HTMLElement;
      expect(creator.textContent).toBe("New Name");
    });

    it("updates list when remote user adds a bookmark", () => {
      collabPanel = new BookmarkPanel(doc, camera, {
        getUserId: () => "local-user",
        getUserName: () => "Local User",
        resolveUserName: (id) => (id === "remote-2" ? "Charlie" : undefined),
        isCollaborating: () => true,
      });
      collabPanel.show();

      expect(document.querySelectorAll(".bm-item").length).toBe(0);

      // Simulate remote addition
      doc.addBookmark(makeBookmark({ id: "remote-added", label: "Remote Added", createdBy: "remote-2", createdByName: "Charlie" }));

      const items = document.querySelectorAll(".bm-item");
      expect(items.length).toBe(1);
      expect(document.querySelector(".bm-label")?.textContent).toBe("Remote Added");
      expect(document.querySelector(".bm-creator")?.textContent).toBe("Charlie");
    });

    it("updates list when remote user removes a bookmark", () => {
      doc.addBookmark(makeBookmark({ id: "to-remove", label: "Will Be Removed", createdBy: "remote-3" }));

      collabPanel = new BookmarkPanel(doc, camera, {
        getUserId: () => "local-user",
        getUserName: () => "Local User",
        isCollaborating: () => true,
      });
      collabPanel.show();

      expect(document.querySelectorAll(".bm-item").length).toBe(1);

      // Simulate remote removal
      doc.removeBookmark("to-remove");

      expect(document.querySelectorAll(".bm-item").length).toBe(0);
      expect(document.querySelector(".bm-empty")).not.toBeNull();
    });
  });
});
