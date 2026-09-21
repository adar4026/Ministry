import { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { HeroCanvas } from "./HeroCanvas";
import { MINISTRY } from "./tokens";
import { useThemedStyles } from "@/theme";

// TASK_065 — the Home hero's background layer. Sits absolutely at the top
// of the screen, clipped to its own height, never receives pointer events;
// the hero CONTENT (HomeHero) is laid out over it by the screen.
//
// Two stacked layers:
//   1. SVG fallback — a vertical mint → page-ground gradient plus three soft
//      radial blobs in the same palette. This is what every platform shows
//      until (and unless) the WebGL layer takes over: native, no WebGL,
//      shader failure, low-end device, prefers-reduced-motion, lost context.
//      It is deliberately static: the reference apps also fall back to a
//      still multi-gradient under reduced motion.
//   2. HeroCanvas (web only) — the animated silk waves, fading in on top.
//
// Both dissolve into MINISTRY.bg toward the bottom edge, and the screen's own
// background is MINISTRY.bg, so there is no line where the hero "ends".

/** Height of the hero scene below the top safe-area inset. */
export const HERO_HEIGHT = 300;

// `animated` (TASK_066): the Home drawer reuses this scene as its panel
// background in a STATIC mode — the same SVG gradient and folds, but no
// HeroCanvas, so opening the menu never spins up a second WebGL context
// next to the one already running under the Home hero.
export function HeroScene({ height, animated = true }: { height: number; animated?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const id = useId();
  const gradId = `heroGrad-${id}`;
  const blobA = `heroBlobA-${id}`;
  const blobB = `heroBlobB-${id}`;
  const blobC = `heroBlobC-${id}`;

  return (
    <View style={[styles.wrap, { height }]} testID="hero-scene">
      <Svg width="100%" height={height} style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0} stopColor={MINISTRY.heroTop} />
            <Stop offset={0.58} stopColor={MINISTRY.heroTop} />
            <Stop offset={1} stopColor={MINISTRY.bg} />
          </LinearGradient>
          <RadialGradient id={blobA} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={MINISTRY.heroA} stopOpacity={0.42} />
            <Stop offset={1} stopColor={MINISTRY.heroA} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={blobB} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={MINISTRY.heroB} stopOpacity={0.7} />
            <Stop offset={1} stopColor={MINISTRY.heroB} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={blobC} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={MINISTRY.heroC} stopOpacity={0.9} />
            <Stop offset={1} stopColor={MINISTRY.heroC} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${gradId})`} />
        {/* Deep emerald fold, upper-left; a wide aqua band on the right;
            a pale mint highlight through the centre. Ellipses are wider
            than tall so they read as folds, not as circles. */}
        <Ellipse cx="18" cy="22" rx="62" ry="30" fill={`url(#${blobA})`} />
        <Ellipse cx="88" cy="48" rx="58" ry="26" fill={`url(#${blobB})`} />
        <Ellipse cx="52" cy="34" rx="46" ry="16" fill={`url(#${blobC})`} />
      </Svg>
      {animated ? <HeroCanvas /> : null}
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    backgroundColor: MINISTRY.heroTop,
    // style, not the deprecated prop (RNW 0.21): the scene is decoration and
    // must never intercept a tap meant for the content above it.
    pointerEvents: "none",
  },
});
