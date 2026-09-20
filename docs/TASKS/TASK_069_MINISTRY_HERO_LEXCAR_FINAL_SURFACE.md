# TASK_069 — Главная: WebGL-hero — единая шёлковая поверхность по финальной реализации LexCar

**Дата:** 20 сентября 2026
**Статус:** Реализовано, ожидает подтверждения владельца (не закоммичено)
**Референс:** LexCar `src/components/HeroCanvas.js` — единственный коммит
`8a6b74d`, рабочее дерево (`HEAD b2e5423`) идентично; это и есть финальная
утверждённая реализация. Тот же источник использовал Alex Finance в
TASK_058 (возврат к LexCar после TASK_055).

---

## 1. Что было

TASK_065 принесла в Ministry WebGL-фон hero (`HeroCanvas.web.tsx`) с
обвязкой LexCar/Finance, но фрагментный шейдер был взят из Finance
**после TASK_055**: `waveShape()`/`relief()` — каждая из трёх «волн» —
отдельная форма (гауссов гребень минус впадина на одном склоне), ползущая
поперёк сцены под своим углом (`mat2 rot`), плюс `rim`/`valley`-подсветка.
Визуально это читалось как **отдельные волны/полосы**, а не как одна
живая поверхность. В Finance этот look был признан нежелательным и снят
(TASK_058); Ministry оставался на нём.

## 2. Почему менялось

Владелец утвердил как эталон финальный hero LexCar: **единая непрерывная
поверхность** (жидкий шёлк/сатин) — мягкие углубления и выпуклости,
псевдонормаль, diffuse + specular, мягкая тень, band, нижний fade, очень
медленное спокойное движение. Без отдельных гребней, ribbons, полос,
`waveShape/relief`. Задача — перенести именно эту реализацию, адаптировав
только палитру под Ministry.

## 3. Что сделано

### 3.1 Шейдер — LexCar побайтно

`FRAG` в `src/components/dashboard/HeroCanvas.web.tsx` заменён на `FRAG`
LexCar `8a6b74d` **побайтно** (3 546 символов; проверяется тестом при
наличии репозитория LexCar рядом):

- `fold(p, t, dir, seed)` — height field одного слоя: крупная синусоида,
  изогнутая низкочастотным simplex-шумом, дрейф `dir * t * 0.05`;
- `layer(...)` — псевдонормаль конечными разностями (`e = 0.035`), свет
  `L = (-0.45, 0.75, 0.55)`, diffuse, specular `pow 12`, мягкая тень в
  `u_deep` на обратной стороне (`0.26`), `band` = где слой виден;
- `main()` — три слоя с направлениями/seed LexCar
  (`(1, -.35)/0`, `(-.85, .30)/1`, `(.55, .85)/2`) поверх `top → bot`,
  нижний fade `smoothstep(0.58, 1.0, uv.y)` в фон страницы.

`VERT`, simplex noise и uniforms API (`u_res u_t u_top u_bot u_c1 u_c2
u_c3 u_deep u_alpha u_light`) уже совпадали с LexCar — не менялись.
`VERT`/`FRAG` теперь экспортируются (только для тестов).

### 3.2 JS-обвязка — без изменений

WebGL init, canvas lifecycle, `ResizeObserver`, DPR cap (2), 30 fps RAF,
`visibilitychange`, `IntersectionObserver`, context lost/restored
(rebuild + продолжение времени), reduced-motion (живой `matchMedia`),
слабое устройство, полный teardown, палитра из CSS-vars — как в TASK_065.
Обновлена только шапка модуля.

### 3.3 Палитра Ministry

Hex-токены `MINISTRY` (`heroTop/heroA/heroB/heroC/heroDeep/bg`) — без
изменений: своя зелёно-бирюзовая полоса 155–168°, hue-тесты TASK_065
проходят. Изменены только два числовых токена под характер шейдера
LexCar (его блик добавляется чистым белым: `spec * u_light`):

| Токен | Было (под waveShape) | Стало | Почему |
|---|---|---|---|
| `--ministry-hero-alpha` | `.56 .48 .40` | `.46 .40 .48` | как LexCar light (`.46 .40 .52`), c3 чуть ниже — как Finance TASK_058 (`.46 .40 .48`) |
| `--ministry-hero-light` | `.62` | `.45` | без ярко-белых пятен на гребнях (LexCar `.75`, Finance `.45`) |

Отдельных `--hero-gl-*` не заводилось: у Ministry уже есть свои
`--ministry-hero-*` (генерируются из `MINISTRY`, `app/+html.tsx`); шейдер
читает их через `readPalette()`.

Тема одна (light) — тёмной темы в Ministry нет (см. `NAV` в `tokens.ts`),
поэтому dark-вариант не добавлялся.

### 3.4 Файлы

| Файл | Что |
|---|---|
| `src/components/dashboard/HeroCanvas.web.tsx` | `FRAG` ← LexCar побайтно; `export const VERT/FRAG`; шапка модуля |
| `src/components/dashboard/tokens.ts` | `heroAlpha`, `heroLight` + комментарий |
| `src/components/dashboard/__tests__/HeroShader.test.ts` | **новый** — regression-защита (см. §4) |
| `app/__tests__/html.test.tsx` | ожидание новых значений `--ministry-hero-alpha/-light` |
| `docs/TASKS/TASK_069_…md`, `docs/STATUS.md` | документация |

Не тронуто: CSS/SVG fallback (`HeroScene.tsx`), `HomeHero.tsx`, экран
Главной, нижняя навигация, routing, данные, storage, другие анимации.
Service worker в Ministry нет (PWA через `expo export` + GitHub Pages, без
versioned cache) — поднимать нечего. `CHANGELOG.md`/`ROADMAP.md`/
`PROJECT_STATUS.md` в проекте отсутствуют; статус ведётся в `docs/STATUS.md`.

## 4. Тесты

`src/components/dashboard/__tests__/HeroShader.test.ts` (новый, 8 тестов):

1. `fold(p, t, dir, seed)` — сигнатура, дрейф, синусоида, смесь `w/n1/n2`;
2. `layer()` — `e = 0.035`, конечные разности, `L`, diffuse, specular
   `pow 12`, `band`, объём `0.82 + 0.28·diff`, тень `u_deep 0.26`, блик
   `spec * u_light`;
3. ровно три вызова `layer()` с направлениями/seed LexCar, база `top→bot`,
   нижний fade `smoothstep(0.58, 1.0)`;
4. **регресс**: в `FRAG` нет `waveShape`, `relief(`, `mat2 rot(`, `rim`,
   `valley`, `streak`;
5. uniforms API;
6. `VERT` — fullscreen triangle;
7–8. если рядом есть `../LexCar/src/components/HeroCanvas.js` — `VERT` и
   `FRAG` **побайтно** равны LexCar (иначе describe пропускается).

Существующие `HeroCanvas.web.test.tsx` (canvas, DPR cap, `pointer-events:
none`, reduced-motion, hidden/visible, resize, context lost/restored,
teardown), `HeroScene.test.tsx` (absolute/clipped/`pointerEvents:none`),
`tokens.test.ts` (hue/контраст) — проходят без изменений. Контраст текста
только улучшился: «худшая волна» считается с `heroAlpha[0]`, который
снизился.

## 5. Проверки (выполнены)

- `npx tsc --noEmit` — чисто; `npx jest` — **80/80 suites, 1238/1238**;
  `git diff --check` — чисто; `npx expo export --platform web` (во
  временную папку) — собирается, в бандле есть `float fold(vec2 p`, нет
  `waveShape`, в статическом `index.html` —
  `--ministry-hero-alpha:0.46 0.4 0.48;--ministry-hero-light:0.45`.
- Браузер (dev-сервер `expo start --web`, Chromium), Главная:
  - **390 px**: canvas `hero-canvas--on`, CSS 390×380 → буфер 780×760
    (DPR 3 → cap 2), `pointer-events: none`, `scrollWidth === innerWidth`;
    три кадра с интервалом 5–6 с различаются — поверхность медленно
    движется; визуально единая мягкая мятно-изумрудная поверхность, без
    отдельных гребней/полос, без белых пятен и резких бликов; текст hero
    («0 ч», подписи, метрики, pill-кнопки) читается;
  - **320 px**: 320×380 → 640×760, overflow нет, ничего не обрезано;
  - **430 px**: 430×380 → 860×760, overflow нет;
  - **desktop** (469 px pane): 469×380 → 938×760, overflow нет;
  - `WEBGL_lose_context.loseContext()` → класс `--on` снят, canvas гаснет
    (виден SVG-fallback той же палитры); `restoreContext()` → снова активен;
  - `document.hidden = true` + `visibilitychange` → **0** rAF за 1.5 с;
    возврат → rAF возобновляется (182 за 1.5 с);
  - консоль — без ошибок.
  - Сравнение с живым LexCar (lexcar.pages.dev, 390 px): тот же характер
    поверхности; у Ministry блик мягче намеренно (`light .45` vs `.75`).
- Ограничение среды: Browser pane тротлит rAF, поэтому 30 fps в нём не
  измеряется — темп кадров покрыт unit-тестом TASK_065.

## 6. Не входит

Тёмная тема (в приложении её нет); правки SVG-fallback; native-canvas;
любые изменения вне hero WebGL; commit/push/deploy до подтверждения
владельца.

## 7. Architecture Review Checklist (ADR-007)

- [x] Нет новых зависимостей (`package.json` не менялся).
- [x] Нет изменения модели данных и ключей AsyncStorage; `StoreContext` не тронут.
- [x] Токены — единый источник (`MINISTRY`), CSS-vars генерируются из него.
- [x] Fallback без WebGL / reduced-motion / lost context — не менялся и работает.
- [x] Обвязка lifecycle/производительности — не менялась.
- [x] Regression-защита от возврата «отдельных волн» — `HeroShader.test.ts`.
- [ ] Живая проверка на iPhone (PWA standalone) — post-deploy шаг владельца.
