# TASK_065 — Главная: hero-зона с «жидкими волнами» и собственная палитра Ministry

**Дата:** Сентябрь 2026
**Статус:** Реализовано, ожидает подтверждения владельца (не закоммичено)
**Референсы:** Alex Finance `js/ui/hero_canvas.js` (TASK_054/055 там),
Lexcar `src/components/HeroCanvas.js` (коммит 8a6b74d)

---

## 1. Что было

Главная состояла из фиксированного SVG-градиента (`HomeBackground`, мятный
`HOME_MINT_GRADIENT`, 360 px) и **белой карточки** `HoursHeroCard` поверх него:
«фон + ещё одна большая карточка». Ниже — карточки «Ближайшие события»,
«Текущий служебный год», «Последние события» с тенью `0 8px 20px / 0.06`.
Акцент приложения — синий (`DS.accent #3f6fe0`, `DS.navy #16294d`).

## 2. Исследование референсов (до выбора палитры)

| | Alex Finance | Lexcar |
|---|---|---|
| Механика | один `<canvas>` WebGL, fragment-shader: 3 height-field-волны (simplex noise + sin-displacement), псевдонормаль через конечные разности, diffuse/specular/rim, время непрерывное | та же архитектура (Finance — порт Lexcar без React) |
| Производительность | DPR ≤ 1.5, 30 fps, `low-power`, пауза при `document.hidden` и вне viewport, `webglcontextlost` → CSS-fallback, reduced-motion → fallback | то же + отказ на «слабом устройстве» (`deviceMemory ≤ 2`, `hardwareConcurrency ≤ 2`) |
| Интеграция | слой `.finance-ambient` z:0 высотой `--hero-h` (460 px, включая topbar), `pointer-events:none`; контент z:1 без карточки; topbar прозрачный → стекло при прокрутке; **низ hero растворяется в фон страницы внутри шейдера** (`smoothstep(0.58,1.0)` → `u_bot`) | `.home-ambient` 380 px, `overflow:hidden`, то же растворение |
| Fallback | CSS radial-gradient blob'ы, анимируются только `transform` | aurora-ribbons, то же |
| Палитра (hue) | violet/lavender: `#6d5df6` (246°), top `#c9bff9` (250°), deep `#4a3ac0` | cyan / ice-blue: accent `#0e7c86` (185°), c1 `#0d949f` (185°), c2 `#78c4f0` (202°), top `#d9ecf4` (198°), deep `#0f5f78` (194°), bg `#eaf4f7` (194°) |

Вывод: Lexcar **уже занимает сине-бирюзовую** полосу (185–202°). Чтобы Ministry
не стал «перекрашенным Lexcar», его палитра уходит на **зелёную сторону teal**
(155–168°): emerald / mint, с глубоким хвойным teal в тени вместо синего.

## 3. Палитра Ministry (design tokens)

Единственный источник — `MINISTRY` в `src/components/dashboard/tokens.ts`;
на web те же значения публикуются как CSS-переменные `--ministry-*` из
`app/+html.tsx` (`ministryCssVars()`), откуда их читает шейдер
(`getComputedStyle`) — ровно как в Finance (`--hero-gl-*`).

| Токен | Значение | Hue | Роль |
|---|---|---|---|
| `--ministry-primary` | `#0f6f5c` | 168° | глубокий teal — кнопки, ink-акценты |
| `--ministry-accent` | `#1fa683` | 164° | мягкий emerald — прогресс, иконки |
| `--ministry-accent-soft` | `#e2f4ed` | 157° | подложка pill-кнопок |
| `--ministry-hero-top` | `#c6ebde` | 159° | верх сцены — светлая мята |
| `--ministry-hero-a` | `#189a79` | 164° | доминирующая волна — emerald-teal |
| `--ministry-hero-b` | `#8ddcc4` | 162° | вторая волна — мягкий aqua-mint |
| `--ministry-hero-c` | `#e8f9f2` | 155° | блик — бледная мята (не белый) |
| `--ministry-hero-deep` | `#0a5748` | 168° | тень/ложбина — хвойный teal |
| `--ministry-bg` | `#f4f9f7` | 156° | фон страницы = низ hero |
| `--ministry-surface` | `#ffffff` | — | карточки |
| `--ministry-ink` | `#0f2a26` | 171° | заголовки на hero (≥ 6.8:1 даже на насыщенном гребне волны A, 11.8:1 на верхе сцены) |
| `--ministry-ink-2` | `#274640` | 167° | вторичный текст на hero (4.65:1 на насыщенном гребне волны A, 8.0:1 на верхе сцены) |
| `--ministry-hero-alpha` / `--ministry-hero-light` | `.56 .48 .40` / `.62` | — | непрозрачность волн / сила блика (первая проба `.46/.40/.34` читалась выцветшей — ткань почти не ощущалась) |

Ни одно значение не совпадает с токенами Finance/Lexcar; ближайший чужой
токен (Lexcar c1, 185°) отстоит на ~20° и синеватый.

## 4. Реализация

### 4.1 Файлы

| Файл | Что |
|---|---|
| `src/components/dashboard/tokens.ts` | `MINISTRY` + `ministryCssVars()`; старые `DS`/`HOME_*` не тронуты (их используют Hours/Timeline/Profile) |
| `app/+html.tsx` | `<style id="ministry-tokens">:root{--ministry-*}</style>` |
| `src/components/dashboard/HeroCanvas.web.tsx` | WebGL-слой: шейдер Finance/Lexcar (три волны, освещение), палитра из CSS-vars с TS-fallback, DPR ≤ 2 (по ТЗ), 30 fps, пауза при hidden/вне viewport, reduced-motion, слабое устройство, context lost/restored, полная очистка при unmount |
| `src/components/dashboard/HeroCanvas.tsx` | native: `null` (остаётся SVG-fallback) |
| `src/components/dashboard/HeroScene.tsx` | фон hero: SVG-градиент top→bg + три мягких radial-blob'а (fallback на всех платформах), поверх — `<HeroCanvas/>`; `pointerEvents:none`, `overflow:hidden`; высота приходит от экрана: верхний inset + измеренный контент hero + хвост 64 px (`HERO_HEIGHT` = 300 — только стартовая оценка до первого `onLayout`) |
| `src/components/dashboard/HomeHero.tsx` | контент hero без карточки: eyebrow «Сентябрь 2026», главная цифра, «из цели 50 ч · 25 %», тонкая линия прогресса, статус темпа, две метрики «Осталось / До конца», действия «Детали» и «Добавить часы» (лёгкие glass-pills) |
| `app/(tabs)/index.tsx` | `HomeBackground`+`HoursHeroCard` → `HeroScene`+`HomeHero`; заголовок и дата внутри hero; верхний inset применяется самим экраном |
| `app/(tabs)/_layout.tsx` | на Home `SafeAreaView` без `top` — сцена уходит под status bar / Dynamic Island; фон сцены `MINISTRY.bg` |
| `src/components/dashboard/SummaryCard.tsx` | тень облегчена (`0 6px 16px / 0.04`), карточки не спорят с воздушным hero |
| `src/components/dashboard/index.ts` | экспорты |

`HoursHeroCard`, `HomeBackground`, `HOME_MINT_GRADIENT` остаются в библиотеке
(другие экраны/тесты), на Главной больше не используются.

### 4.2 Hero

Высота сцены = `insets.top` + 10 + измеренная высота блока «шапка + HomeHero» + 64 px хвоста (до первого `onLayout` — 300 px). Контент: шапка
(«Христианская жизнь» / дата / аватар) → eyebrow → цифра → подпись → полоса
прогресса → метрики → действия. Никакой карточки-контейнера: только два
pill-действия с лёгким стеклом (`rgba(255,255,255,.55)`, blur 10 px, без
рамки). Заголовки — `MINISTRY.ink` с `textShadow 0 1px 0 rgba(255,255,255,.35)`,
как в референсах.

Переход hero → контент: в шейдере (и в SVG-fallback) низ сцены
растворяется в `--ministry-bg` (`smoothstep(0.58, 1.0)`), фон экрана —
тот же `--ministry-bg`. Резкой границы нет; следующая секция начинает
«внутри» затухания.

### 4.3 Движение и производительность

Скорости волн 0.042–0.070 (как в Finance после TASK_055), амплитуда
большая, частота низкая; время накапливается по отрисованным кадрам с
clamp'ом delta — после фона ткань продолжает с того же места. Один canvas,
один rAF, одна draw-call на кадр, 8 uniforms, без текстур. DPR ≤ 2.
`ResizeObserver` пересчитывает размер только при реальном изменении.
Unmount: `cancelAnimationFrame`, снятие всех слушателей и observers,
`deleteBuffer/Program/Shader`.

### 4.4 Fallback

SVG-градиент `hero-top → bg` + три radial-blob'а (`hero-a`, `hero-b`,
`hero-c`) — статичная «глубина» той же палитры. Показывается: на native;
на web пока canvas не активен; если нет WebGL / шейдер не собрался / контекст
потерян / `prefers-reduced-motion` / слабое устройство. Canvas проявляется
поверх за 0.9 s.

## 5. Проверки (выполнены)

- `npx tsc --noEmit` — чисто; `npx jest` — 74/74 suites, 1165/1165 тестов;
  `git diff --check` — чисто; `npx expo export --platform web` — собирается,
  `--ministry-*` присутствуют в статическом `dist/index.html`.
- Браузер (dev-сервер, Chromium): 320 / 375 / 390 / 430 px —
  `scrollWidth === innerWidth` (нет горизонтального скролла), ни один
  текст hero не обрезан, canvas ровно в границах сцены (`overflow:hidden`),
  `hero-canvas--on`, буфер `390×300 → 780×600` при DPR 2 (cap работает),
  `--ministry-hero-a` читается из CSS. `elementFromPoint` в центре hero
  возвращает контент, не canvas; «Детали», «Добавить часы» и аватар —
  попадаемы. Потеря контекста (`WEBGL_lose_context`) → canvas гаснет,
  виден SVG-fallback той же палитры; восстановление → canvas снова активен.
  Скрытая вкладка (`visibilitychange`) → 0 draw-calls, возврат → рисование
  возобновляется. Ошибок в консоли нет.
- Ограничение среды: Browser pane тротлит **любой** `requestAnimationFrame`
  до ~1 Гц (проверено на «пустом» rAF), поэтому 30 fps в нём не измерить —
  темп кадров, clamp дельты времени и пауза/возобновление покрыты
  unit-тестом с управляемыми rAF/часами (`HeroCanvas.web.test.tsx`).
- Найдено и исправлено по ходу: (1) чёрный кадр на один rAF после
  resize/поворота — буфер очищается при смене `canvas.width`; теперь
  `resize()` перерисовывает синхронно; (2) на 320 px две метрики переносятся
  и pill-кнопки выпадали из сцены фиксированной высоты — высота сцены теперь
  следует за измеренным контентом (`onLayout`) + хвост 64 px; (3)
  `parseFloats("")` возвращал `[0]` — без CSS-переменной блик обнулялся бы;
  (4) `ink2` углублён до `#274640`: прежний `#3b5b54` давал 3.4:1 на
  полностью насыщенном гребне волны A.
- Существующие тесты Главной (аватар, bottom inset, «Добавить часы» → `/entry`,
  регресс импорта TASK_013) проходят без изменений; тест мятного градиента
  TASK_053 заменён тестами hero-зоны.

### Тесты, добавленные в TASK_065

| Файл | Покрытие |
|---|---|
| `src/components/dashboard/__tests__/tokens.test.ts` | hue-полоса 150–172°, ≥ 12° от любого токена Lexcar, вдали от violet Finance, ни одного чужого hex; контраст ink/ink2/primary на top/худшей волне/фоне; `ministryCssVars()` — имена, векторы, полнота |
| `.../HeroCanvas.web.test.tsx` (jsdom) | первый кадр, DPR cap, fallback без WebGL / при ошибке шейдера / при потерянном контексте, палитра в uniforms, темп ≤ 30 fps, пауза при hidden и продолжение времени без скачка, синхронная перерисовка на resize, context lost/restored, полный teardown (rAF, слушатели, `deleteBuffer/Program/Shader`), `readPalette` с CSS-vars и fallback, гейтинг компонента (reduced-motion, слабое устройство, нет WebGL) |
| `.../HeroScene.test.tsx` | absolute/clipped/`pointerEvents:none`, палитра fallback-градиента, три эллипса-складки, кривая растворения, уникальные SVG-id |
| `.../HomeHero.test.tsx` | eyebrow/цифра/подпись, отсутствие карточки, hero-inks вместо `DS.navy`/`DS.subInk`, заливка прогресса, единая a11y-сводка, маршруты «Детали»/«Добавить часы», стеклянные pill без рамки |
| `app/(tabs)/__tests__/index.test.tsx` | hero-сцена и контент вместо `HomeBackground`/`HoursHeroCard`, сцена не перехватывает касания, фон = `MINISTRY.bg`, верхний inset применяется экраном, заголовок в hero-ink |
| `app/__tests__/html.test.tsx` | `<style id="ministry-tokens">` = `ministryCssVars()` |

## 6. Не входит

Редизайн других экранов; тёмная тема; native-реализация canvas (проект
ships web/PWA); изменение модели данных; commit/push/deploy до
подтверждения владельца.

## 7. Architecture Review Checklist (ADR-007)

- [x] Нет новых зависимостей (`package.json` не менялся) — WebGL нативный.
- [x] Нет изменения модели данных и ключей AsyncStorage.
- [x] `StoreContext` не менялся; hero читает те же `monthProgress()` /
      `computePaceDeviation()`.
- [x] Токены — единый источник (`MINISTRY`), CSS-vars генерируются из него.
- [x] Fallback без WebGL; UI не зависит от canvas.
- [x] Полная очистка ресурсов при unmount.
- [ ] Живая проверка на iPhone (PWA standalone, safe-area, Dynamic Island) —
      post-deploy шаг владельца.
