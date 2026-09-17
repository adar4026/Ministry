// TASK_066 — `prefers-reduced-motion` for JS-driven Animated transitions
// (the Home drawer). Web-only signal; native and test environments report
// false. The Home hero's WebGL layer keeps its own identical check inside
// HeroCanvas.web.tsx because that module is web-only by file extension and
// cannot be imported from cross-platform code.
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
