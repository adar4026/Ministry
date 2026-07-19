// TASK_030 follow-up §12/§15.6: +html.tsx is a plain Node-side React
// component (Expo's static-render root document, never mounted in a real
// browser DOM) — it can be rendered directly with react-test-renderer to
// assert the viewport meta and the supplemental no-horizontal-scroll style,
// without needing an actual DOM/CSS engine. The visual/behavioral half
// (pinch-zoom actually disabled, no horizontal drag) is a manual production
// check per the spec — this only guards the static markup.
import { act, create } from "react-test-renderer";
import Root from "../+html";

function findAll(root: ReturnType<typeof create>["root"], type: string) {
  return root.findAll((n) => n.type === type);
}

describe("+html.tsx root document", () => {
  it("has exactly one viewport meta tag, with pinch-zoom disabled", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<Root>{null}</Root>);
    });
    const viewportMetas = findAll(renderer.root, "meta").filter(
      (n) => n.props.name === "viewport",
    );
    expect(viewportMetas).toHaveLength(1);
    const content = viewportMetas[0].props.content as string;
    expect(content).toContain("maximum-scale=1");
    expect(content).toContain("user-scalable=no");
    expect(content).toContain("width=device-width");
  });

  it("includes a supplemental style blocking horizontal overflow, without removing expo-router's own reset", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<Root>{null}</Root>);
    });
    const styles = findAll(renderer.root, "style");
    const ids = styles.map((n) => n.props.id);
    expect(ids).toContain("expo-reset");
    expect(ids).toContain("ministry-no-horizontal-scroll");
    const noScroll = styles.find((n) => n.props.id === "ministry-no-horizontal-scroll");
    const css = noScroll?.props.dangerouslySetInnerHTML?.__html as string;
    expect(css).toContain("overflow-x:hidden");
    expect(css).toContain("overscroll-behavior-x:none");
  });
});
