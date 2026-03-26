import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LuaRuntime } from "../LuaRuntime";
import { TurtleRegistry } from "../TurtleRegistry";
import { MessageBus, Blackboard } from "../TurtleMessaging";
import { Stroke, DocumentModel } from "../../model/Stroke";

/** Minimal in-memory document for testing. */
class MockDocument implements DocumentModel {
  strokes: Stroke[] = [];
  addStroke(stroke: Stroke): void {
    this.strokes.push(stroke);
  }
  getStrokes(): Stroke[] {
    return this.strokes;
  }
  removeStroke(strokeId: string): boolean {
    const idx = this.strokes.findIndex((s) => s.id === strokeId);
    if (idx === -1) return false;
    this.strokes.splice(idx, 1);
    return true;
  }
}

describe("LuaRuntime spatial queries and messaging", () => {
  let runtime: LuaRuntime;
  let registry: TurtleRegistry;
  let bus: MessageBus;
  let board: Blackboard;
  let doc: MockDocument;
  const scriptId = "test-script";

  beforeEach(async () => {
    runtime = new LuaRuntime();
    await runtime.init();
    registry = new TurtleRegistry();
    bus = new MessageBus();
    board = new Blackboard();
    doc = new MockDocument();
    registry.createMain(scriptId, doc);
    runtime.setSpawnContext(registry, scriptId, doc);
    runtime.setMessagingContext(bus, board);
    // Register main turtle on the message bus
    bus.register(`${scriptId}:main`);
  });

  afterEach(() => {
    runtime.close();
  });

  describe("nearby_turtles()", () => {
    it("returns empty table when no other turtles exist", async () => {
      const result = await runtime.execute(`
        local t = nearby_turtles(100)
        assert(#t == 0, "expected 0 nearby, got " .. #t)
      `);
      expect(result.success).toBe(true);
    });

    it("returns nearby turtles within radius", async () => {
      // Spawn a child at (50, 0) from main at (0, 0)
      registry.spawn("child1", scriptId, doc, undefined, { x: 50, y: 0 });
      const result = await runtime.execute(`
        local t = nearby_turtles(100)
        assert(#t == 1, "expected 1 nearby, got " .. #t)
        assert(t[1].id == "child1", "expected child1, got " .. tostring(t[1].id))
        assert(t[1].distance == 50, "expected distance 50, got " .. t[1].distance)
      `);
      expect(result.success).toBe(true);
    });

    it("excludes turtles outside radius", async () => {
      registry.spawn("far", scriptId, doc, undefined, { x: 200, y: 0 });
      const result = await runtime.execute(`
        local t = nearby_turtles(100)
        assert(#t == 0, "expected 0 nearby, got " .. #t)
      `);
      expect(result.success).toBe(true);
    });

    it("returns turtles sorted by distance", async () => {
      registry.spawn("near", scriptId, doc, undefined, { x: 30, y: 0 });
      registry.spawn("mid", scriptId, doc, undefined, { x: 60, y: 0 });
      registry.spawn("far", scriptId, doc, undefined, { x: 90, y: 0 });
      const result = await runtime.execute(`
        local t = nearby_turtles(100)
        assert(#t == 3, "expected 3, got " .. #t)
        assert(t[1].id == "near")
        assert(t[2].id == "mid")
        assert(t[3].id == "far")
      `);
      expect(result.success).toBe(true);
    });

    it("validates radius argument", async () => {
      const result = await runtime.execute(`nearby_turtles("bad")`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("non-negative number");
    });

    it("errors on negative radius", async () => {
      const result = await runtime.execute(`nearby_turtles(-5)`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("non-negative number");
    });
  });

  describe("nearby_strokes()", () => {
    it("returns empty table when no strokes nearby", async () => {
      const result = await runtime.execute(`
        local s = nearby_strokes(100)
        assert(#s == 0, "expected 0 strokes, got " .. #s)
      `);
      expect(result.success).toBe(true);
    });

    it("returns stroke IDs within radius", async () => {
      doc.addStroke({
        id: "stroke1",
        points: [
          { x: 10, y: 10, pressure: 1 },
          { x: 20, y: 20, pressure: 1 },
        ],
        color: "#000",
        width: 2,
        timestamp: Date.now(),
      });
      const result = await runtime.execute(`
        local s = nearby_strokes(100)
        assert(#s == 1, "expected 1 stroke, got " .. #s)
        assert(s[1] == "stroke1")
      `);
      expect(result.success).toBe(true);
    });

    it("excludes strokes outside radius", async () => {
      doc.addStroke({
        id: "far-stroke",
        points: [
          { x: 500, y: 500, pressure: 1 },
          { x: 510, y: 510, pressure: 1 },
        ],
        color: "#000",
        width: 2,
        timestamp: Date.now(),
      });
      const result = await runtime.execute(`
        local s = nearby_strokes(10)
        assert(#s == 0, "expected 0 strokes, got " .. #s)
      `);
      expect(result.success).toBe(true);
    });

    it("validates radius argument", async () => {
      const result = await runtime.execute(`nearby_strokes("bad")`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("non-negative number");
    });
  });

  describe("distance_to()", () => {
    it("returns distance between two turtles", async () => {
      registry.spawn("other", scriptId, doc, undefined, { x: 30, y: 40 });
      const result = await runtime.execute(`
        local d = distance_to("other")
        assert(d == 50, "expected 50, got " .. d)
      `);
      expect(result.success).toBe(true);
    });

    it("errors on non-existent turtle", async () => {
      const result = await runtime.execute(`distance_to("ghost")`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown turtle");
    });

    it("validates argument type", async () => {
      const result = await runtime.execute(`distance_to(42)`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("non-empty string");
    });

    it("errors on empty string", async () => {
      const result = await runtime.execute(`distance_to("")`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("non-empty string");
    });
  });

  describe("send() and receive()", () => {
    it("sends and receives a message between turtles", async () => {
      registry.spawn("child1", scriptId, doc);
      bus.register(`${scriptId}:child1`);
      // Send from main to child1
      const result = await runtime.execute(`
        send("child1", "hello")
      `);
      expect(result.success).toBe(true);

      // Now switch to child1 and receive
      runtime.setActiveTurtle("child1");
      const result2 = await runtime.execute(`
        local msg = receive()
        assert(msg ~= nil, "expected a message")
        assert(msg.from == "main", "expected from main, got " .. tostring(msg.from))
        assert(msg.data == "hello", "expected hello, got " .. tostring(msg.data))
      `);
      expect(result2.success).toBe(true);
    });

    it("receive returns nil when queue is empty", async () => {
      const result = await runtime.execute(`
        local msg = receive()
        assert(msg == nil, "expected nil, got " .. tostring(msg))
      `);
      expect(result.success).toBe(true);
    });

    it("sends numeric data", async () => {
      registry.spawn("t1", scriptId, doc);
      bus.register(`${scriptId}:t1`);
      await runtime.execute(`send("t1", 42)`);

      runtime.setActiveTurtle("t1");
      const result = await runtime.execute(`
        local msg = receive()
        assert(msg.data == 42, "expected 42, got " .. tostring(msg.data))
      `);
      expect(result.success).toBe(true);
    });

    it("sends boolean data", async () => {
      registry.spawn("t1", scriptId, doc);
      bus.register(`${scriptId}:t1`);
      await runtime.execute(`send("t1", true)`);

      runtime.setActiveTurtle("t1");
      const result = await runtime.execute(`
        local msg = receive()
        assert(msg.data == true)
      `);
      expect(result.success).toBe(true);
    });

    it("validates target ID", async () => {
      const result = await runtime.execute(`send(42, "data")`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("non-empty string");
    });

    it("errors on unknown target", async () => {
      const result = await runtime.execute(`send("nonexistent", "data")`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown turtle");
    });
  });

  describe("peek()", () => {
    it("peeks without consuming", async () => {
      registry.spawn("t1", scriptId, doc);
      bus.register(`${scriptId}:t1`);
      await runtime.execute(`send("t1", "peek-me")`);

      runtime.setActiveTurtle("t1");
      const result = await runtime.execute(`
        local msg1 = peek()
        assert(msg1 ~= nil, "first peek should return message")
        assert(msg1.data == "peek-me")
        local msg2 = peek()
        assert(msg2 ~= nil, "second peek should still return message")
        assert(msg2.data == "peek-me")
        local msg3 = receive()
        assert(msg3 ~= nil, "receive should return message")
        local msg4 = receive()
        assert(msg4 == nil, "queue should be empty after receive")
      `);
      expect(result.success).toBe(true);
    });

    it("returns nil when empty", async () => {
      const result = await runtime.execute(`
        local msg = peek()
        assert(msg == nil)
      `);
      expect(result.success).toBe(true);
    });
  });

  describe("broadcast()", () => {
    it("sends to all other turtles", async () => {
      registry.spawn("t1", scriptId, doc);
      registry.spawn("t2", scriptId, doc);
      bus.register(`${scriptId}:t1`);
      bus.register(`${scriptId}:t2`);

      // Broadcast from main
      await runtime.execute(`broadcast("hello-all")`);

      // Check t1 received
      runtime.setActiveTurtle("t1");
      const r1 = await runtime.execute(`
        local msg = receive()
        assert(msg ~= nil, "t1 should receive broadcast")
        assert(msg.from == "main")
        assert(msg.data == "hello-all")
      `);
      expect(r1.success).toBe(true);

      // Check t2 received
      runtime.setActiveTurtle("t2");
      const r2 = await runtime.execute(`
        local msg = receive()
        assert(msg ~= nil, "t2 should receive broadcast")
        assert(msg.data == "hello-all")
      `);
      expect(r2.success).toBe(true);

      // Check main did NOT receive its own broadcast
      runtime.setActiveTurtle("main");
      const r3 = await runtime.execute(`
        local msg = receive()
        assert(msg == nil, "main should not receive own broadcast")
      `);
      expect(r3.success).toBe(true);
    });
  });

  describe("publish() and read_board()", () => {
    it("writes and reads a value", async () => {
      const result = await runtime.execute(`
        publish("color", "red")
        local val = read_board("color")
        assert(val == "red", "expected red, got " .. tostring(val))
      `);
      expect(result.success).toBe(true);
    });

    it("returns nil for missing key", async () => {
      const result = await runtime.execute(`
        local val = read_board("nope")
        assert(val == nil, "expected nil for missing key")
      `);
      expect(result.success).toBe(true);
    });

    it("overwrites existing keys", async () => {
      const result = await runtime.execute(`
        publish("x", 1)
        publish("x", 2)
        local val = read_board("x")
        assert(val == 2, "expected 2, got " .. val)
      `);
      expect(result.success).toBe(true);
    });

    it("validates key type for publish", async () => {
      const result = await runtime.execute(`publish(42, "val")`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("string key");
    });

    it("validates key type for read_board", async () => {
      const result = await runtime.execute(`read_board(42)`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("string key");
    });
  });

  describe("board_keys()", () => {
    it("returns empty table when board is empty", async () => {
      const result = await runtime.execute(`
        local keys = board_keys()
        assert(#keys == 0)
      `);
      expect(result.success).toBe(true);
    });

    it("returns all published keys", async () => {
      const result = await runtime.execute(`
        publish("a", 1)
        publish("b", 2)
        publish("c", 3)
        local keys = board_keys()
        assert(#keys == 3, "expected 3 keys, got " .. #keys)
      `);
      expect(result.success).toBe(true);
    });
  });

  describe("cross-turtle blackboard sharing", () => {
    it("value published by one turtle is readable by another", async () => {
      // Main publishes
      await runtime.execute(`publish("shared", 42)`);

      // Switch to child and read
      registry.spawn("reader", scriptId, doc);
      runtime.setActiveTurtle("reader");
      const result = await runtime.execute(`
        local val = read_board("shared")
        assert(val == 42, "expected 42, got " .. tostring(val))
      `);
      expect(result.success).toBe(true);
    });
  });

  describe("context not set errors", () => {
    it("nearby_turtles errors without spawn context", async () => {
      const plain = new LuaRuntime();
      await plain.init();
      const result = await plain.execute(`nearby_turtles(10)`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Spawn context not set");
      plain.close();
    });

    it("send errors without messaging context", async () => {
      const plain = new LuaRuntime();
      await plain.init();
      plain.setSpawnContext(registry, scriptId, doc);
      const result = await plain.execute(`send("main", "hi")`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Messaging context not set");
      plain.close();
    });

    it("receive errors without messaging context", async () => {
      const plain = new LuaRuntime();
      await plain.init();
      const result = await plain.execute(`receive()`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Messaging context not set");
      plain.close();
    });

    it("publish errors without messaging context", async () => {
      const plain = new LuaRuntime();
      await plain.init();
      const result = await plain.execute(`publish("k", "v")`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Messaging context not set");
      plain.close();
    });

    it("read_board errors without messaging context", async () => {
      const plain = new LuaRuntime();
      await plain.init();
      const result = await plain.execute(`read_board("k")`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Messaging context not set");
      plain.close();
    });

    it("board_keys errors without messaging context", async () => {
      const plain = new LuaRuntime();
      await plain.init();
      const result = await plain.execute(`board_keys()`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Messaging context not set");
      plain.close();
    });

    it("broadcast errors without messaging context", async () => {
      const plain = new LuaRuntime();
      await plain.init();
      const result = await plain.execute(`broadcast("hi")`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Messaging context not set");
      plain.close();
    });

    it("peek errors without messaging context", async () => {
      const plain = new LuaRuntime();
      await plain.init();
      const result = await plain.execute(`peek()`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Messaging context not set");
      plain.close();
    });
  });
});
