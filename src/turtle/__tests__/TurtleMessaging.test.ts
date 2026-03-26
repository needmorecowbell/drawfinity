import { describe, it, expect, beforeEach } from "vitest";
import { MessageBus, Blackboard } from "../TurtleMessaging";

describe("MessageBus", () => {
  let bus: MessageBus;

  beforeEach(() => {
    bus = new MessageBus();
    bus.register("t1");
    bus.register("t2");
    bus.register("t3");
  });

  describe("register / unregister", () => {
    it("creates an empty queue on register", () => {
      expect(bus.pendingCount("t1")).toBe(0);
    });

    it("removes queue on unregister", () => {
      bus.send("t1", "t2", "hello");
      bus.unregister("t2");
      expect(bus.pendingCount("t2")).toBe(0);
      expect(bus.receive("t2")).toBeUndefined();
    });

    it("re-register starts with an empty queue", () => {
      bus.send("t1", "t2", "hello");
      bus.unregister("t2");
      bus.register("t2");
      expect(bus.pendingCount("t2")).toBe(0);
    });
  });

  describe("send", () => {
    it("delivers a message to the target turtle", () => {
      bus.send("t1", "t2", "hello");
      const msg = bus.receive("t2");
      expect(msg).toEqual({ fromId: "t1", toId: "t2", data: "hello" });
    });

    it("queues multiple messages in order", () => {
      bus.send("t1", "t2", "first");
      bus.send("t1", "t2", "second");
      bus.send("t3", "t2", "third");
      expect(bus.receive("t2")!.data).toBe("first");
      expect(bus.receive("t2")!.data).toBe("second");
      expect(bus.receive("t2")!.data).toBe("third");
    });

    it("throws for unknown target", () => {
      expect(() => bus.send("t1", "nonexistent", "data")).toThrow(
        'Unknown turtle "nonexistent"',
      );
    });

    it("handles various data types", () => {
      bus.send("t1", "t2", 42);
      bus.send("t1", "t2", true);
      bus.send("t1", "t2", { nested: [1, 2, 3] });
      bus.send("t1", "t2", null);

      expect(bus.receive("t2")!.data).toBe(42);
      expect(bus.receive("t2")!.data).toBe(true);
      expect(bus.receive("t2")!.data).toEqual({ nested: [1, 2, 3] });
      expect(bus.receive("t2")!.data).toBeNull();
    });
  });

  describe("receive", () => {
    it("returns undefined when queue is empty", () => {
      expect(bus.receive("t1")).toBeUndefined();
    });

    it("removes the message from the queue", () => {
      bus.send("t1", "t2", "msg");
      bus.receive("t2");
      expect(bus.pendingCount("t2")).toBe(0);
    });

    it("returns undefined for unregistered turtle", () => {
      expect(bus.receive("unknown")).toBeUndefined();
    });
  });

  describe("peek", () => {
    it("reads oldest message without removing it", () => {
      bus.send("t1", "t2", "msg");
      const first = bus.peek("t2");
      const second = bus.peek("t2");
      expect(first).toEqual(second);
      expect(bus.pendingCount("t2")).toBe(1);
    });

    it("returns undefined when queue is empty", () => {
      expect(bus.peek("t1")).toBeUndefined();
    });

    it("returns undefined for unregistered turtle", () => {
      expect(bus.peek("unknown")).toBeUndefined();
    });
  });

  describe("broadcast", () => {
    it("sends to all registered turtles except sender", () => {
      bus.broadcast("t1", "hello all");
      expect(bus.pendingCount("t1")).toBe(0);
      expect(bus.pendingCount("t2")).toBe(1);
      expect(bus.pendingCount("t3")).toBe(1);

      const msg2 = bus.receive("t2")!;
      expect(msg2.fromId).toBe("t1");
      expect(msg2.data).toBe("hello all");

      const msg3 = bus.receive("t3")!;
      expect(msg3.fromId).toBe("t1");
      expect(msg3.data).toBe("hello all");
    });

    it("does not send to unregistered turtles", () => {
      bus.unregister("t3");
      bus.broadcast("t1", "data");
      expect(bus.pendingCount("t2")).toBe(1);
      expect(bus.pendingCount("t3")).toBe(0);
    });
  });

  describe("pendingCount", () => {
    it("returns 0 for unknown turtle", () => {
      expect(bus.pendingCount("unknown")).toBe(0);
    });

    it("tracks count accurately through send/receive", () => {
      bus.send("t1", "t2", "a");
      bus.send("t1", "t2", "b");
      expect(bus.pendingCount("t2")).toBe(2);
      bus.receive("t2");
      expect(bus.pendingCount("t2")).toBe(1);
      bus.receive("t2");
      expect(bus.pendingCount("t2")).toBe(0);
    });
  });

  describe("clear", () => {
    it("removes all queues and registrations", () => {
      bus.send("t1", "t2", "msg");
      bus.clear();
      expect(bus.pendingCount("t2")).toBe(0);
      expect(bus.receive("t2")).toBeUndefined();
      // After clear, sending to previously registered turtles should throw
      expect(() => bus.send("t1", "t2", "data")).toThrow(
        'Unknown turtle "t2"',
      );
    });
  });
});

describe("Blackboard", () => {
  let board: Blackboard;

  beforeEach(() => {
    board = new Blackboard();
  });

  describe("publish / read", () => {
    it("stores and retrieves a string value", () => {
      board.publish("color", "red");
      expect(board.read("color")).toBe("red");
    });

    it("stores and retrieves a number value", () => {
      board.publish("score", 42);
      expect(board.read("score")).toBe(42);
    });

    it("stores and retrieves a boolean value", () => {
      board.publish("active", true);
      expect(board.read("active")).toBe(true);
    });

    it("stores and retrieves a table (object) value", () => {
      const table = { x: 10, y: 20, items: [1, 2] };
      board.publish("state", table);
      expect(board.read("state")).toEqual(table);
    });

    it("overwrites existing key", () => {
      board.publish("key", "old");
      board.publish("key", "new");
      expect(board.read("key")).toBe("new");
    });

    it("returns undefined for missing key", () => {
      expect(board.read("missing")).toBeUndefined();
    });

    it("stores null value", () => {
      board.publish("nullable", null);
      expect(board.read("nullable")).toBeNull();
    });
  });

  describe("keys", () => {
    it("returns empty array when empty", () => {
      expect(board.keys()).toEqual([]);
    });

    it("returns all published keys", () => {
      board.publish("a", 1);
      board.publish("b", 2);
      board.publish("c", 3);
      expect(board.keys().sort()).toEqual(["a", "b", "c"]);
    });

    it("does not include duplicate keys", () => {
      board.publish("x", 1);
      board.publish("x", 2);
      expect(board.keys()).toEqual(["x"]);
    });
  });

  describe("has", () => {
    it("returns false for missing key", () => {
      expect(board.has("missing")).toBe(false);
    });

    it("returns true for existing key", () => {
      board.publish("key", "val");
      expect(board.has("key")).toBe(true);
    });

    it("returns true for key with null value", () => {
      board.publish("key", null);
      expect(board.has("key")).toBe(true);
    });
  });

  describe("clear", () => {
    it("removes all entries", () => {
      board.publish("a", 1);
      board.publish("b", 2);
      board.clear();
      expect(board.keys()).toEqual([]);
      expect(board.read("a")).toBeUndefined();
      expect(board.has("a")).toBe(false);
    });
  });
});
