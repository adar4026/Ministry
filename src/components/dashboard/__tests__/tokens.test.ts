// TASK_065 — the Ministry palette must be its OWN identity: green-side teal,
// measurably apart from Alex Finance (violet) and Lexcar (cyan / ice-blue),
// and readable as text on the hero. These guards keep a future "just tweak
// the hex" from quietly drifting into either sibling's brand band.
import { DRAWER_ICE, DS, MINISTRY, ministryCssVars } from "../tokens";

function hex(s: string): [number, number, number] {
  const h = s.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}
function hue(s: string): number {
  const [r, g, b] = hex(s);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return h;
}
function luminance(s: string): number {
  const ch = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = hex(s);
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}
function contrast(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function blend(a: string, b: string, t: number): string {
  const A = hex(a), B = hex(b);
  return "#" + A.map((v, i) => Math.round((v * (1 - t) + B[i] * t) * 255).toString(16).padStart(2, "0")).join("");
}

// The sibling apps' real accent/hero tokens, copied from their sources at
// the time of TASK_065 (Finance index.html :root; Lexcar HeroCanvas.js +
// index.css). Not imported — those repos are not dependencies.
const FINANCE = ["#6d5df6", "#8b7cf8", "#c9bff9", "#b5abf9", "#e9e3ff", "#4a3ac0"];
const LEXCAR = ["#0e7c86", "#0d949f", "#78c4f0", "#d9ecf4", "#eaf4f7", "#0f5f78", "#f0fafc"];

const CHROMATIC = [MINISTRY.primary, MINISTRY.accent, MINISTRY.heroA, MINISTRY.heroB, MINISTRY.heroDeep, MINISTRY.heroTop];

describe("MINISTRY palette — its own green-teal band", () => {
  it("every chromatic token sits on the green side of teal (150°–172°)", () => {
    for (const c of CHROMATIC) {
      const h = hue(c);
      expect(h).toBeGreaterThanOrEqual(150);
      expect(h).toBeLessThanOrEqual(172);
    }
  });

  it("is at least 12° greener than every Lexcar token and nowhere near Finance's violet", () => {
    const lexcarMinHue = Math.min(...LEXCAR.map(hue)); // 185° (accent / c1)
    for (const c of CHROMATIC) expect(lexcarMinHue - hue(c)).toBeGreaterThanOrEqual(12);
    for (const c of CHROMATIC) expect(Math.abs(hue(c) - 248)).toBeGreaterThan(60);
  });

  it("does not reuse any Finance or Lexcar hex value verbatim", () => {
    const ours = (Object.values(MINISTRY) as unknown[])
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.toLowerCase());
    for (const foreign of [...FINANCE, ...LEXCAR]) expect(ours).not.toContain(foreign.toLowerCase());
  });

  it("is not Ministry's old blue accent either (DS.accent stays for the other screens)", () => {
    expect(hue(DS.accent)).toBeGreaterThan(200);
    expect(MINISTRY.accent).not.toBe(DS.accent);
  });
});

describe("MINISTRY palette — text on the hero stays readable", () => {
  // Worst case a caption can meet: the dominant wave fully blended into the
  // top tone at its configured opacity.
  const worstWave = blend(MINISTRY.heroTop, MINISTRY.heroA, MINISTRY.heroAlpha[0]);

  it("headline ink is >= 6.5:1 on the top tone and on the deepest wave", () => {
    expect(contrast(MINISTRY.ink, MINISTRY.heroTop)).toBeGreaterThanOrEqual(6.5);
    expect(contrast(MINISTRY.ink, worstWave)).toBeGreaterThanOrEqual(6.5);
  });

  it("secondary ink passes AA (4.5:1) on the top tone, the deepest wave, and the page ground", () => {
    expect(contrast(MINISTRY.ink2, MINISTRY.heroTop)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(MINISTRY.ink2, worstWave)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(MINISTRY.ink2, MINISTRY.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("pill label (primary) passes AA on a white-ish glass pill", () => {
    expect(contrast(MINISTRY.primary, MINISTRY.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(MINISTRY.primary, MINISTRY.accentSoft)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("ministryCssVars()", () => {
  it("emits one :root rule with a kebab-case --ministry-* variable per token", () => {
    const css = ministryCssVars();
    expect(css.startsWith(":root{")).toBe(true);
    expect(css.endsWith("}")).toBe(true);
    expect(css).toContain(`--ministry-primary:${MINISTRY.primary}`);
    expect(css).toContain(`--ministry-accent-soft:${MINISTRY.accentSoft}`);
    expect(css).toContain(`--ministry-hero-top:${MINISTRY.heroTop}`);
    expect(css).toContain(`--ministry-hero-a:${MINISTRY.heroA}`);
    expect(css).toContain(`--ministry-hero-b:${MINISTRY.heroB}`);
    expect(css).toContain(`--ministry-hero-c:${MINISTRY.heroC}`);
    expect(css).toContain(`--ministry-hero-deep:${MINISTRY.heroDeep}`);
    expect(css).toContain(`--ministry-bg:${MINISTRY.bg}`);
    expect(css).toContain(`--ministry-surface:${MINISTRY.surface}`);
    expect(css).toContain(`--ministry-ink-2:${MINISTRY.ink2}`);
  });

  it("serialises vector tokens as space-separated numbers the shader can parse", () => {
    const css = ministryCssVars();
    expect(css).toContain(`--ministry-hero-alpha:${MINISTRY.heroAlpha.join(" ")}`);
    expect(css).toContain(`--ministry-hero-light:${MINISTRY.heroLight}`);
  });

  it("has exactly as many variables as MINISTRY has keys — nothing typed by hand", () => {
    const count = (ministryCssVars().match(/--ministry-/g) ?? []).length;
    expect(count).toBe(Object.keys(MINISTRY).length);
  });
});

// TASK_077 — the Home drawer's light, copied from Lex Finance's drawer at
// the owner's request. Deliberately NOT in the MINISTRY band, so the guards
// here are about readability and about it staying Finance's light — never
// about hue parity with Ministry.
describe("DRAWER_ICE — Finance's drawer light, readable", () => {
  // Effective colours under text: the ground itself, the glass cards over
  // any pool at full strength, and the cyan/turquoise pools bare.
  const b = (base: string, over: { color: string; alpha: number }) => blend(base, over.color, over.alpha);
  const sky = b(DRAWER_ICE.top, DRAWER_ICE.blobSky);
  const blue = b(DRAWER_ICE.top, DRAWER_ICE.blobBlue);
  const cyan = b(DRAWER_ICE.bottom, DRAWER_ICE.poolCyan);
  const turq = b(DRAWER_ICE.bottom, DRAWER_ICE.poolTurquoise);
  const glassOver = (c: string) => blend(c, "#ffffff", 0.55);

  it("is Finance's light-theme scene verbatim (hero-top / hero-bottom / b1–b4 / glow)", () => {
    expect(DRAWER_ICE.top).toBe("#dbeafe");
    expect(DRAWER_ICE.bottom).toBe("#eef2f8");
    expect(DRAWER_ICE.blobSky).toEqual({ color: "#60a5fa", alpha: 0.72 });
    expect(DRAWER_ICE.blobBlue).toEqual({ color: "#4f7df0", alpha: 0.52 });
    expect(DRAWER_ICE.poolCyan).toEqual({ color: "#22d3ee", alpha: 0.55 });
    expect(DRAWER_ICE.poolTurquoise).toEqual({ color: "#2dd4bf", alpha: 0.5 });
    expect(DRAWER_ICE.glow).toEqual({ color: "#ffffff", alpha: 0.55 });
    expect(DRAWER_ICE.glass).toBe("rgba(255,255,255,0.55)");
    expect(DRAWER_ICE.glassBorder).toBe("rgba(255,255,255,0.75)");
  });

  it("title ink is >= 8:1 everywhere, even on the sky blob's centre", () => {
    for (const c of [DRAWER_ICE.top, DRAWER_ICE.bottom, sky, blue, cyan, turq]) {
      expect(contrast(DRAWER_ICE.ink, c)).toBeGreaterThanOrEqual(8);
    }
  });

  it("secondary ink passes AA (4.5:1) on the ground, on glass over every pool, and on the cyan/turquoise pools bare", () => {
    for (const c of [DRAWER_ICE.top, DRAWER_ICE.bottom, cyan, turq, glassOver(sky), glassOver(blue), glassOver(cyan), glassOver(turq)]) {
      expect(contrast(DRAWER_ICE.ink2, c)).toBeGreaterThanOrEqual(4.5);
    }
    // The one Finance-parity exception (documented): bare sky/blue blob
    // centres. Still clearly better than Finance's own --muted (2.4:1).
    expect(contrast(DRAWER_ICE.ink2, sky)).toBeGreaterThanOrEqual(3);
    expect(contrast(DRAWER_ICE.ink2, blue)).toBeGreaterThanOrEqual(3);
    expect(contrast("#6b7180", sky)).toBeLessThan(contrast(DRAWER_ICE.ink2, sky));
  });

  it("stays on the cyan → blue side, measurably colder than the hero's mint", () => {
    for (const c of [DRAWER_ICE.top, DRAWER_ICE.blobSky.color, DRAWER_ICE.blobBlue.color, DRAWER_ICE.poolCyan.color, DRAWER_ICE.poolTurquoise.color]) {
      expect(hue(c)).toBeGreaterThanOrEqual(170);
    }
    expect(hue(DRAWER_ICE.top)).toBeGreaterThan(hue(MINISTRY.heroTop) + 30);
  });

  it("cssVars do not pick it up — it is not part of the shader palette", () => {
    expect(ministryCssVars()).not.toContain("drawer");
    expect(ministryCssVars()).not.toContain(DRAWER_ICE.top);
  });
});
