/**
 * @jest-environment node
 *
 * TASK_069 — the Home hero's WebGL shader IS LexCar's final one
 * (LexCar/src/components/HeroCanvas.js, commit 8a6b74d): three `fold()`
 * height fields lit by `layer()` into ONE continuous silk surface. These
 * guards exist because the look already drifted once — Finance TASK_055's
 * "separate waves" (`waveShape()/relief()`) were carried into Ministry in
 * TASK_065 and had to be taken out again. Any future "tweak" that brings
 * back per-wave crest/valley shapes, ribbons or stripes must fail here.
 *
 * When the LexCar repository sits next to this one on disk, VERT and FRAG
 * are compared byte for byte; otherwise the structural checks still run.
 */
import * as fs from "fs";
import * as path from "path";
import { FRAG, VERT } from "../HeroCanvas.web";

const LEXCAR_HERO = path.resolve(__dirname, "../../../../../LexCar/src/components/HeroCanvas.js");

function body(src: string, fn: string): string {
  const m = src.match(new RegExp(`${fn}\\([^{]*\\{([\\s\\S]*?)\\n\\}`));
  return m ? m[1] : "";
}

describe("hero shader — LexCar final surface (fold/layer), not separate waves", () => {
  it("builds each layer's height field with fold(p, t, dir, seed): sine bent by simplex noise", () => {
    expect(FRAG).toMatch(/float snoise\(vec2 v\)/);
    expect(FRAG).toMatch(/float fold\(vec2 p, float t, vec2 dir, float seed\)/);
    const fb = body(FRAG, "float fold");
    expect(fb).toMatch(/vec2 q = p - dir \* t \* 0\.05;/);
    expect(fb).toMatch(/float w {2}= sin\(q\.x \* 1\.5 \+ q\.y \* 1\.1 \+ n1 \* 1\.9 \+ t \* 0\.14 \+ seed \* 2\.0\);/);
    expect(fb).toMatch(/return w \* 0\.58 \+ n1 \* 0\.45 \+ n2 \* 0\.06;/);
  });

  it("lights each layer in layer(): finite-difference pseudo-normal, diffuse, specular pow 12, deep shade, band", () => {
    expect(FRAG).toMatch(/vec3 layer\(vec3 col, vec2 p, float t, vec2 dir, float seed, vec3 tint, float alpha\)/);
    const lb = body(FRAG, "vec3 layer");
    expect(lb).toMatch(/const float e = 0\.035;/);
    expect(lb).toMatch(/float hx = fold\(p \+ vec2\(e, 0\.0\), t, dir, seed\);/);
    expect(lb).toMatch(/float hy = fold\(p \+ vec2\(0\.0, e\), t, dir, seed\);/);
    expect(lb).toMatch(/vec3 N = normalize\(vec3\(-\(hx - h\) \/ e \* 0\.30, -\(hy - h\) \/ e \* 0\.30, 1\.0\)\);/);
    expect(lb).toMatch(/vec3 L = normalize\(vec3\(-0\.45, 0\.75, 0\.55\)\);/);
    expect(lb).toMatch(/float diff = clamp\(dot\(N, L\), 0\.0, 1\.0\);/);
    expect(lb).toMatch(/float spec = pow\(clamp\(dot\(N, H\), 0\.0, 1\.0\), 12\.0\);/);
    expect(lb).toMatch(/float band = smoothstep\(-0\.35, 0\.45, h\) \* \(1\.0 - smoothstep\(0\.55, 1\.25, h\)\);/);
    expect(lb).toMatch(/vec3 shaded = tint \* \(0\.82 \+ 0\.28 \* diff\);/);
    expect(lb).toMatch(/shaded = mix\(shaded, u_deep, \(1\.0 - diff\) \* 0\.26\);/);
    expect(lb).toMatch(/shaded \+= vec3\(1\.0\) \* spec \* u_light;/);
    expect(lb).toMatch(/return mix\(col, shaded, band \* alpha\);/);
  });

  it("composes exactly three layers with LexCar's drift directions/seeds over a top→bottom base, then fades into the page ground", () => {
    const mb = body(FRAG, "void main");
    expect(mb).toMatch(/vec3 col = mix\(u_top, u_bot, uv\.y\);/);
    expect(mb).toMatch(/col = layer\(col, p, t, vec2\( 1\.0, -0\.35\), 0\.0, u_c1, u_alpha\.x\);/);
    expect(mb).toMatch(/col = layer\(col, p, t, vec2\(-0\.85, 0\.30\), 1\.0, u_c2, u_alpha\.y\);/);
    expect(mb).toMatch(/col = layer\(col, p, t, vec2\( 0\.55, 0\.85\), 2\.0, u_c3, u_alpha\.z\);/);
    expect((mb.match(/col = layer\(/g) ?? []).length).toBe(3);
    expect(mb).toMatch(/col = mix\(col, u_bot, smoothstep\(0\.58, 1\.0, uv\.y\)\);/);
    expect(mb).toMatch(/gl_FragColor = vec4\(col, 1\.0\);/);
  });

  it("has no trace of the TASK_055 'separate waves' look (waveShape / relief / rot / rim / valley)", () => {
    expect(FRAG).not.toMatch(/waveShape/);
    expect(FRAG).not.toMatch(/relief\(/);
    expect(FRAG).not.toMatch(/mat2 rot\(/);
    expect(FRAG).not.toMatch(/float rim/);
    expect(FRAG).not.toMatch(/float valley/);
    expect(FRAG).not.toMatch(/streak/);
  });

  it("keeps the uniforms API the JS wrapper feeds (u_res, u_t, palette, alpha, light)", () => {
    expect(FRAG).toMatch(/uniform vec2 {2}u_res;/);
    expect(FRAG).toMatch(/uniform float u_t;/);
    expect(FRAG).toMatch(/uniform vec3 {2}u_top, u_bot, u_c1, u_c2, u_c3, u_deep;/);
    expect(FRAG).toMatch(/uniform vec3 {2}u_alpha;/);
    expect(FRAG).toMatch(/uniform float u_light;/);
  });

  it("VERT is the fullscreen-triangle pass-through", () => {
    expect(VERT).toMatch(/attribute vec2 a_pos;/);
    expect(VERT).toMatch(/v_uv = a_pos \* 0\.5 \+ 0\.5;/);
    expect(VERT).toMatch(/gl_Position = vec4\(a_pos, 0\.0, 1\.0\);/);
  });
});

const lexcarAvailable = fs.existsSync(LEXCAR_HERO);
(lexcarAvailable ? describe : describe.skip)("hero shader — byte-for-byte equal to LexCar (repository found next to Ministry)", () => {
  const lex = lexcarAvailable ? fs.readFileSync(LEXCAR_HERO, "utf8") : "";
  const tpl = (s: string, name: string) => {
    const m = s.match(new RegExp(`const ${name} = \`([\\s\\S]*?)\`;`));
    return m ? m[1] : null;
  };

  it("VERT matches LexCar", () => {
    expect(tpl(lex, "VERT")).not.toBeNull();
    expect(VERT).toBe(tpl(lex, "VERT"));
  });

  it("FRAG matches LexCar (fold / layer / main, 8a6b74d)", () => {
    const lexFrag = tpl(lex, "FRAG");
    expect(lexFrag).not.toBeNull();
    expect(lexFrag!.length).toBeGreaterThan(3000);
    expect(FRAG).toBe(lexFrag);
  });
});
