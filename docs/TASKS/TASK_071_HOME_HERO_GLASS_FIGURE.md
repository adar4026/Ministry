# TASK_071 — Главная: главный показатель `37 ч` в стиле frosted glass

**Дата:** 20 сентября 2026
**Статус:** Реализовано, подтверждено владельцем 2026-09-20 → commit + deploy (см. §6)
**Скоуп:** только стиль отображения главного KPI `37 ч` (число + единица)
в верхнем hero Главной. Структура hero, фон (WebGL / mint), сетка, шапка
(☰, «Христианская жизнь», дата), caption `из цели 50 часов · 74% выполнено`,
progress bar, темп, метрики, pill-кнопки, секции ниже, нижняя навигация,
высота hero — без изменений.

---

## 1. Что нужно

Сделать стеклянными **сами цифры**, а не подложку под ними: никакой
стеклянной плашки/карточки под `37 ч` и никакого стекла на остальном hero.
Число остаётся главным (≈ 60 px), единица — второстепенной (≈ 24 px), оба —
на одной базовой линии, вплотную, как единая композиция (TASK_070).

Характер: мягкий iOS glass / frosted glass — полупрозрачные, светлые,
слегка матовые глифы с ощущением объёма, светлые блики, тонкий внутренний
свет, аккуратная белёсая подсветка по краям, мягкая тень. Без неона, без
тяжёлой тени, без «ледяного» 3D и без выпуклого логотипа. Читаемость не
должна ухудшиться: цифры не должны «растворяться» на светлом фоне.

## 2. Ограничение среды

Настоящий `backdrop-filter`, ограниченный формой глифов, в CSS невозможен
(фильтр действует на бокс элемента, а не на текст; маска по тексту без
шрифтового растра недоступна). Фон под цифрами — гладкий «шёлк» шейдера,
блюр за ним всё равно не был бы виден. Поэтому — **визуальная имитация**
стекла (допущена постановкой, п. 8): слоистый текст.

## 3. Реализация

### 3.1 Слои (web)

`HomeHero.tsx`: `figureWrap` (центрирующий wrapper TASK_070) → новый
`figureStack` (`position: relative`), внутри которого одна и та же строка
«число + единица» (`FigureRow`) рендерится несколько раз:

| Слой | Позиция | Стиль | Роль |
|---|---|---|---|
| `shadow` | absolute, под телом, `zIndex 0` | `color: transparent`, `textShadow: 0 8px 22px heroDeep@.30, 0 1px 3px heroDeep@.22` | мягкая тень / лифт — отделяет светлое стекло от светлого фона |
| `depth` | absolute, `top 1.5`, `zIndex 0` | `color: heroDeep@.34` | тонкая тёмная нижняя кромка — объём |
| `body` | in-flow, `zIndex 1` | `backgroundImage: linear-gradient(180°, white .98 → white .90 (28 %) → white .74 (62 %) → pale-mint .70)`, `backgroundClip: text`, `color/WebkitTextFillColor: transparent` | матовое полупрозрачное тело с внутренним светом сверху |
| `rim` | absolute, над телом, `zIndex 2` | `color: transparent`, `WebkitTextStroke: 1px white@.75` | белёсая подсветка по краям |

Единица (`ч`/`м`) получает те же слои, но с более прозрачным телом и
более лёгкой тенью — второстепенный акцент при том же характере.

Слои-оверлеи: `pointerEvents: none`, `importantForAccessibility: no` /
`aria-hidden` — озвучивается только сводка hero (как и раньше). Оверлеи
рендерятся **без `numberOfLines`**: у RNW он даёт `overflow: hidden`, и
размытая тень обрезалась бы по боксу текста прямоугольником (проверено
в прототипе).

Все rgba-значения — новый объект `FIGURE_GLASS` в `tokens.ts` (по тому же
принципу, что `NAV`: производные от `MINISTRY`, вне hex-палитры).

### 3.2 Native (iOS/Android RN)

`backgroundClip: text` и text-stroke недоступны — одно тело: заливка
`white@.92` (единица `white@.78`) + `textShadow*` (heroDeep@.30, radius 14,
offset 0/6). Оверлеев нет. PWA на iPhone — web-ветка.

### 3.3 Что не меняется

Кегли/вес/трекинг/`lineHeight` числа и единицы, `figureWrap`, `figure`
(row, baseline), `splitDuration()`, `formatHMRounded()`, интервалы,
`FIGURE_FONT` (SF Rounded через `ui-rounded`), маршруты кнопок.

### 3.4 Файлы

| Файл | Что |
|---|---|
| `src/components/dashboard/tokens.ts` | `FIGURE_GLASS` |
| `src/components/dashboard/HomeHero.tsx` | `FigureRow`, `figureStack`, слои |
| `src/components/dashboard/__tests__/HomeHero.test.tsx` | цвет/слои цифры |
| `docs/TASKS/TASK_071_…md`, `docs/STATUS.md`, `docs/ARCHITECTURE.md` | документация |

## 4. Проверки (выполнены)

- `npx tsc --noEmit` — чисто; `npx jest` — **80/80 suites, 1249/1249**
  (было 1245: +4 теста «glass figure»: web-контракт слоёв, native-ветка,
  отсутствие плашки/оверлеев на native, стекло только на цифре);
  `git diff --check` — чисто; `npx expo export --platform web` — собирается.
- Браузер (dev-сервер, Chromium), Главная, **390 px**, тестовая сессия 37 ч:
  - центр блока цифры = **195** = центр экрана; `figureStack` ровно того же
    размера, что и body-строка (88 × 64) — оверлеи layout не трогают;
  - все три оверлея (`shadow`, `depth`, `rim`) совпадают с body по `x` и
    ширине глиф-в-глиф, `depth` смещён на 1.5 px вниз; `zIndex` 0 / 1 / 2;
  - body: `-webkit-background-clip: text`, fill `transparent`, градиент
    white .98 → .90 → .74 → pale-mint .70; число `60px/600`, единица
    `24px/500`; shadow-слой `0 8px 22px heroDeep@.30, 0 1px 3px @.22`;
    rim `1px white@.75`; overflow оверлеев `visible` — прямоугольного
    артефакта тени нет;
  - `scrollWidth === innerWidth === 390`, консоль без ошибок;
  - «37 ч 30 м»: центр 195, ширина 193 px, четыре куска на одной базовой
    линии, слои совпадают; **320 px** — центр 160, `left 64 / right 256`,
    overflow нет.
- Прототип в браузере до реализации выявил: у RNW `numberOfLines` даёт
  `overflow: hidden`, и размытая тень оверлея обрезается прямоугольником
  по боксу текста — поэтому оверлеи рендерятся без `numberOfLines`.

## 5. Не входит

Стекло на hero-контейнере, caption, progress, метриках, кнопках; изменение
фона.

## 6. Architecture Review Checklist (ADR-007)

- [x] Нет новых зависимостей (`package.json` не менялся); шрифт — системный.
- [x] Нет изменения модели данных и ключей AsyncStorage; `StoreContext`,
      `monthProgress()`, `formatHMRounded()` не тронуты.
- [x] Токены — единый источник: rgba-поверхности в `FIGURE_GLASS`
      (`tokens.ts`), по тому же принципу, что `NAV`; hex-палитра `MINISTRY`
      и `--ministry-*` CSS-vars не менялись (`tokens.test.ts` зелёный).
- [x] Платформенные ветки — через `Platform.OS` в одном месте
      (`figureGlassStyles()`), native компилируется и рендерит одно тело.
- [x] Layout hero не изменился: стек = размер body-строки, оверлеи absolute;
      высота сцены, интервалы, центровка TASK_070 — прежние.
- [x] Доступность: оверлеи `aria-hidden` / `no-hide-descendants`, озвучивается
      одна сводка hero (тест «exposes one spoken summary» зелёный).
- [x] Regression-защита: 4 новых теста (web-контракт слоёв, native-ветка,
      отсутствие плашки, стекло только на цифре).
- [ ] Живая проверка на iPhone (PWA standalone) — post-deploy шаг владельца.
