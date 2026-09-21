// TASK_078 — the scheme registry and the two primitives token clusters and
// style sheets are built on.
import { getScheme, live, resolveScheme, setScheme } from "../scheme";

afterEach(() => setScheme("light"));

describe("resolveScheme", () => {
  it("explicit light/dark win; system follows the device, unknown device = light", () => {
    expect(resolveScheme("light", "dark")).toBe("light");
    expect(resolveScheme("dark", "light")).toBe("dark");
    expect(resolveScheme("system", "dark")).toBe("dark");
    expect(resolveScheme("system", "light")).toBe("light");
    expect(resolveScheme("system", null)).toBe("light");
    expect(resolveScheme("system", undefined)).toBe("light");
  });
});

describe("live()", () => {
  it("reads the active scheme's value on every access, and enumerates like a plain object", () => {
    const T = live({ a: "#111", b: 1 }, { a: "#eee", b: 2 });
    expect(getScheme()).toBe("light");
    expect(T.a).toBe("#111");
    expect(Object.keys(T)).toEqual(["a", "b"]);
    expect({ ...T }).toEqual({ a: "#111", b: 1 });
    setScheme("dark");
    expect(T.a).toBe("#eee");
    expect(T.b).toBe(2);
    expect(Object.entries(T)).toEqual([["a", "#eee"], ["b", 2]]);
  });

  it("refuses a dark set whose keys do not match the light set — no token can be forgotten silently", () => {
    expect(() => live({ a: 1, b: 2 } as Record<string, number>, { a: 1 } as Record<string, number>)).toThrow(/missing \[b\]/);
    expect(() => live({ a: 1 } as Record<string, number>, { a: 1, c: 3 } as Record<string, number>)).toThrow(/extra \[c\]/);
  });
});
