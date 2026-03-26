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

describe("LuaRuntime simulate() and get_step()", () => {
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
    runtime.setStateQuery({
      getPosition: () => ({ x: 0, y: 0 }),
      getHeading: () => 0,
      isDown: () => true,
    });
    bus.register(`${scriptId}:main`);
  });

  afterEach(() => {
    runtime.close();
  });

  describe("get_step()", () => {
    it("returns 0 outside of simulate()", async () => {
      const result = await runtime.execute(`
        step_val = get_step()
      `);
      expect(result.success).toBe(true);
      // get_step returns 0 outside of simulate
      const cmds = runtime.getCommands();
      // No step_boundary commands expected
      expect(cmds.filter((c) => c.type === "step_boundary").length).toBe(0);
    });

    it("returns current step number inside simulate()", async () => {
      const result = await runtime.execute(`
        steps_seen = {}
        simulate(5, function(step)
          steps_seen[step] = get_step()
        end)
        -- verify steps_seen has correct values
        for i = 1, 5 do
          assert(steps_seen[i] == i, "step " .. i .. " should be " .. i .. " but got " .. tostring(steps_seen[i]))
        end
      `);
      expect(result.success).toBe(true);
    });

    it("returns 0 after simulate() completes", async () => {
      const result = await runtime.execute(`
        simulate(3, function(step) end)
        final_step = get_step()
        assert(final_step == 0, "get_step() should be 0 after simulate, got " .. tostring(final_step))
      `);
      expect(result.success).toBe(true);
    });
  });

  describe("simulate()", () => {
    it("calls step function for each step", async () => {
      const result = await runtime.execute(`
        count = 0
        simulate(10, function(step)
          count = count + 1
        end)
        assert(count == 10, "expected 10 steps, got " .. tostring(count))
      `);
      expect(result.success).toBe(true);
    });

    it("generates step_boundary commands in the command stream", async () => {
      const result = await runtime.execute(`
        simulate(3, function(step)
          forward(10)
        end)
      `);
      expect(result.success).toBe(true);
      const cmds = runtime.getCommands();
      const boundaries = cmds.filter((c) => c.type === "step_boundary");
      expect(boundaries.length).toBe(3);
      expect(boundaries[0]).toEqual({ type: "step_boundary", step: 1 });
      expect(boundaries[1]).toEqual({ type: "step_boundary", step: 2 });
      expect(boundaries[2]).toEqual({ type: "step_boundary", step: 3 });
    });

    it("interleaves step_boundary with turtle commands", async () => {
      const result = await runtime.execute(`
        simulate(2, function(step)
          forward(step * 10)
        end)
      `);
      expect(result.success).toBe(true);
      const cmds = runtime.getCommands();
      expect(cmds.length).toBe(4); // 2 boundaries + 2 forwards
      expect(cmds[0].type).toBe("step_boundary");
      expect(cmds[1].type).toBe("forward");
      expect((cmds[1] as { type: "forward"; distance: number }).distance).toBe(10);
      expect(cmds[2].type).toBe("step_boundary");
      expect(cmds[3].type).toBe("forward");
      expect((cmds[3] as { type: "forward"; distance: number }).distance).toBe(20);
    });

    it("allows spatial queries inside step function", async () => {
      // Spawn a nearby turtle
      const result = await runtime.execute(`
        local t = spawn("helper", { x = 5, y = 0 })
        simulate(1, function(step)
          local nearby = nearby_turtles(100)
          -- should find the helper turtle
          assert(#nearby > 0, "expected at least one nearby turtle")
        end)
      `);
      expect(result.success).toBe(true);
    });

    it("allows messaging between steps", async () => {
      const result = await runtime.execute(`
        local helper = spawn("helper", { x = 10, y = 0 })
        results = {}
        simulate(3, function(step)
          if step == 1 then
            send("main", "hello from step 1")
          elseif step == 2 then
            local msg = receive()
            if msg then
              results[1] = msg.data
            end
          end
        end)
        assert(results[1] == "hello from step 1", "expected message from step 1, got: " .. tostring(results[1]))
      `);
      // The main turtle sends to itself, then receives in step 2
      expect(result.success).toBe(true);
    });

    it("allows blackboard usage across steps", async () => {
      const result = await runtime.execute(`
        simulate(3, function(step)
          if step == 1 then
            publish("counter", 0)
          end
          local val = read_board("counter")
          if val ~= nil then
            publish("counter", val + 1)
          end
        end)
        final = read_board("counter")
        assert(final == 3, "expected counter=3, got " .. tostring(final))
      `);
      expect(result.success).toBe(true);
    });

    it("rejects non-positive steps", async () => {
      const result = await runtime.execute(`simulate(0, function() end)`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("positive integer");
    });

    it("rejects non-integer steps", async () => {
      const result = await runtime.execute(`simulate(2.5, function() end)`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("positive integer");
    });

    it("rejects missing function", async () => {
      const result = await runtime.execute(`simulate(5, "not a function")`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("function");
    });

    it("enforces max steps limit", async () => {
      runtime.setMaxSimulateSteps(100);
      const result = await runtime.execute(`simulate(101, function() end)`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("exceeds maximum");
    });

    it("respects custom max steps limit via set_max_steps()", async () => {
      const result = await runtime.execute(`
        set_max_steps(50)
        simulate(51, function() end)
      `);
      expect(result.success).toBe(false);
      expect(result.error).toContain("exceeds maximum");
    });

    it("allows simulate at exactly the max limit", async () => {
      runtime.setMaxSimulateSteps(5);
      const result = await runtime.execute(`
        count = 0
        simulate(5, function(step) count = count + 1 end)
        assert(count == 5)
      `);
      expect(result.success).toBe(true);
    });

    it("rejects recursive simulate calls", async () => {
      const result = await runtime.execute(`
        simulate(3, function(step)
          if step == 2 then
            simulate(2, function() end)
          end
        end)
      `);
      expect(result.success).toBe(false);
      expect(result.error).toContain("recursively");
    });

    it("default max steps is 10000", () => {
      expect(runtime.getMaxSimulateSteps()).toBe(10000);
    });

    it("set_max_steps validates input", async () => {
      const result = await runtime.execute(`set_max_steps(-1)`);
      expect(result.success).toBe(false);
      expect(result.error).toContain("positive integer");

      const result2 = await runtime.execute(`set_max_steps(1.5)`);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain("positive integer");
    });

    it("commands from step function are correctly ordered", async () => {
      const result = await runtime.execute(`
        simulate(3, function(step)
          pencolor("#ff0000")
          forward(step * 5)
        end)
      `);
      expect(result.success).toBe(true);
      const cmds = runtime.getCommands();
      // 3 steps × (1 boundary + 1 pencolor + 1 forward) = 9 commands
      expect(cmds.length).toBe(9);

      // Step 1
      expect(cmds[0]).toEqual({ type: "step_boundary", step: 1 });
      expect(cmds[1].type).toBe("pencolor");
      expect(cmds[2].type).toBe("forward");
      expect((cmds[2] as { type: "forward"; distance: number }).distance).toBe(5);

      // Step 2
      expect(cmds[3]).toEqual({ type: "step_boundary", step: 2 });
      expect(cmds[4].type).toBe("pencolor");
      expect(cmds[5].type).toBe("forward");
      expect((cmds[5] as { type: "forward"; distance: number }).distance).toBe(10);

      // Step 3
      expect(cmds[6]).toEqual({ type: "step_boundary", step: 3 });
      expect(cmds[7].type).toBe("pencolor");
      expect(cmds[8].type).toBe("forward");
      expect((cmds[8] as { type: "forward"; distance: number }).distance).toBe(15);
    });

    it("commands before simulate are preserved", async () => {
      const result = await runtime.execute(`
        forward(100)
        simulate(2, function(step)
          forward(step)
        end)
        forward(200)
      `);
      expect(result.success).toBe(true);
      const cmds = runtime.getCommands();
      // forward(100) + 2×(boundary + forward) + forward(200) = 1 + 4 + 1 = 6
      expect(cmds.length).toBe(6);
      expect(cmds[0].type).toBe("forward");
      expect((cmds[0] as { type: "forward"; distance: number }).distance).toBe(100);
      expect(cmds[1].type).toBe("step_boundary");
      expect(cmds[5].type).toBe("forward");
      expect((cmds[5] as { type: "forward"; distance: number }).distance).toBe(200);
    });

    it("works with spawned turtles across steps", async () => {
      const result = await runtime.execute(`
        local t = spawn("worker", { x = 10, y = 0 })
        simulate(2, function(step)
          forward(10)
          t.forward(20)
        end)
      `);
      expect(result.success).toBe(true);
      const cmds = runtime.getCommands();
      // spawn + 2×(boundary + forward_main + forward_worker) = 1 + 6 = 7
      expect(cmds.length).toBe(7);
      expect(cmds[0].type).toBe("spawn");
      expect(cmds[1].type).toBe("step_boundary");
      expect(cmds[2].type).toBe("forward"); // main
      expect(cmds[2].turtleId).toBeUndefined(); // main has no turtleId
      expect(cmds[3].type).toBe("forward"); // worker
      expect(cmds[3].turtleId).toBe("worker");
    });
  });
});
