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

export function HomeBackground() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg width="100%" height={GRADIENT_HEIGHT} style={styles.svg}>
        <Defs>
          <LinearGradient id="homeBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={HOME_GRADIENT[0]} />
            <Stop offset="0.55" stopColor={HOME_GRADIENT[1]} />
            <Stop offset="1" stopColor={HOME_GRADIENT[2]} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={GRADIENT_HEIGHT} fill="url(#homeBg)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 0, left: 0, right: 0, height: GRADIENT_HEIGHT },
  svg: { position: "absolute", top: 0, left: 0 },
});
