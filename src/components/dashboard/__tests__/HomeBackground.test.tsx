// Regression test for TASK_053 (Home-only mint gradient background).
//
// <HomeBackground> is shared by five screens (Home, Hours, Timeline,
// Profile, /upcoming-events) via a single component. TASK_053 gave it
// optional colors/stops props so ONLY the Home screen (app/(tabs)/index.tsx)
// can render the owner's mint spec (#DCEFE9 0% / #EDF6F3 42% / #F7FAF9 100%)
// without touching the other four call sites, which keep rendering with no
// props and must keep getting the original HOME_GRADIENT at [0, 0.55, 1].
// This test locks both the default (unaffected screens) and the override
// (Home) behavior so a future edit can't collapse them into one gradient —
// e.g. by editing HOME_GRADIENT in place, which would also turn the tab bar
// area's Hours/Timeline/Profile background mint.
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Stop } from "react-native-svg";
import { HomeBackground } from "@/components/dashboard/HomeBackground";
import { DS, HOME_GRADIENT, HOME_MINT_GRADIENT, HOME_MINT_GRADIENT_STOPS } from "@/components/dashboard/tokens";

function stopsOf(renderer: ReactTestRenderer) {
  return renderer.root.findAllByType(Stop).map((s) => ({ offset: s.props.offset, color: s.props.stopColor }));
}

describe("HomeBackground (TASK_053)", () => {
  it("defaults to the shared HOME_GRADIENT at [0, 0.55, 1] when no props are passed (Hours/Timeline/Profile/upcoming-events)", () => {
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(<HomeBackground />);
    });
    expect(stopsOf(renderer!)).toEqual([
      { offset: 0, color: HOME_GRADIENT[0] },
      { offset: 0.55, color: HOME_GRADIENT[1] },
      { offset: 1, color: HOME_GRADIENT[2] },
    ]);
  });

  it("renders the owner's exact mint spec when Home passes HOME_MINT_GRADIENT/HOME_MINT_GRADIENT_STOPS", () => {
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(<HomeBackground colors={HOME_MINT_GRADIENT} stops={HOME_MINT_GRADIENT_STOPS} />);
    });
    expect(stopsOf(renderer!)).toEqual([
      { offset: 0, color: "#DCEFE9" },
      { offset: 0.42, color: "#EDF6F3" },
      { offset: 1, color: "#F7FAF9" },
    ]);
  });

  it("HOME_MINT_GRADIENT's final stop matches DS.homeMintBase, so the flat area below the gradient blends in", () => {
    expect(DS.homeMintBase).toBe(HOME_MINT_GRADIENT[2]);
  });

  it("HOME_GRADIENT (shared) and HOME_MINT_GRADIENT (Home-only) stay distinct constants", () => {
    expect(HOME_MINT_GRADIENT).not.toEqual(HOME_GRADIENT);
    expect(DS.homeMintBase).not.toBe(DS.homeBase);
  });
});
