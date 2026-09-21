// TASK_077 — the drawer panel's light, reproduced from Lex Finance's drawer
// (index.html `.drawer` / `.drawer::before` / `.drawer::after`, light theme)
// at the owner's request. Same layers, same geometry, same alphas:
//
//   background:
//     radial-gradient(120% 50% at 50% 10%,  --hero-glow 0%, transparent 60%)   white glow
//     radial-gradient( 90% 40% at 100% 62%, --hero-b2   0%, transparent 60%)   cyan
//     radial-gradient( 80% 36% at 0% 92%,   --hero-b3   0%, transparent 60%)   turquoise
//     linear-gradient(180deg, --hero-top 0%, --hero-bottom 58%, --hero-bottom 100%)
//   ::before  circle min(130vw,460px)  left −40%  top −24%  --hero-b1 → transparent 64%
//             drift 22s ease-in-out alternate
//   ::after   circle min(110vw,400px)  right −46% top 6%    --hero-b4 → transparent 64%
//             drift 27s ease-in-out alternate-reverse
//   @keyframes drift: translate3d(0,0,0) scale(1) → translate3d(34px,28px,0) scale(1.08)
//   prefers-reduced-motion → no drift
//
// "vw" in Finance is the viewport; the drawer here knows its own panel
// width and height, so the percentages resolve against those. SVG only —
// no HeroCanvas, no second WebGL context — and, like HeroScene, an absolute
// decoration that never takes a tap. The blobs are two Animated.Views so
// the drift runs on the transform, exactly like the CSS keyframes.
import { useEffect, useId, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { DRAWER_ICE } from "@/components/dashboard/tokens";
import { prefersReducedMotion } from "@/utils/motion";
import { useThemedStyles } from "@/theme";

const NATIVE_DRIVER = Platform.OS !== "web";

// Finance's drift keyframe end state and the two blobs' periods.
export const DRIFT_X = 34;
export const DRIFT_Y = 28;
export const DRIFT_SCALE = 1.08;
export const DRIFT_SKY_MS = 22_000;
export const DRIFT_BLUE_MS = 27_000;

/** `::before` — sky-blue blob: min(130 vw, 460) px, left −40 %, top −24 %. */
export function skyBlobGeometry(width: number, height: number) {
  const d = Math.min(1.3 * width, 460);
  return { size: d, left: -0.4 * width, top: -0.24 * height };
}
/** `::after` — medium-blue blob: min(110 vw, 400) px, right −46 %, top 6 %. */
export function blueBlobGeometry(width: number, height: number) {
  const d = Math.min(1.1 * width, 400);
  return { size: d, left: width - d + 0.46 * width, top: 0.06 * height };
}

function Blob({
  id,
  color,
  alpha,
  size,
  left,
  top,
  progress,
  testID,
}: {
  id: string;
  color: string;
  alpha: number;
  size: number;
  left: number;
  top: number;
  progress: Animated.Value;
  testID: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, DRIFT_X] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, DRIFT_Y] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, DRIFT_SCALE] });
  return (
    <Animated.View
      style={[styles.blob, { width: size, height: size, left, top, transform: [{ translateX }, { translateY }, { scale }] }]}
      testID={testID}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={color} stopOpacity={alpha} />
            <Stop offset={0.64} stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

export function DrawerScene({ width, height }: { width: number; height: number }) {
  const styles = useThemedStyles(makeStyles);
  const id = useId();
  const gradId = `drawerGrad-${id}`;
  const glowId = `drawerGlow-${id}`;
  const cyanId = `drawerCyan-${id}`;
  const turqId = `drawerTurq-${id}`;
  const skyId = `drawerSky-${id}`;
  const blueId = `drawerBlue-${id}`;

  // `alternate` = 0 → 1 → 0 …; `alternate-reverse` starts from the end.
  const sky = useRef(new Animated.Value(0)).current;
  const blue = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const drift = (value: Animated.Value, from: number, ms: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1 - from, duration: ms, easing: Easing.inOut(Easing.ease), useNativeDriver: NATIVE_DRIVER }),
          Animated.timing(value, { toValue: from, duration: ms, easing: Easing.inOut(Easing.ease), useNativeDriver: NATIVE_DRIVER }),
        ]),
      );
    const a = drift(sky, 0, DRIFT_SKY_MS);
    const b = drift(blue, 1, DRIFT_BLUE_MS);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [sky, blue]);

  const skyGeo = skyBlobGeometry(width, height);
  const blueGeo = blueBlobGeometry(width, height);

  return (
    <View style={[styles.wrap, { width, height }]} testID="drawer-scene">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0} stopColor={DRAWER_ICE.top} />
            <Stop offset={0.58} stopColor={DRAWER_ICE.bottom} />
            <Stop offset={1} stopColor={DRAWER_ICE.bottom} />
          </LinearGradient>
          <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={DRAWER_ICE.glow.color} stopOpacity={DRAWER_ICE.glow.alpha} />
            <Stop offset={0.6} stopColor={DRAWER_ICE.glow.color} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={cyanId} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={DRAWER_ICE.poolCyan.color} stopOpacity={DRAWER_ICE.poolCyan.alpha} />
            <Stop offset={0.6} stopColor={DRAWER_ICE.poolCyan.color} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={turqId} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={DRAWER_ICE.poolTurquoise.color} stopOpacity={DRAWER_ICE.poolTurquoise.alpha} />
            <Stop offset={0.6} stopColor={DRAWER_ICE.poolTurquoise.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* CSS paints the LAST background layer first: gradient, then
            turquoise, cyan, and the white glow on top. */}
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${gradId})`} />
        <Ellipse cx="0" cy="92" rx="80" ry="36" fill={`url(#${turqId})`} />
        <Ellipse cx="100" cy="62" rx="90" ry="40" fill={`url(#${cyanId})`} />
        <Ellipse cx="50" cy="10" rx="120" ry="50" fill={`url(#${glowId})`} />
      </Svg>
      <Blob id={skyId} {...DRAWER_ICE.blobSky} {...skyGeo} progress={sky} testID="drawer-blob-sky" />
      <Blob id={blueId} {...DRAWER_ICE.blobBlue} {...blueGeo} progress={blue} testID="drawer-blob-blue" />
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    overflow: "hidden",
    backgroundColor: DRAWER_ICE.bottom,
    pointerEvents: "none",
  },
  blob: { position: "absolute" },
});
