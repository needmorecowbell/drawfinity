import { describe, it, expect, beforeEach, vi } from "vitest";
import { DrawfinityDoc } from "../DrawfinityDoc";
import type { SharedScript } from "../DrawfinityDoc";

describe("DrawfinityDoc shared scripts", () => {
  let doc: DrawfinityDoc;

  beforeEach(() => {
    doc = new DrawfinityDoc();
  });

  it("getSharedScripts returns empty array initially", () => {
    expect(doc.getSharedScripts()).toEqual([]);
  });

  it("shareScript adds a script to the map", () => {
    const script: SharedScript = {
      id: "s1",
      title: "Test Script",
      code: "forward(100)",
      author: "Alice",
      sharedAt: 1000,
    };
    doc.shareScript(script);
    const scripts = doc.getSharedScripts();
    expect(scripts.length).toBe(1);
    expect(scripts[0]).toEqual(script);
  });

  it("getSharedScripts returns scripts sorted by sharedAt descending", () => {
    doc.shareScript({ id: "s1", title: "Old", code: "a", author: "A", sharedAt: 100 });
    doc.shareScript({ id: "s2", title: "New", code: "b", author: "B", sharedAt: 200 });
    const scripts = doc.getSharedScripts();
    expect(scripts[0].id).toBe("s2");
    expect(scripts[1].id).toBe("s1");
  });

  it("removeSharedScript removes a script", () => {
    doc.shareScript({ id: "s1", title: "T", code: "c", author: "A", sharedAt: 100 });
    doc.removeSharedScript("s1");
    expect(doc.getSharedScripts()).toEqual([]);
  });

  it("removeSharedScript is a no-op for unknown id", () => {
    doc.shareScript({ id: "s1", title: "T", code: "c", author: "A", sharedAt: 100 });
    doc.removeSharedScript("s99");
    expect(doc.getSharedScripts().length).toBe(1);
  });

  it("onSharedScriptsChanged fires on share", () => {
    const cb = vi.fn();
    doc.onSharedScriptsChanged(cb);
    doc.shareScript({ id: "s1", title: "T", code: "c", author: "A", sharedAt: 100 });
    expect(cb).toHaveBeenCalled();
  });

  it("onSharedScriptsChanged fires on remove", () => {
    doc.shareScript({ id: "s1", title: "T", code: "c", author: "A", sharedAt: 100 });
    const cb = vi.fn();
    doc.onSharedScriptsChanged(cb);
    doc.removeSharedScript("s1");
    expect(cb).toHaveBeenCalled();
  });

  it("getSharedScriptsMap returns the raw Y.Map", () => {
    const map = doc.getSharedScriptsMap();
    expect(map).toBeDefined();
    expect(map.size).toBe(0);
    doc.shareScript({ id: "s1", title: "T", code: "c", author: "A", sharedAt: 100 });
    expect(map.size).toBe(1);
  });

  it("shared scripts persist across DrawfinityDoc instances sharing a Y.Doc", () => {
    const yDoc = doc.getDoc();
    doc.shareScript({ id: "s1", title: "T", code: "forward(50)", author: "A", sharedAt: 100 });
    const doc2 = new DrawfinityDoc(yDoc);
    const scripts = doc2.getSharedScripts();
    expect(scripts.length).toBe(1);
    expect(scripts[0].code).toBe("forward(50)");
  });
});
