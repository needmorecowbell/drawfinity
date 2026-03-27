import { describe, it, expect } from "vitest";
import { luaBlockDepth } from "../turtle-editor";

describe("luaBlockDepth", () => {
  describe("complete statements (depth 0)", () => {
    it("simple expression", () => {
      expect(luaBlockDepth("1 + 1")).toBe(0);
    });

    it("variable assignment", () => {
      expect(luaBlockDepth("x = 42")).toBe(0);
    });

    it("function call", () => {
      expect(luaBlockDepth("forward(100)")).toBe(0);
    });

    it("complete if block", () => {
      expect(luaBlockDepth("if true then print(1) end")).toBe(0);
    });

    it("complete for loop", () => {
      expect(luaBlockDepth("for i=1,10 do forward(i) end")).toBe(0);
    });

    it("complete while loop", () => {
      expect(luaBlockDepth("while true do break end")).toBe(0);
    });

    it("complete function definition", () => {
      expect(luaBlockDepth("function foo() return 1 end")).toBe(0);
    });

    it("complete repeat-until", () => {
      expect(luaBlockDepth("repeat x = x + 1 until x > 10")).toBe(0);
    });

    it("complete do block (standalone do not tracked — rare in REPL)", () => {
      // Standalone `do...end` is not counted; this is an acceptable tradeoff
      expect(luaBlockDepth("do local x = 1 end")).toBe(0);
    });

    it("nested complete blocks", () => {
      expect(luaBlockDepth("for i=1,10 do if i > 5 then print(i) end end")).toBe(0);
    });

    it("multiline complete block", () => {
      const code = `for i = 1, 4 do
  forward(100)
  right(90)
end`;
      expect(luaBlockDepth(code)).toBe(0);
    });
  });

  describe("incomplete blocks (depth > 0)", () => {
    it("if without end", () => {
      expect(luaBlockDepth("if true then")).toBeGreaterThan(0);
    });

    it("for without end", () => {
      expect(luaBlockDepth("for i=1,10 do")).toBeGreaterThan(0);
    });

    it("while without end", () => {
      expect(luaBlockDepth("while true do")).toBeGreaterThan(0);
    });

    it("function without end", () => {
      expect(luaBlockDepth("function foo()")).toBeGreaterThan(0);
    });

    it("repeat without until", () => {
      expect(luaBlockDepth("repeat")).toBeGreaterThan(0);
    });

    it("nested incomplete — outer open", () => {
      expect(luaBlockDepth("for i=1,10 do\n  if i > 5 then\n    print(i)\n  end")).toBeGreaterThan(0);
    });

    it("partially typed multiline", () => {
      const code = `for i = 1, 4 do
  forward(100)`;
      expect(luaBlockDepth(code)).toBeGreaterThan(0);
    });
  });

  describe("ignores keywords in strings and comments", () => {
    it("keyword in double-quoted string", () => {
      expect(luaBlockDepth('x = "if then end"')).toBe(0);
    });

    it("keyword in single-quoted string", () => {
      expect(luaBlockDepth("x = 'for do end'")).toBe(0);
    });

    it("keyword in line comment", () => {
      expect(luaBlockDepth("x = 1 -- if then")).toBe(0);
    });

    it("keyword in block comment", () => {
      expect(luaBlockDepth("x = 1 --[[ function end ]]")).toBe(0);
    });

    it("keyword in long string", () => {
      expect(luaBlockDepth("x = [[ for while do end ]]")).toBe(0);
    });

    it("keyword in level-1 long string", () => {
      expect(luaBlockDepth("x = [=[ if then end ]=]")).toBe(0);
    });

    it("keyword in level-2 long string", () => {
      expect(luaBlockDepth("x = [==[ function while for end ]==]")).toBe(0);
    });

    it("keyword in level-1 block comment", () => {
      expect(luaBlockDepth("x = 1 --[=[ if for while end ]=]")).toBe(0);
    });

    it("real block with comment containing keyword", () => {
      const code = `for i=1,10 do -- this loop does stuff
  forward(i)
end`;
      expect(luaBlockDepth(code)).toBe(0);
    });

    it("incomplete block not fooled by string end", () => {
      expect(luaBlockDepth('if true then\n  x = "end"')).toBeGreaterThan(0);
    });
  });
});
