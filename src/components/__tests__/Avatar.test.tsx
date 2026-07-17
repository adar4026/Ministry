// TASK_009: Avatar's default initials fallback must be neutral, not the
// repository owner's personal initials. These tests pin that behavior down
// and confirm caller-provided initials still take priority over the default.
import { act, create } from "react-test-renderer";
import { Avatar } from "@/components/Avatar";

function renderedText(tree: ReturnType<typeof create>): string[] {
  const out: string[] = [];
  (function walk(node: unknown) {
    if (node == null) return;
    if (typeof node === "string") {
      out.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node === "object" && "children" in (node as Record<string, unknown>)) {
      walk((node as { children: unknown }).children);
    }
  })(tree.toJSON());
  return out;
}

describe("Avatar", () => {
  it("falls back to a neutral, non-personal initials default", () => {
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(<Avatar />);
    });
    expect(renderedText(tree)).toEqual(["M"]);
  });

  it("uses caller-provided initials instead of the default", () => {
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(<Avatar initials="XY" />);
    });
    expect(renderedText(tree)).toEqual(["XY"]);
  });
});
