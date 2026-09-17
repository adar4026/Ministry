// TASK_065 — native counterpart of HeroCanvas.web.tsx. The project ships
// web/PWA only (docs/STATUS.md); on native there is no <canvas>, so the hero
// simply keeps HeroScene's SVG fallback. Metro picks the .web.tsx variant on
// web and this file everywhere else.
export function HeroCanvas() {
  return null;
}
