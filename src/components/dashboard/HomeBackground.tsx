import { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { HOME_GRADIENT } from "./tokens";

// Home-only decorative background (TASK_010): a soft vertical gradient
// (muted sage -> near-white) sitting behind the header and the monthly
// progress card. Fixed height by design — it fades into the flat near-white
// base color before the lower (unchanged) sections, so it never reads as a
// short strip behind a single component, and the rest of the scrollable
// content stays flat. Presentational only, no data/props.
const GRADIENT_HEIGHT = 360;
const DEFAULT_STOPS = [0, 0.55, 1] as const;

type HomeBackgroundProps = {
  // TASK_053 — optional overrides so the Home screen can render its own
  // mint gradient (HOME_MINT_GRADIENT/HOME_MINT_GRADIENT_STOPS in tokens.ts)
  // while Hours/Timeline/Profile/upcoming-events keep getting the original
  // HOME_GRADIENT/DEFAULT_STOPS below unchanged.
  colors?: readonly [string, string, string];
  stops?: readonly [number, number, number];
};

export function HomeBackground({ colors = HOME_GRADIENT, stops = DEFAULT_STOPS }: HomeBackgroundProps = {}) {
  // TASK_019: the root Stack keeps the previous screen mounted underneath
  // the new /upcoming-events screen, so two <HomeBackground> instances can
  // exist in the DOM at once. On web, SVG gradient ids are global — a
  // hardcoded id would collide between instances and one of them would
  // silently lose its fill. useId() keeps each instance's id unique.
  const gradientId = `homeBg-${useId()}`;
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg width="100%" height={GRADIENT_HEIGHT} style={styles.svg}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={stops[0]} stopColor={colors[0]} />
            <Stop offset={stops[1]} stopColor={colors[1]} />
            <Stop offset={stops[2]} stopColor={colors[2]} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={GRADIENT_HEIGHT} fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 0, left: 0, right: 0, height: GRADIENT_HEIGHT },
  svg: { position: "absolute", top: 0, left: 0 },
});
