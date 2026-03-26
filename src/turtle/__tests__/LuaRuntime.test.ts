import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LuaRuntime, TurtleCommand } from "../LuaRuntime";
import { TurtleRegistry } from "../TurtleRegistry";
import { Stroke, DocumentModel } from "../../model/Stroke";

describe("LuaRuntime", () => {
  let runtime: LuaRuntime;

  beforeEach(async () => {
    runtime = new LuaRuntime();
    await runtime.init();
  });

  afterEach(() => {
    runtime.close();
  });

  describe("initialization", () => {
    it("initializes without error", () => {
      // If we got here, init succeeded in beforeEach
      expect(runtime).toBeTruthy();
    });

    it("returns error when executing before init", async () => {
      const uninit = new LuaRuntime();
      const result = await uninit.execute("print('hello')");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not initialized");
    });
  });

  describe("sandbox", () => {
    it("blocks os library", async () => {
      const result = await runtime.execute("os.execute('echo hello')");
      expect(result.success).toBe(false);
    });

    it("blocks io library", async () => {
      const result = await runtime.execute("io.open('test.txt')");
      expect(result.success).toBe(false);
    });

    it("blocks dofile", async () => {
      const result = await runtime.execute("dofile('test.lua')");
      expect(result.success).toBe(false);
    });

    it("blocks loadfile", async () => {
      const result = await runtime.execute("loadfile('test.lua')");
      expect(result.success).toBe(false);
    });

    it("allows math library", async () => {
      const result = await runtime.execute("local x = math.sin(math.pi / 2)");
      expect(result.success).toBe(true);
    });

    it("allows string library", async () => {
      const result = await runtime.execute('local s = string.upper("hello")');
      expect(result.success).toBe(true);
    });

    it("allows table library", async () => {
      const result = await runtime.execute(
        "local t = {3,1,2}; table.sort(t)"
      );
      expect(result.success).toBe(true);
    });
  });

  describe("error handling", () => {
    it("catches syntax errors", async () => {
      const result = await runtime.execute("if then end end");
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("catches runtime errors", async () => {
      const result = await runtime.execute('error("boom")');
      expect(result.success).toBe(false);
      expect(result.error).toContain("boom");
    });

    it("catches nil access errors", async () => {
      const result = await runtime.execute("local x = nil; x.foo()");
      expect(result.success).toBe(false);
    });
  });

  describe("movement commands", () => {
    it("produces forward command", async () => {
      await runtime.execute("forward(100)");
      const cmds = runtime.getCommands();
      expect(cmds).toHaveLength(1);
      expect(cmds[0]).toEqual({ type: "forward", distance: 100 });
    });

    it("produces backward command", async () => {
      await runtime.execute("backward(50)");
      const cmds = runtime.getCommands();
      expect(cmds).toHaveLength(1);
      expect(cmds[0]).toEqual({ type: "backward", distance: 50 });
    });

    it("produces right turn command", async () => {
      await runtime.execute("right(90)");
      const cmds = runtime.getCommands();
      expect(cmds).toHaveLength(1);
      expect(cmds[0]).toEqual({ type: "right", angle: 90 });
    });

    it("produces left turn command", async () => {
      await runtime.execute("left(45)");
      const cmds = runtime.getCommands();
      expect(cmds).toHaveLength(1);
      expect(cmds[0]).toEqual({ type: "left", angle: 45 });
    });

    it("produces goto command via turtle_goto", async () => {
      await runtime.execute("turtle_goto(100, 200)");
      const cmds = runtime.getCommands();
      expect(cmds).toHaveLength(1);
      expect(cmds[0]).toEqual({ type: "goto", x: 100, y: 200 });
    });

    it("produces home command", async () => {
      await runtime.execute("home()");
      const cmds = runtime.getCommands();
      expect(cmds).toHaveLength(1);
      expect(cmds[0]).toEqual({ type: "home" });
    });
  });

  describe("pen control commands", () => {
    it("produces penup command", async () => {
      await runtime.execute("penup()");
      expect(runtime.getCommands()).toEqual([{ type: "penup" }]);
    });

    it("produces pendown command", async () => {
      await runtime.execute("pendown()");
      expect(runtime.getCommands()).toEqual([{ type: "pendown" }]);
    });

    it("produces pencolor command with hex string", async () => {
      await runtime.execute('pencolor("#ff0000")');
      expect(runtime.getCommands()).toEqual([
        { type: "pencolor", color: "#ff0000" },
      ]);
    });

    it("produces pencolor command with RGB values", async () => {
      await runtime.execute("pencolor(255, 128, 0)");
      expect(runtime.getCommands()).toEqual([
        { type: "pencolor", color: "#ff8000" },
      ]);
    });

    it("clamps RGB values to 0-255", async () => {
      await runtime.execute("pencolor(300, -10, 128)");
      expect(runtime.getCommands()).toEqual([
        { type: "pencolor", color: "#ff0080" },
      ]);
    });

    it("produces penwidth command", async () => {
      await runtime.execute("penwidth(5)");
      expect(runtime.getCommands()).toEqual([{ type: "penwidth", width: 5 }]);
    });

    it("produces penopacity command clamped to 0-1", async () => {
      await runtime.execute("penopacity(0.5)");
      expect(runtime.getCommands()).toEqual([
        { type: "penopacity", opacity: 0.5 },
      ]);

      runtime.close();
      runtime = new LuaRuntime();
      await runtime.init();
      await runtime.execute("penopacity(2.0)");
      expect(runtime.getCommands()).toEqual([
        { type: "penopacity", opacity: 1.0 },
      ]);
    });
  });

  describe("state queries", () => {
    it("returns default position when no state query set", async () => {
      const result = await runtime.execute(
        "local x, y = position(); print(x .. ',' .. y)"
      );
      expect(result.success).toBe(true);
      const cmds = runtime.getCommands();
      const printCmd = cmds.find((c) => c.type === "print");
      expect(printCmd).toBeDefined();
    });

    it("returns position from state query", async () => {
      runtime.setStateQuery({
        getPosition: () => ({ x: 42, y: 77 }),
        getHeading: () => 0,
        isDown: () => true,
      });
      await runtime.execute(
        "local x, y = position(); print(x .. ',' .. y)"
      );
      const cmds = runtime.getCommands();
      const printCmd = cmds.find(
        (c): c is TurtleCommand & { type: "print" } => c.type === "print"
      );
      expect(printCmd!.message).toBe("42,77");
    });

    it("returns heading from state query", async () => {
      runtime.setStateQuery({
        getPosition: () => ({ x: 0, y: 0 }),
        getHeading: () => 90,
        isDown: () => true,
      });
      await runtime.execute("print(heading())");
      const cmds = runtime.getCommands();
      const printCmd = cmds.find(
        (c): c is TurtleCommand & { type: "print" } => c.type === "print"
      );
      expect(printCmd!.message).toBe("90");
    });

    it("returns isdown from state query", async () => {
      runtime.setStateQuery({
        getPosition: () => ({ x: 0, y: 0 }),
        getHeading: () => 0,
        isDown: () => false,
      });
      await runtime.execute("print(tostring(isdown()))");
      const cmds = runtime.getCommands();
      const printCmd = cmds.find(
        (c): c is TurtleCommand & { type: "print" } => c.type === "print"
      );
      expect(printCmd!.message).toBe("false");
    });
  });

  describe("utility commands", () => {
    it("produces speed command clamped to 0-10", async () => {
      await runtime.execute("speed(5)");
      expect(runtime.getCommands()).toEqual([{ type: "speed", value: 5 }]);
    });

    it("produces clear command", async () => {
      await runtime.execute("clear()");
      expect(runtime.getCommands()).toEqual([{ type: "clear" }]);
    });

    it("produces sleep command", async () => {
      await runtime.execute("sleep(100)");
      expect(runtime.getCommands()).toEqual([{ type: "sleep", ms: 100 }]);
    });

    it("produces print command", async () => {
      await runtime.execute('print("hello world")');
      expect(runtime.getCommands()).toEqual([
        { type: "print", message: "hello world" },
      ]);
    });
  });

  describe("complex scripts", () => {
    it("executes a square drawing script", async () => {
      const result = await runtime.execute(`
        for i = 1, 4 do
          forward(100)
          right(90)
        end
      `);
      expect(result.success).toBe(true);
      const cmds = runtime.getCommands();
      expect(cmds).toHaveLength(8); // 4 forward + 4 right
      expect(cmds[0]).toEqual({ type: "forward", distance: 100 });
      expect(cmds[1]).toEqual({ type: "right", angle: 90 });
    });

    it("executes a spiral script", async () => {
      const result = await runtime.execute(`
        for i = 1, 10 do
          forward(i * 5)
          right(91)
        end
      `);
      expect(result.success).toBe(true);
      expect(runtime.getCommands()).toHaveLength(20);
    });

    it("supports user-defined functions", async () => {
      const result = await runtime.execute(`
        function square(size)
          for i = 1, 4 do
            forward(size)
            right(90)
          end
        end
        square(50)
        square(100)
      `);
      expect(result.success).toBe(true);
      expect(runtime.getCommands()).toHaveLength(16); // 2 squares × 8 commands
    });

    it("supports recursive functions", async () => {
      const result = await runtime.execute(`
        function tree(size, depth)
          if depth == 0 then return end
          forward(size)
          left(30)
          tree(size * 0.7, depth - 1)
          right(60)
          tree(size * 0.7, depth - 1)
          left(30)
          backward(size)
        end
        tree(50, 2)
      `);
      expect(result.success).toBe(true);
      expect(runtime.getCommands().length).toBeGreaterThan(0);
    });

    it("supports repeat_n helper", async () => {
      const result = await runtime.execute(`
        repeat_n(3, function()
          forward(10)
        end)
      `);
      expect(result.success).toBe(true);
      expect(runtime.getCommands()).toHaveLength(3);
    });

    it("clears commands between executions", async () => {
      await runtime.execute("forward(10)");
      expect(runtime.getCommands()).toHaveLength(1);

      await runtime.execute("forward(20)");
      expect(runtime.getCommands()).toHaveLength(1);
      expect(runtime.getCommands()[0]).toEqual({
        type: "forward",
        distance: 20,
      });
    });

    it("uses math library for generative art", async () => {
      const result = await runtime.execute(`
        for i = 0, 359 do
          local rad = math.rad(i)
          local r = 100 * math.sin(3 * rad)
          forward(r / 10)
          right(1)
        end
      `);
      expect(result.success).toBe(true);
      expect(runtime.getCommands()).toHaveLength(720); // 360 forward + 360 right
    });
  });

  describe("turtle ID tagging", () => {
    it("does not add turtleId when active turtle is main (default)", async () => {
      await runtime.execute("forward(100)");
      const cmds = runtime.getCommands();
      expect(cmds).toHaveLength(1);
      expect(cmds[0]).toEqual({ type: "forward", distance: 100 });
      expect(cmds[0].turtleId).toBeUndefined();
    });

    it("tags commands with active turtle ID when set", async () => {
      runtime.setActiveTurtle("child1");
      await runtime.execute("forward(50)");
      const cmds = runtime.getCommands();
      expect(cmds).toHaveLength(1);
      expect(cmds[0]).toEqual({
        type: "forward",
        distance: 50,
        turtleId: "child1",
      });
    });

    it("tags all command types with active turtle ID", async () => {
      runtime.setActiveTurtle("t2");
      await runtime.execute(`
        forward(10)
        right(90)
        pencolor("#ff0000")
        penup()
        speed(3)
        print("hi")
      `);
      const cmds = runtime.getCommands();
      expect(cmds).toHaveLength(6);
      for (const cmd of cmds) {
        expect(cmd.turtleId).toBe("t2");
      }
    });

    it("preserves active turtle across executions until explicitly changed", async () => {
      runtime.setActiveTurtle("child1");
      await runtime.execute("forward(10)");
      expect(runtime.getCommands()[0].turtleId).toBe("child1");

      // Active turtle persists — caller (e.g. TurtleExecutor) resets it
      await runtime.execute("forward(20)");
      expect(runtime.getCommands()[0].turtleId).toBe("child1");

      // Explicitly reset to main
      runtime.setActiveTurtle("main");
      await runtime.execute("forward(30)");
      expect(runtime.getCommands()[0].turtleId).toBeUndefined();
    });

    it("getActiveTurtle returns current active turtle ID", () => {
      expect(runtime.getActiveTurtle()).toBe("main");
      runtime.setActiveTurtle("spawned1");
      expect(runtime.getActiveTurtle()).toBe("spawned1");
    });

    it("supports switching active turtle mid-collection", async () => {
      // Simulate what spawn() handle methods will do:
      // push some commands as main, then switch and push as child
      runtime.setActiveTurtle("main");
      await runtime.execute("forward(10)");
      const mainCmds = runtime.getCommands();

      runtime.setActiveTurtle("child");
      await runtime.execute("forward(20)");
      const childCmds = runtime.getCommands();

      expect(mainCmds[0].turtleId).toBeUndefined();
      expect(childCmds[0].turtleId).toBe("child");
    });
  });

  describe("spawn()", () => {
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

    let registry: TurtleRegistry;
    let doc: MockDocument;
    const scriptId = "test-script";

    beforeEach(() => {
      registry = new TurtleRegistry();
      doc = new MockDocument();
      // Create main turtle so spawn has a parent
      registry.createMain(scriptId, doc);
      runtime.setSpawnContext(registry, scriptId, doc);
    });

    it("spawns a turtle and returns a handle", async () => {
      const result = await runtime.execute(`
        local t = spawn("child1")
        assert(t ~= nil, "spawn should return a handle")
      `);
      expect(result.success).toBe(true);
    });

    it("pushes a spawn command with default options", async () => {
      await runtime.execute('spawn("t1")');
      const cmds = runtime.getCommands();
      expect(cmds).toHaveLength(1);
      expect(cmds[0].type).toBe("spawn");
      if (cmds[0].type === "spawn") {
        expect(cmds[0].id).toBe("t1");
      }
    });

    it("pushes a spawn command with position and heading options", async () => {
      await runtime.execute('spawn("t1", {x=100, y=200, heading=45})');
      const cmds = runtime.getCommands();
      expect(cmds).toHaveLength(1);
      if (cmds[0].type === "spawn") {
        expect(cmds[0].id).toBe("t1");
        expect(cmds[0].x).toBe(100);
        expect(cmds[0].y).toBe(200);
        expect(cmds[0].heading).toBe(45);
      }
    });

    it("pushes a spawn command with color and width options", async () => {
      await runtime.execute('spawn("t1", {color="#ff0000", width=5})');
      const cmds = runtime.getCommands();
      if (cmds[0].type === "spawn") {
        expect(cmds[0].color).toBe("#ff0000");
        expect(cmds[0].width).toBe(5);
      }
    });

    it("creates turtle in registry eagerly during collection", async () => {
      await runtime.execute('spawn("child1")');
      expect(registry.has(`${scriptId}:child1`)).toBe(true);
    });

    it("sets initial state from spawn options", async () => {
      await runtime.execute('spawn("t1", {x=50, y=-30, heading=90})');
      const entry = registry.get(`${scriptId}:t1`);
      expect(entry).toBeDefined();
      expect(entry!.state.x).toBe(50);
      expect(entry!.state.y).toBe(-30);
      expect(entry!.state.angle).toBe(90);
    });

    it("handle.forward pushes tagged command", async () => {
      await runtime.execute(`
        local t = spawn("child1")
        t.forward(100)
      `);
      const cmds = runtime.getCommands();
      expect(cmds).toHaveLength(2); // spawn + forward
      expect(cmds[1]).toEqual({
        type: "forward",
        distance: 100,
        turtleId: "child1",
      });
    });

    it("handle.backward pushes tagged command", async () => {
      await runtime.execute(`
        local t = spawn("child1")
        t.backward(50)
      `);
      const cmds = runtime.getCommands();
      expect(cmds[1]).toEqual({
        type: "backward",
        distance: 50,
        turtleId: "child1",
      });
    });

    it("handle.right and handle.left push tagged commands", async () => {
      await runtime.execute(`
        local t = spawn("t1")
        t.right(90)
        t.left(45)
      `);
      const cmds = runtime.getCommands();
      expect(cmds[1]).toEqual({ type: "right", angle: 90, turtleId: "t1" });
      expect(cmds[2]).toEqual({ type: "left", angle: 45, turtleId: "t1" });
    });

    it("handle pen methods push tagged commands", async () => {
      await runtime.execute(`
        local t = spawn("t1")
        t.penup()
        t.pendown()
        t.pencolor("#00ff00")
        t.penwidth(5)
        t.penopacity(0.5)
      `);
      const cmds = runtime.getCommands();
      expect(cmds[1]).toEqual({ type: "penup", turtleId: "t1" });
      expect(cmds[2]).toEqual({ type: "pendown", turtleId: "t1" });
      expect(cmds[3]).toEqual({ type: "pencolor", color: "#00ff00", turtleId: "t1" });
      expect(cmds[4]).toEqual({ type: "penwidth", width: 5, turtleId: "t1" });
      expect(cmds[5]).toEqual({ type: "penopacity", opacity: 0.5, turtleId: "t1" });
    });

    it("handle.pencolor with RGB values", async () => {
      await runtime.execute(`
        local t = spawn("t1")
        t.pencolor(255, 128, 0)
      `);
      const cmds = runtime.getCommands();
      expect(cmds[1]).toEqual({
        type: "pencolor",
        color: "#ff8000",
        turtleId: "t1",
      });
    });

    it("handle.goto_pos pushes tagged goto command", async () => {
      await runtime.execute(`
        local t = spawn("t1")
        t.goto_pos(100, 200)
      `);
      const cmds = runtime.getCommands();
      expect(cmds[1]).toEqual({ type: "goto", x: 100, y: 200, turtleId: "t1" });
    });

    it("handle.home pushes tagged home command", async () => {
      await runtime.execute(`
        local t = spawn("t1")
        t.home()
      `);
      const cmds = runtime.getCommands();
      expect(cmds[1]).toEqual({ type: "home", turtleId: "t1" });
    });

    it("handle.speed pushes tagged speed command", async () => {
      await runtime.execute(`
        local t = spawn("t1")
        t.speed(8)
      `);
      const cmds = runtime.getCommands();
      expect(cmds[1]).toEqual({ type: "speed", value: 8, turtleId: "t1" });
    });

    it("handle.clear pushes tagged clear command", async () => {
      await runtime.execute(`
        local t = spawn("t1")
        t.clear()
      `);
      const cmds = runtime.getCommands();
      expect(cmds[1]).toEqual({ type: "clear", turtleId: "t1" });
    });

    it("handle.sleep pushes tagged sleep command", async () => {
      await runtime.execute(`
        local t = spawn("t1")
        t.sleep(100)
      `);
      const cmds = runtime.getCommands();
      expect(cmds[1]).toEqual({ type: "sleep", ms: 100, turtleId: "t1" });
    });

    it("handle.print pushes tagged print command", async () => {
      await runtime.execute(`
        local t = spawn("t1")
        t.print("hello from child")
      `);
      const cmds = runtime.getCommands();
      expect(cmds[1]).toEqual({
        type: "print",
        message: "hello from child",
        turtleId: "t1",
      });
    });

    it("handle.position returns initial position", async () => {
      await runtime.execute(`
        local t = spawn("t1", {x=42, y=77})
        local x, y = t.position()
        print(x .. "," .. y)
      `);
      const cmds = runtime.getCommands();
      const printCmd = cmds.find(
        (c): c is TurtleCommand & { type: "print" } => c.type === "print" && !c.turtleId,
      );
      expect(printCmd!.message).toBe("42,77");
    });

    it("handle.heading returns initial heading", async () => {
      await runtime.execute(`
        local t = spawn("t1", {heading=90})
        print(t.heading())
      `);
      const cmds = runtime.getCommands();
      const printCmd = cmds.find(
        (c): c is TurtleCommand & { type: "print" } => c.type === "print" && !c.turtleId,
      );
      expect(printCmd!.message).toBe("90");
    });

    it("handle.isdown returns default true", async () => {
      await runtime.execute(`
        local t = spawn("t1")
        print(tostring(t.isdown()))
      `);
      const cmds = runtime.getCommands();
      const printCmd = cmds.find(
        (c): c is TurtleCommand & { type: "print" } => c.type === "print" && !c.turtleId,
      );
      expect(printCmd!.message).toBe("true");
    });

    it("multiple spawned turtles produce independently tagged commands", async () => {
      await runtime.execute(`
        local a = spawn("alpha")
        local b = spawn("beta")
        a.forward(10)
        b.forward(20)
        forward(30) -- main turtle
      `);
      const cmds = runtime.getCommands();
      // spawn alpha, spawn beta, a.forward, b.forward, main.forward
      expect(cmds).toHaveLength(5);
      expect(cmds[2]).toEqual({ type: "forward", distance: 10, turtleId: "alpha" });
      expect(cmds[3]).toEqual({ type: "forward", distance: 20, turtleId: "beta" });
      expect(cmds[4]).toEqual({ type: "forward", distance: 30 }); // main, no turtleId
    });

    it("errors on empty string ID", async () => {
      const result = await runtime.execute('spawn("")');
      expect(result.success).toBe(false);
      expect(result.error).toContain("non-empty string");
    });

    it("errors on non-string ID", async () => {
      const result = await runtime.execute("spawn(123)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("non-empty string");
    });

    it('errors on reserved "main" ID', async () => {
      const result = await runtime.execute('spawn("main")');
      expect(result.success).toBe(false);
      expect(result.error).toContain("reserved");
    });

    it("errors on duplicate turtle ID within same execution", async () => {
      const result = await runtime.execute(`
        spawn("dup")
        spawn("dup")
      `);
      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });

    it("enforces max turtle limit", async () => {
      registry.setMaxTurtles(3); // main + 2 spawned = 3 max
      const result = await runtime.execute(`
        spawn("t1")
        spawn("t2")
        spawn("t3") -- should fail: registry has main + t1 + t2 = 3
      `);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Maximum turtle limit");
    });

    it("errors when spawn context not set", async () => {
      const freshRuntime = new LuaRuntime();
      await freshRuntime.init();
      // Don't set spawn context
      const result = await freshRuntime.execute('spawn("t1")');
      expect(result.success).toBe(false);
      expect(result.error).toContain("Spawn context not set");
      freshRuntime.close();
    });

    it("handle.set_world_space pushes tagged command", async () => {
      await runtime.execute(`
        local t = spawn("t1")
        t.set_world_space(true)
      `);
      const cmds = runtime.getCommands();
      expect(cmds[1]).toEqual({
        type: "set_world_space",
        enabled: true,
        turtleId: "t1",
      });
    });

    it("shape methods validate arguments on spawn handles", async () => {
      // rectangle, ellipse require 2 numbers; polygon requires int>=3 + number; star requires 3 numbers
      for (const [method, errFragment] of [
        ["rectangle", "rectangle()"],
        ["ellipse", "ellipse()"],
        ["polygon", "polygon()"],
        ["star", "star()"],
      ] as const) {
        const freshRuntime = new LuaRuntime();
        await freshRuntime.init();
        freshRuntime.setSpawnContext(registry, scriptId, doc);
        const result = await freshRuntime.execute(`
          local t = spawn("val_${method}")
          t.${method}()
        `);
        expect(result.success).toBe(false);
        expect(result.error).toContain(errFragment);
        freshRuntime.close();
      }
    });

    it("fillcolor on spawn handle accepts nil without error", async () => {
      await runtime.execute(`
        local t = spawn("fc_nil")
        t.fillcolor(nil)
      `);
      const cmds = runtime.getCommands();
      const fc = cmds.find(c => c.type === "fillcolor");
      expect(fc).toBeDefined();
      expect((fc as any).color).toBeNull();
    });

    it("handle.hide pushes tagged hide command", async () => {
      await runtime.execute(`
        local t = spawn("t1")
        t.hide()
      `);
      const cmds = runtime.getCommands();
      expect(cmds[1]).toEqual({ type: "hide", turtleId: "t1" });
    });

    it("handle.show pushes tagged show command", async () => {
      await runtime.execute(`
        local t = spawn("t1")
        t.show()
      `);
      const cmds = runtime.getCommands();
      expect(cmds[1]).toEqual({ type: "show", turtleId: "t1" });
    });

    it("clears spawned tracking between executions", async () => {
      await runtime.execute('spawn("t1")');
      expect(runtime.getCommands()).toHaveLength(1);

      // Clear the turtle from registry so next spawn can succeed
      registry.clearScript(scriptId);
      registry.createMain(scriptId, doc);

      // Second execution should allow same ID
      const result = await runtime.execute('spawn("t1")');
      expect(result.success).toBe(true);
    });
  });

  describe("kill()", () => {
    let registry: TurtleRegistry;
    let doc: { strokes: Stroke[]; addStroke: (s: Stroke) => void; getStrokes: () => Stroke[]; removeStroke: (id: string) => boolean };
    const scriptId = "test-script";

    beforeEach(() => {
      registry = new TurtleRegistry();
      doc = {
        strokes: [],
        addStroke(s: Stroke) { this.strokes.push(s); },
        getStrokes() { return this.strokes; },
        removeStroke(id: string) {
          const idx = this.strokes.findIndex((s) => s.id === id);
          if (idx === -1) return false;
          this.strokes.splice(idx, 1);
          return true;
        },
      };
      registry.createMain(scriptId, doc);
      runtime.setSpawnContext(registry, scriptId, doc);
    });

    it("kills a spawned turtle and pushes kill command", async () => {
      await runtime.execute(`
        spawn("child1")
        kill("child1")
      `);
      const cmds = runtime.getCommands();
      expect(cmds).toHaveLength(2);
      expect(cmds[1]).toEqual({ type: "kill", id: "child1" });
      expect(registry.has(`${scriptId}:child1`)).toBe(false);
    });

    it("errors when killing main turtle", async () => {
      const result = await runtime.execute('kill("main")');
      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot kill the main turtle");
    });

    it("errors when killing non-existent turtle", async () => {
      const result = await runtime.execute('kill("nonexistent")');
      expect(result.success).toBe(false);
      expect(result.error).toContain("does not exist");
    });

    it("errors with empty string ID", async () => {
      const result = await runtime.execute('kill("")');
      expect(result.success).toBe(false);
      expect(result.error).toContain("non-empty string");
    });

    it("allows re-spawning a killed turtle", async () => {
      const result = await runtime.execute(`
        spawn("reborn")
        kill("reborn")
        spawn("reborn")
      `);
      expect(result.success).toBe(true);
      expect(registry.has(`${scriptId}:reborn`)).toBe(true);
    });
  });

  describe("killall()", () => {
    let registry: TurtleRegistry;
    let doc: { strokes: Stroke[]; addStroke: (s: Stroke) => void; getStrokes: () => Stroke[]; removeStroke: (id: string) => boolean };
    const scriptId = "test-script";

    beforeEach(() => {
      registry = new TurtleRegistry();
      doc = {
        strokes: [],
        addStroke(s: Stroke) { this.strokes.push(s); },
        getStrokes() { return this.strokes; },
        removeStroke(id: string) {
          const idx = this.strokes.findIndex((s) => s.id === id);
          if (idx === -1) return false;
          this.strokes.splice(idx, 1);
          return true;
        },
      };
      registry.createMain(scriptId, doc);
      runtime.setSpawnContext(registry, scriptId, doc);
    });

    it("removes all spawned turtles but keeps main", async () => {
      await runtime.execute(`
        spawn("a")
        spawn("b")
        spawn("c")
        killall()
      `);
      expect(registry.has(`${scriptId}:main`)).toBe(true);
      expect(registry.has(`${scriptId}:a`)).toBe(false);
      expect(registry.has(`${scriptId}:b`)).toBe(false);
      expect(registry.has(`${scriptId}:c`)).toBe(false);
    });

    it("pushes killall command", async () => {
      await runtime.execute(`
        spawn("x")
        killall()
      `);
      const cmds = runtime.getCommands();
      const killallCmd = cmds.find((c) => c.type === "killall");
      expect(killallCmd).toBeDefined();
    });

    it("allows spawning after killall", async () => {
      const result = await runtime.execute(`
        spawn("a")
        killall()
        spawn("a")
      `);
      expect(result.success).toBe(true);
      expect(registry.has(`${scriptId}:a`)).toBe(true);
    });
  });

  describe("list_turtles()", () => {
    let registry: TurtleRegistry;
    let doc: { strokes: Stroke[]; addStroke: (s: Stroke) => void; getStrokes: () => Stroke[]; removeStroke: (id: string) => boolean };
    const scriptId = "test-script";

    beforeEach(() => {
      registry = new TurtleRegistry();
      doc = {
        strokes: [],
        addStroke(s: Stroke) { this.strokes.push(s); },
        getStrokes() { return this.strokes; },
        removeStroke(id: string) {
          const idx = this.strokes.findIndex((s) => s.id === id);
          if (idx === -1) return false;
          this.strokes.splice(idx, 1);
          return true;
        },
      };
      registry.createMain(scriptId, doc);
      runtime.setSpawnContext(registry, scriptId, doc);
    });

    it("returns main turtle by default", async () => {
      await runtime.execute(`
        local turtles = list_turtles()
        print(#turtles)
      `);
      const cmds = runtime.getCommands();
      const printCmd = cmds.find(
        (c): c is TurtleCommand & { type: "print" } => c.type === "print",
      );
      expect(printCmd!.message).toBe("1");
    });

    it("includes spawned turtles", async () => {
      await runtime.execute(`
        spawn("alpha")
        spawn("beta")
        local turtles = list_turtles()
        print(#turtles)
      `);
      const cmds = runtime.getCommands();
      const printCmd = cmds.find(
        (c): c is TurtleCommand & { type: "print" } => c.type === "print" && !c.turtleId,
      );
      expect(printCmd!.message).toBe("3"); // main + alpha + beta
    });

    it("reflects kills in the list", async () => {
      await runtime.execute(`
        spawn("temp")
        kill("temp")
        local turtles = list_turtles()
        print(#turtles)
      `);
      const cmds = runtime.getCommands();
      const printCmd = cmds.find(
        (c): c is TurtleCommand & { type: "print" } => c.type === "print" && !c.turtleId,
      );
      expect(printCmd!.message).toBe("1"); // only main
    });
  });

  describe("set_spawn_limit() and set_spawn_depth()", () => {
    let registry: TurtleRegistry;
    let doc: { strokes: Stroke[]; addStroke: (s: Stroke) => void; getStrokes: () => Stroke[]; removeStroke: (id: string) => boolean };
    const scriptId = "test-script";

    beforeEach(() => {
      registry = new TurtleRegistry();
      doc = {
        strokes: [],
        addStroke(s: Stroke) { this.strokes.push(s); },
        getStrokes() { return this.strokes; },
        removeStroke(id: string) {
          const idx = this.strokes.findIndex((s) => s.id === id);
          if (idx === -1) return false;
          this.strokes.splice(idx, 1);
          return true;
        },
      };
      registry.createMain(scriptId, doc);
      runtime.setSpawnContext(registry, scriptId, doc);
    });

    it("set_spawn_limit configures max turtles", async () => {
      const result = await runtime.execute(`
        set_spawn_limit(2)
        spawn("only_one")
      `);
      expect(result.success).toBe(true);
      expect(registry.getMaxTurtles()).toBe(2);

      // Attempting to spawn beyond the limit
      const result2 = await runtime.execute(`
        spawn("overflow")
      `);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain("Maximum turtle limit");
    });

    it("set_spawn_depth configures max depth", async () => {
      await runtime.execute("set_spawn_depth(2)");
      expect(registry.getMaxDepth()).toBe(2);
    });

    it("set_spawn_limit errors on non-positive value", async () => {
      const result = await runtime.execute("set_spawn_limit(0)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("positive number");
    });

    it("set_spawn_depth errors on non-positive value", async () => {
      const result = await runtime.execute("set_spawn_depth(-1)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("positive number");
    });
  });

  describe("environment_turtles()", () => {
    let registry: TurtleRegistry;
    const scriptId = "test-script";
    const doc: DocumentModel = {
      addStroke() {},
      getStrokes() { return []; },
    };

    beforeEach(() => {
      registry = new TurtleRegistry();
      registry.createMain(scriptId, doc);
      runtime.setSpawnContext(registry, scriptId, doc);
    });

    it("returns the main turtle for a single script", async () => {
      const result = await runtime.execute(`
        local turtles = environment_turtles()
        _test_count = #turtles
        if turtles[1] then
          _test_id = turtles[1].id
          _test_owned = turtles[1].owned
          _test_visible = turtles[1].visible
        end
      `);
      expect(result.success).toBe(true);
      // Can't easily read Lua globals back, so use print commands to verify
    });

    it("returns all turtles including spawned ones", async () => {
      const result = await runtime.execute(`
        spawn("child1", {x = 10, y = 20})
        spawn("child2", {x = 30, y = 40, heading = 90})
        local turtles = environment_turtles()
        -- Should have main + child1 + child2 = 3 turtles
        print(#turtles)
      `);
      expect(result.success).toBe(true);
      const printCmd = runtime.getCommands().find(c => c.type === "print");
      expect(printCmd).toBeDefined();
      expect((printCmd as { type: "print"; message: string }).message).toBe("3");
    });

    it("returns correct position and heading", async () => {
      const result = await runtime.execute(`
        spawn("child1", {x = 100, y = 200, heading = 45})
        local turtles = environment_turtles()
        for _, t in ipairs(turtles) do
          if t.id == "child1" then
            print(t.x .. "," .. t.y .. "," .. t.heading)
          end
        end
      `);
      expect(result.success).toBe(true);
      const printCmd = runtime.getCommands().find(c => c.type === "print");
      expect((printCmd as { type: "print"; message: string }).message).toBe("100,200,45");
    });

    it("returns correct color", async () => {
      const result = await runtime.execute(`
        spawn("red_turtle", {color = "#ff0000"})
        local turtles = environment_turtles()
        for _, t in ipairs(turtles) do
          if t.id == "red_turtle" then
            print(t.color)
          end
        end
      `);
      expect(result.success).toBe(true);
      const printCmd = runtime.getCommands().find(c => c.type === "print");
      expect((printCmd as { type: "print"; message: string }).message).toBe("#ff0000");
    });

    it("marks own turtles as owned=true", async () => {
      const result = await runtime.execute(`
        spawn("mine")
        local turtles = environment_turtles()
        for _, t in ipairs(turtles) do
          if t.id == "mine" then
            print(tostring(t.owned))
          end
        end
      `);
      expect(result.success).toBe(true);
      const printCmd = runtime.getCommands().find(c => c.type === "print");
      expect((printCmd as { type: "print"; message: string }).message).toBe("true");
    });

    it("marks other scripts' turtles as owned=false", async () => {
      // Create a turtle from another script
      const otherScriptId = "other-script";
      registry.createMain(otherScriptId, doc);
      registry.spawn("alien", otherScriptId, doc);

      const result = await runtime.execute(`
        local turtles = environment_turtles()
        for _, t in ipairs(turtles) do
          if t.id == "alien" then
            print(tostring(t.owned))
          end
        end
      `);
      expect(result.success).toBe(true);
      const printCmd = runtime.getCommands().find(c => c.type === "print");
      expect((printCmd as { type: "print"; message: string }).message).toBe("false");
    });

    it("includes turtles from multiple scripts", async () => {
      // Add turtles from another script
      const otherScriptId = "other-script";
      registry.createMain(otherScriptId, doc);
      registry.spawn("other_child", otherScriptId, doc);

      const result = await runtime.execute(`
        spawn("my_child")
        local turtles = environment_turtles()
        -- test-script:main, test-script:my_child, other-script:main, other-script:other_child = 4
        print(#turtles)
      `);
      expect(result.success).toBe(true);
      const printCmd = runtime.getCommands().find(c => c.type === "print");
      expect((printCmd as { type: "print"; message: string }).message).toBe("4");
    });

    it("returns visible=true for visible turtles", async () => {
      const result = await runtime.execute(`
        spawn("vis")
        local turtles = environment_turtles()
        for _, t in ipairs(turtles) do
          if t.id == "vis" then
            print(tostring(t.visible))
          end
        end
      `);
      expect(result.success).toBe(true);
      const printCmd = runtime.getCommands().find(c => c.type === "print");
      expect((printCmd as { type: "print"; message: string }).message).toBe("true");
    });

    it("returns visible=false for hidden turtles from other scripts", async () => {
      const otherScriptId = "other-script";
      registry.createMain(otherScriptId, doc);
      // Manually set the turtle as hidden via state
      const otherMain = registry.get(`${otherScriptId}:main`)!;
      otherMain.state.visible = false;

      const result = await runtime.execute(`
        local turtles = environment_turtles()
        for _, t in ipairs(turtles) do
          if t.id == "main" and not t.owned then
            print(tostring(t.visible))
          end
        end
      `);
      expect(result.success).toBe(true);
      const printCmd = runtime.getCommands().find(c => c.type === "print");
      expect((printCmd as { type: "print"; message: string }).message).toBe("false");
    });

    it("returns empty array when no spawn context", async () => {
      const freshRuntime = new LuaRuntime();
      await freshRuntime.init();
      // No spawn context set
      const result = await freshRuntime.execute(`
        local turtles = environment_turtles()
        print(#turtles)
      `);
      expect(result.success).toBe(true);
      const printCmd = freshRuntime.getCommands().find(c => c.type === "print");
      expect((printCmd as { type: "print"; message: string }).message).toBe("0");
      freshRuntime.close();
    });
  });

  describe("cross-script ownership enforcement", () => {
    let registry: TurtleRegistry;
    const scriptId = "test-script";
    const otherScriptId = "other-script";
    const doc: DocumentModel = {
      addStroke() {},
      getStrokes() { return []; },
    };

    beforeEach(() => {
      registry = new TurtleRegistry();
      registry.createMain(scriptId, doc);
      registry.createMain(otherScriptId, doc);
      registry.spawn("other_child", otherScriptId, doc);
      runtime.setSpawnContext(registry, scriptId, doc);
    });

    it("cannot control unowned turtle via _tcmd", async () => {
      // Manually try to command a turtle ID that doesn't exist in this script
      const result = await runtime.execute(`
        _tcmd("nonexistent", "forward", 100)
      `);
      expect(result.success).toBe(false);
      expect(result.error).toContain("does not exist");
    });

    it("can control own spawned turtles", async () => {
      const result = await runtime.execute(`
        spawn("my_child")
        local h = spawn("my_child2")
        h.forward(50)
      `);
      expect(result.success).toBe(true);
      const fwdCmds = runtime.getCommands().filter(c => c.type === "forward");
      expect(fwdCmds.length).toBe(1);
      expect(fwdCmds[0].turtleId).toBe("my_child2");
    });

    it("cannot kill unowned turtle", async () => {
      const result = await runtime.execute(`
        kill("other_child")
      `);
      expect(result.success).toBe(false);
      expect(result.error).toContain("does not exist");
    });

    it("environment_turtles provides read-only observation", async () => {
      const result = await runtime.execute(`
        local turtles = environment_turtles()
        local found_unowned = false
        for _, t in ipairs(turtles) do
          if not t.owned then
            found_unowned = true
            -- Can read state
            print(t.x .. "," .. t.y)
          end
        end
        print(tostring(found_unowned))
      `);
      expect(result.success).toBe(true);
      const printCmds = runtime.getCommands().filter(c => c.type === "print") as Array<{ type: "print"; message: string }>;
      // Last print should be "true" — we found unowned turtles
      expect(printCmds[printCmds.length - 1].message).toBe("true");
    });
  });

  describe("global hide() and show()", () => {
    it("produces hide command for main turtle", async () => {
      await runtime.execute("hide()");
      expect(runtime.getCommands()).toEqual([{ type: "hide" }]);
    });

    it("produces show command for main turtle", async () => {
      await runtime.execute("show()");
      expect(runtime.getCommands()).toEqual([{ type: "show" }]);
    });

    it("tags hide/show with active turtle when set", async () => {
      runtime.setActiveTurtle("child1");
      await runtime.execute("hide()");
      expect(runtime.getCommands()[0]).toEqual({ type: "hide", turtleId: "child1" });
    });
  });

  describe("penmode()", () => {
    it("produces penmode draw command", async () => {
      await runtime.execute('penmode("draw")');
      expect(runtime.getCommands()).toEqual([
        { type: "penmode", mode: "draw", turtleOnly: false },
      ]);
    });

    it("produces penmode erase command", async () => {
      await runtime.execute('penmode("erase")');
      expect(runtime.getCommands()).toEqual([
        { type: "penmode", mode: "erase", turtleOnly: false },
      ]);
    });

    it("accepts turtle_only option when erasing", async () => {
      await runtime.execute('penmode("erase", {turtle_only=true})');
      expect(runtime.getCommands()).toEqual([
        { type: "penmode", mode: "erase", turtleOnly: true },
      ]);
    });

    it("ignores turtle_only when mode is draw", async () => {
      await runtime.execute('penmode("draw", {turtle_only=true})');
      expect(runtime.getCommands()).toEqual([
        { type: "penmode", mode: "draw", turtleOnly: false },
      ]);
    });

    it("defaults turtle_only to false when not provided", async () => {
      await runtime.execute('penmode("erase", {})');
      expect(runtime.getCommands()).toEqual([
        { type: "penmode", mode: "erase", turtleOnly: false },
      ]);
    });

    it("throws on invalid mode string", async () => {
      const result = await runtime.execute('penmode("fill")');
      expect(result.success).toBe(false);
      expect(result.error).toContain('"draw" or "erase"');
    });

    it("throws on non-string argument", async () => {
      const result = await runtime.execute("penmode(42)");
      expect(result.success).toBe(false);
      expect(result.error).toContain('"draw" or "erase"');
    });

    it("throws when called with no arguments", async () => {
      const result = await runtime.execute("penmode()");
      expect(result.success).toBe(false);
      expect(result.error).toContain('"draw" or "erase"');
    });
  });

  describe("penpreset()", () => {
    it("produces penpreset command with valid preset name", async () => {
      await runtime.execute('penpreset("pen")');
      expect(runtime.getCommands()).toEqual([
        { type: "penpreset", preset: "pen" },
      ]);
    });

    it("produces penpreset command for each valid preset", async () => {
      for (const name of ["pen", "pencil", "marker", "highlighter"]) {
        runtime.close();
        runtime = new LuaRuntime();
        await runtime.init();
        await runtime.execute(`penpreset("${name}")`);
        expect(runtime.getCommands()).toEqual([
          { type: "penpreset", preset: name },
        ]);
      }
    });

    it("produces penpreset null command when called with nil", async () => {
      await runtime.execute("penpreset(nil)");
      expect(runtime.getCommands()).toEqual([
        { type: "penpreset", preset: null },
      ]);
    });

    it("passes through invalid preset names (TurtleState handles validation)", async () => {
      await runtime.execute('penpreset("nonexistent")');
      expect(runtime.getCommands()).toEqual([
        { type: "penpreset", preset: "nonexistent" },
      ]);
    });

    it("throws on non-string non-nil argument", async () => {
      const result = await runtime.execute("penpreset(42)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("string name or nil");
    });
  });

  describe("penmode/penpreset on spawn handles", () => {
    let registry: TurtleRegistry;
    const mockDoc: DocumentModel = {
      strokes: [],
      addStroke: () => "test-id",
      removeStroke: () => true,
      getStroke: () => undefined,
    } as unknown as DocumentModel;

    beforeEach(() => {
      registry = new TurtleRegistry();
      runtime.setSpawnContext(registry, "test-script", mockDoc);
      // Eagerly create main turtle
      registry.spawn("main", "test-script", mockDoc);
    });

    it("spawn handle penmode produces tagged command", async () => {
      const result = await runtime.execute(`
        local t = spawn("child1")
        t.penmode("erase")
      `);
      expect(result.success).toBe(true);
      const cmds = runtime.getCommands();
      const penmodeCmd = cmds.find(c => c.type === "penmode");
      expect(penmodeCmd).toEqual({
        type: "penmode",
        mode: "erase",
        turtleOnly: false,
        turtleId: "child1",
      });
    });

    it("spawn handle penmode with turtle_only produces tagged command", async () => {
      const result = await runtime.execute(`
        local t = spawn("child1")
        t.penmode("erase", {turtle_only=true})
      `);
      expect(result.success).toBe(true);
      const cmds = runtime.getCommands();
      const penmodeCmd = cmds.find(c => c.type === "penmode");
      expect(penmodeCmd).toEqual({
        type: "penmode",
        mode: "erase",
        turtleOnly: true,
        turtleId: "child1",
      });
    });

    it("spawn handle penmode validates mode string", async () => {
      const result = await runtime.execute(`
        local t = spawn("child1")
        t.penmode("invalid")
      `);
      expect(result.success).toBe(false);
      expect(result.error).toContain('"draw" or "erase"');
    });

    it("spawn handle penpreset produces tagged command", async () => {
      const result = await runtime.execute(`
        local t = spawn("child1")
        t.penpreset("marker")
      `);
      expect(result.success).toBe(true);
      const cmds = runtime.getCommands();
      const presetCmd = cmds.find(c => c.type === "penpreset");
      expect(presetCmd).toEqual({
        type: "penpreset",
        preset: "marker",
        turtleId: "child1",
      });
    });

    it("spawn handle penpreset nil resets preset", async () => {
      const result = await runtime.execute(`
        local t = spawn("child1")
        t.penpreset(nil)
      `);
      expect(result.success).toBe(true);
      const cmds = runtime.getCommands();
      const presetCmd = cmds.find(c => c.type === "penpreset");
      expect(presetCmd).toEqual({
        type: "penpreset",
        preset: null,
        turtleId: "child1",
      });
    });
  });

  describe("fillcolor()", () => {
    it("produces fillcolor command with hex string", async () => {
      await runtime.execute('fillcolor("#ff0000")');
      expect(runtime.getCommands()).toEqual([
        { type: "fillcolor", color: "#ff0000" },
      ]);
    });

    it("produces fillcolor command with r, g, b numbers", async () => {
      await runtime.execute("fillcolor(255, 128, 0)");
      expect(runtime.getCommands()).toEqual([
        { type: "fillcolor", color: "#ff8000" },
      ]);
    });

    it("clamps r, g, b to 0-255", async () => {
      await runtime.execute("fillcolor(300, -10, 128)");
      expect(runtime.getCommands()).toEqual([
        { type: "fillcolor", color: "#ff0080" },
      ]);
    });

    it("produces fillcolor null when called with nil", async () => {
      await runtime.execute("fillcolor(nil)");
      expect(runtime.getCommands()).toEqual([
        { type: "fillcolor", color: null },
      ]);
    });

    it("throws on invalid argument type", async () => {
      const result = await runtime.execute("fillcolor(true)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("fillcolor()");
    });
  });

  describe("rectangle()", () => {
    it("produces rectangle command", async () => {
      await runtime.execute("rectangle(100, 50)");
      expect(runtime.getCommands()).toEqual([
        { type: "rectangle", width: 100, height: 50 },
      ]);
    });

    it("throws on non-number arguments", async () => {
      const result = await runtime.execute('rectangle("a", 50)');
      expect(result.success).toBe(false);
      expect(result.error).toContain("rectangle()");
    });

    it("throws on zero width", async () => {
      const result = await runtime.execute("rectangle(0, 50)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("positive");
    });

    it("throws on negative height", async () => {
      const result = await runtime.execute("rectangle(100, -1)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("positive");
    });
  });

  describe("ellipse()", () => {
    it("produces ellipse command", async () => {
      await runtime.execute("ellipse(80, 60)");
      expect(runtime.getCommands()).toEqual([
        { type: "ellipse", width: 80, height: 60 },
      ]);
    });

    it("throws on non-number arguments", async () => {
      const result = await runtime.execute("ellipse(nil, 60)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("ellipse()");
    });

    it("throws on zero dimensions", async () => {
      const result = await runtime.execute("ellipse(0, 60)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("positive");
    });
  });

  describe("polygon()", () => {
    it("produces polygon command", async () => {
      await runtime.execute("polygon(6, 50)");
      expect(runtime.getCommands()).toEqual([
        { type: "polygon", sides: 6, radius: 50 },
      ]);
    });

    it("throws on non-integer sides", async () => {
      const result = await runtime.execute("polygon(3.5, 50)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("integer");
    });

    it("throws on sides < 3", async () => {
      const result = await runtime.execute("polygon(2, 50)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("integer >= 3");
    });

    it("throws on zero radius", async () => {
      const result = await runtime.execute("polygon(6, 0)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("positive");
    });

    it("throws on non-number arguments", async () => {
      const result = await runtime.execute('polygon("six", 50)');
      expect(result.success).toBe(false);
      expect(result.error).toContain("polygon()");
    });
  });

  describe("star()", () => {
    it("produces star command", async () => {
      await runtime.execute("star(5, 50, 25)");
      expect(runtime.getCommands()).toEqual([
        { type: "star", points: 5, outerRadius: 50, innerRadius: 25 },
      ]);
    });

    it("throws on non-integer points", async () => {
      const result = await runtime.execute("star(3.5, 50, 25)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("integer");
    });

    it("throws on points < 2", async () => {
      const result = await runtime.execute("star(1, 50, 25)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("integer >= 2");
    });

    it("throws on zero outerRadius", async () => {
      const result = await runtime.execute("star(5, 0, 25)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("positive");
    });

    it("throws on negative innerRadius", async () => {
      const result = await runtime.execute("star(5, 50, -10)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("positive");
    });

    it("throws on non-number arguments", async () => {
      const result = await runtime.execute('star("five", 50, 25)');
      expect(result.success).toBe(false);
      expect(result.error).toContain("star()");
    });
  });

  describe("shape/fillcolor on spawn handles", () => {
    let registry: TurtleRegistry;
    const scriptId = "test-shapes";
    const doc: DocumentModel = {
      addStroke: () => {},
      getStrokes: () => [],
    };

    beforeEach(() => {
      registry = new TurtleRegistry();
      registry.spawn("main", scriptId, doc);
      runtime.setSpawnContext(registry, scriptId, doc);
    });

    it("spawn handle fillcolor produces tagged command", async () => {
      await runtime.execute(`
        local t = spawn("sh1")
        t.fillcolor("#00ff00")
      `);
      const cmds = runtime.getCommands();
      const fc = cmds.find(c => c.type === "fillcolor");
      expect(fc).toEqual({
        type: "fillcolor",
        color: "#00ff00",
        turtleId: "sh1",
      });
    });

    it("spawn handle fillcolor nil clears fill", async () => {
      await runtime.execute(`
        local t = spawn("sh2")
        t.fillcolor(nil)
      `);
      const cmds = runtime.getCommands();
      const fc = cmds.find(c => c.type === "fillcolor");
      expect(fc).toEqual({
        type: "fillcolor",
        color: null,
        turtleId: "sh2",
      });
    });

    it("spawn handle rectangle produces tagged command", async () => {
      await runtime.execute(`
        local t = spawn("sh3")
        t.rectangle(100, 50)
      `);
      const cmds = runtime.getCommands();
      const rect = cmds.find(c => c.type === "rectangle");
      expect(rect).toEqual({
        type: "rectangle",
        width: 100,
        height: 50,
        turtleId: "sh3",
      });
    });

    it("spawn handle ellipse produces tagged command", async () => {
      await runtime.execute(`
        local t = spawn("sh4")
        t.ellipse(80, 60)
      `);
      const cmds = runtime.getCommands();
      const ell = cmds.find(c => c.type === "ellipse");
      expect(ell).toEqual({
        type: "ellipse",
        width: 80,
        height: 60,
        turtleId: "sh4",
      });
    });

    it("spawn handle polygon produces tagged command", async () => {
      await runtime.execute(`
        local t = spawn("sh5")
        t.polygon(6, 50)
      `);
      const cmds = runtime.getCommands();
      const poly = cmds.find(c => c.type === "polygon");
      expect(poly).toEqual({
        type: "polygon",
        sides: 6,
        radius: 50,
        turtleId: "sh5",
      });
    });

    it("spawn handle star produces tagged command", async () => {
      await runtime.execute(`
        local t = spawn("sh6")
        t.star(5, 50, 25)
      `);
      const cmds = runtime.getCommands();
      const s = cmds.find(c => c.type === "star");
      expect(s).toEqual({
        type: "star",
        points: 5,
        outerRadius: 50,
        innerRadius: 25,
        turtleId: "sh6",
      });
    });

    it("spawn handle rectangle validates arguments", async () => {
      const result = await runtime.execute(`
        local t = spawn("sh7")
        t.rectangle(0, 50)
      `);
      expect(result.success).toBe(false);
      expect(result.error).toContain("positive");
    });

    it("spawn handle polygon validates sides", async () => {
      const result = await runtime.execute(`
        local t = spawn("sh8")
        t.polygon(2, 50)
      `);
      expect(result.success).toBe(false);
      expect(result.error).toContain("integer >= 3");
    });

    it("spawn handle star validates points", async () => {
      const result = await runtime.execute(`
        local t = spawn("sh9")
        t.star(1, 50, 25)
      `);
      expect(result.success).toBe(false);
      expect(result.error).toContain("integer >= 2");
    });
  });
});
