import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LuaRuntime, TurtleCommand } from "../LuaRuntime";

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
});
