# TASK_077 — Исправление TASK_076: откат `/profile`, LexMoney-принцип на боковой шторке

**Дата:** 20 сентября 2026
**Статус:** Implemented / deployed / production verified. Закоммичено
(`4860a90` откат `/profile`, `8cdc049` шторка), запушено, задеплоено
(`gh-pages` `bf425b3`, бандл `entry-de8ef887…`, хэш совпал с локальной
сборкой), проверено на production. Ожидает подтверждения владельца на
iPhone.
**Скоуп:** (1) откат визуальных правок TASK_076 на вкладке `/profile`;
(2) боковая шторка Главной (`HomeDrawer`, TASK_066/072) — фон панели,
шапка профиля, строки «Крещение / Пионер / Хихон», группы меню, footer.
Навигация, состав пунктов, данные, маршруты, нижняя навигация, экраны за
пределами шторки, страница `/profile` (кроме отката) — не менялись.

---

## 0. Почему эта задача

TASK_076 был реализован на неправильном экране. Владелец имел в виду не
отдельную вкладку `/profile` (`ProfileHeroCard.tsx`), а **выезжающую
боковую шторку**, которая открывается с Главной (`HomeDrawer` +
`ProfileSummary`), и референсом был **drawer LexMoney** (шапка «имя /
Личный профиль», ниже «Общий баланс», затем секции меню на единой
ледяной поверхности), а не страница профиля LexMoney. Принцип
исправления по формулировке владельца: *«откати визуальные изменения
`/profile` и перенеси концепцию на drawer. Не пытайся адаптировать текущий
результат — исправь именно место реализации»*.

## 1. Откат `/profile` (часть 1)

`git checkout 71d6c1b --` (коммит до TASK_076) для четырёх файлов:

| Файл | Что вернулось |
|---|---|
| `src/components/profile/ProfileHeroCard.tsx` | старая карточка TASK_042: `SummaryCard` (белая, с тенью), аватар 72 px + имя по центру, три равные колонки с uppercase-подписями, «+ Добавить событие», лимит 3 события через `[0,1,2].map` |
| `src/components/profile/__tests__/ProfileHeroCard.test.tsx` | 17 прежних тестов колонок |
| `src/components/dashboard/tokens.ts` | кластер `PROFILE_ICE` удалён (больше нигде не использовался) |
| `src/components/dashboard/index.ts` | реэкспорт `PROFILE_ICE` удалён |

`grep PROFILE_ICE src` → 0 совпадений. Баг с 4-м событием, который
TASK_076 «поймал», в старой раскладке не воспроизводится — она рендерит
ровно `[0, 1, 2]`. `docs/TASKS/TASK_076_…md` помечен «ОТКАЧЕНО в
TASK_077» с пояснением (исторические разделы оставлены как есть).

## 2. Шторка (часть 2) — что изменено

### 2.0 Вторая итерация — «свет» один в один из Lex Finance

После первого показа владелец попросил посмотреть, **как реализован свет
в шторке Lex Finance, и сделать именно так**. Первая итерация (бледные
ice-blue/mint пятна собственного подбора) заменена точным переносом
`~/Projects/Finance/index.html` (`.drawer`, `.drawer::before/::after`,
`--hero-*` light-токены, `.drawer-card`, `.drawer-row`, `.drawer-sep`,
`.drawer-head`, `.overlay.drawer-ov`). Ниже описано итоговое состояние.

### 2.1 Токены — `DRAWER_ICE` (`tokens.ts`) = Finance light

Кластер вне `MINISTRY` (по прецеденту `NAV` / `FIGURE_GLASS`; hue-гарды
`tokens.test.ts` — только про `MINISTRY`, этот кластер *намеренно*
совпадает с Finance). Область применения — `src/components/drawer/*` и
вариант `drawer` у `ProfileSettingsRow` (включая строку `BackupSection`).

| Токен | Значение | Finance |
|---|---|---|
| `top` / `bottom` | `#dbeafe` / `#eef2f8` | `--hero-top` / `--hero-bottom` |
| `glow` | white `.55` | `--hero-glow` |
| `blobSky` / `blobBlue` | `#60a5fa .72` / `#4f7df0 .52` | `--hero-b1` / `--hero-b4` |
| `poolCyan` / `poolTurquoise` | `#22d3ee .55` / `#2dd4bf .50` | `--hero-b2` / `--hero-b3` |
| `glass` / `glassBorder` / `glassPressed` | white `.55` / `.75` / `.78` | `--hero-glass` / `--hero-glass-border` |
| `sep` | `rgba(22,24,31,.054)` | `--hero-sep .12` × opacity `.45` |
| `ink` | `#16181f` | `--text` |
| `ink2` | `#4f5c70` | см. ниже (`--muted` = `#6b7180`) |
| `chevron` | `rgba(154,160,176,.7)` | `--muted2` × `.7` |
| `cardShadow` `.05` r10 y2 | | `--tx-card-shadow` |
| `panelShadow` `.10` r30 y10 | | `--nav-shadow` |
| `backdrop` | `rgba(20,22,34,.30)` | `.overlay.drawer-ov` |

**Контраст.** `--muted #6b7180` Finance даёт 4.0:1 на `--hero-top` и
2.4:1 в центре небесно-синего blob'а (там у Finance сидит «Личный
профиль»). Для Ministry взят `#4f5c70` — та же серо-синяя семья, ≥ 4.5:1
на земле, на стекле поверх любого пятна и на cyan/бирюзовом пятне в
полную силу; в самом центре sky/blue blob'ов — 3.2–3.3:1. Это единственное
принятое исключение (паритет с Finance, где 2.4:1), закреплено тестом как
«≥ 3 и лучше Finance».

### 2.2 `DrawerScene.tsx` — сцена Finance

```
background:
  radial 120%×50% at 50% 10%   glow   → transparent 60%    (белое свечение)
  radial  90%×40% at 100% 62%  cyan   → transparent 60%
  radial  80%×36% at 0% 92%    turq   → transparent 60%
  linear 180°  top 0% → bottom 58% → bottom 100%
::before  круг min(130vw,460)  left −40%  top −24%  sky  → transparent 64%   drift 22s alternate
::after   круг min(110vw,400)  right −46% top 6%    blue → transparent 64%   drift 27s alternate-reverse
drift: translate(0,0) scale(1) → translate(34px,28px) scale(1.08), ease-in-out
prefers-reduced-motion → без дрейфа
```

В RN: `Svg viewBox 0 0 100 100 preserveAspectRatio none` с `Rect`
(linear) + три `Ellipse` в тех же процентах (порядок отрисовки —
обратный списку CSS: градиент, бирюза, cyan, свечение сверху); два blob'а
— `Animated.View` с `Svg Circle` + `RadialGradient`, геометрия считается
от ширины/высоты **панели** (`skyBlobGeometry` / `blueBlobGeometry`,
экспортированы и покрыты тестом), дрейф — `Animated.loop(sequence(timing
0→1, 1→0))` с `Easing.inOut`, `useNativeDriver` на native; второй blob
стартует с 1 (`alternate-reverse`); `prefersReducedMotion()` → статика.
Только SVG: ни `HeroCanvas`, ни второго WebGL-контекста. `HeroScene`
не тронут — остаётся у hero Главной. `DrawerScene` теперь принимает
`width` и `height` (панель).

### 2.3 `HomeDrawer.tsx`

- `<DrawerScene width={panelWidth} height={panelHeight} />`.
- Панель: фон `bottom`, тень `--nav-shadow` (`panelShadow .10`, r30, y10).
- Backdrop: `rgba(20,22,34,.30)` + `blur(16px) saturate(140%)` (было
  pine-teal `.34` + `blur(6px)`). Finance дополнительно размывает и
  уменьшает саму Главную (`body.drawer-open .app{filter:blur(6px)
  brightness(.92);transform:scale(.98)}`) — это экран за шторкой, вне
  скоупа задачи; не переносилось.
- `content`: `paddingHorizontal 16`, `gap 12` (`.drawer-group{margin:12px
  16px 0}`).
- ×: 44×44, стекло `glass` + кромка 1 px `glassBorder` (как `.dh-theme`),
  иконка `ink`; `CLOSE_BTN_SPACE 46`.

### 2.4 `ProfileSummary.tsx` — `.drawer-head` + вехи

- Шапка = `.drawer-head`: аватар **50 px в кольце 2 px `glassBorder`** с
  тенью карточки (`avatarRing`), имя `17/700 ink`, `letterSpacing −.2`,
  `lineHeight 20`; «Личный профиль» `13/500 ink2`; `gap 12`, `padding 6
  4/2`, `radius 18`, pressed — `glass`; шеврон `›` 16 px `chevron`
  (`.dh-chev`) перед зоной ×.
- Вехи — в зоне `.drawer-balance` (`margin 4px 16px 8px`): строки прямо
  на сцене без карточки; `paddingVertical 12`, `minHeight 52`; между
  строками 1 px `sep`; teal-точка; название `15.5/500 ink`; дата
  `15.5/700 ink tabular-nums`; срок `12.5/500 ink2`. `wrap.gap 10`,
  `paddingBottom 8`.

### 2.5 `DrawerGroup.tsx` = `.drawer-card` / `.drawer-group-title`

Карточка: `glass`, **1 px `glassBorder`**, `radius 22`, `overflow hidden`,
`blur(14px)` на web, тень `--tx-card-shadow` (`cardShadow .05`, r10, y2,
`elevation 1`). Заголовок: `12/600 ink2` uppercase, `letterSpacing .36`
(= .03 em), `paddingHorizontal 14`, зазор 6.

### 2.6 `ProfileSettingsRow.tsx` (вариант `drawer`) = `.drawer-row`

`minHeight 56`, `padding 8/16`, `gap 14`; название `16.5/600 ink`,
`letterSpacing −.15`; иконка — слот 30, контур 22 px, `opacity .78`;
шеврон 16 px `chevron`; pressed — `glass`. Разделитель `.drawer-sep` —
1 px `sep` с отступом слева 60 px: рисуется отдельной абсолютной полоской
`sepDrawer` (`testID="drawer-row-sep"`) внизу строки, не `borderBottom`
(у border нет отступа). Вариант `card` не тронут; `DRAWER_CHEVRON` удалён.

### 2.7 `DrawerFooter.tsx`, `BackupSection.tsx`

Цвета drawer-варианта (`ink2`, разделитель 1 px `sep`). Логика — как была.

### 2.8 Тесты

- `ProfileSummary.test.tsx` — 3 теста переписаны: холодные inks шапки
  (имя ≥ 20/600, подпись ink2, шеврон `›` в конце строки); блок вех **без** `backgroundColor` /
  `border*` / `borderRadius` / `shadow` / `elevation`, hairline только
  `borderTop` у 2-й и 3-й строк, `paddingVertical ≥ 12`; срок — `ink2`.
- `HomeDrawer.test.tsx` — сцена: `drawer-scene` есть, `hero-scene`
  **нет**, `HeroCanvas` нет, фон панели `DRAWER_ICE.base`.
- Новые `DrawerScene.test.tsx` (6) и `DrawerGroup.test.tsx` (2): слой —
  абсолютный, размером с панель, `pointerEvents none`; stops `top /
  bottom(0.58) / bottom`; три эллипса ровно в геометрии Finance
  (`0,92,80,36` / `100,62,90,40` / `50,10,120,50`), пики `.5/.55/.55`,
  затухание на `0.6`; blob'ы — `skyBlobGeometry`/`blueBlobGeometry`
  (min(130vw,460) / min(110vw,400), позиции), пики `.72/.52`, затухание
  `0.64`; дрейф — два `Animated.loop`, под reduced-motion — ни одного;
  ни одного цвета зелёной hero-палитры, ни одного canvas; карточка группы
  — `glass` + 1 px `glassBorder` + radius 22 + `cardShadow .05`.
  Fake timers + unmount, чтобы 22/27-секундные циклы не держали worker.
- `tokens.test.ts` — `DRAWER_ICE`: значения Finance light verbatim
  (`#dbeafe`, `#eef2f8`, b1–b4, glow, glass); `ink` ≥ 8:1 везде включая
  центр sky-blob'а; `ink2` ≥ 4.5:1 на земле / стекле поверх любого пятна /
  cyan и бирюзе, ≥ 3:1 и лучше Finance `--muted` в центре sky/blue;
  все тона на cyan→blue стороне (hue ≥ 170°), верх ≥ 30° холоднее
  `MINISTRY.heroTop`; `ministryCssVars()` его не подхватывает.

### 2.9 Файлы

| Файл | Что |
|---|---|
| `src/components/profile/ProfileHeroCard.tsx`, `…/__tests__/ProfileHeroCard.test.tsx`, `src/components/dashboard/index.ts` | **откат** к `71d6c1b` |
| `src/components/dashboard/tokens.ts` | `PROFILE_ICE` удалён (откат), `DRAWER_ICE` добавлен |
| `src/components/drawer/DrawerScene.tsx` | новый фон панели |
| `src/components/drawer/HomeDrawer.tsx` | сцена, фон, ×, отступы |
| `src/components/profile/ProfileSummary.tsx` | шапка + вехи без карточки |
| `src/components/drawer/DrawerGroup.tsx` | группы без рамки/тени |
| `src/components/profile/ProfileSettingsRow.tsx` | drawer-вариант на `DRAWER_ICE` |
| `src/components/drawer/DrawerFooter.tsx`, `src/components/settings/BackupSection.tsx` | drawer-цвета |
| тесты: `ProfileSummary`, `HomeDrawer`, `DrawerScene` (new), `DrawerGroup` (new), `tokens` | см. §2.8 |
| `docs/TASKS/TASK_076_…md`, `docs/TASKS/TASK_077_…md`, `docs/STATUS.md`, `docs/ARCHITECTURE.md` | документация |

## 3. Проверки (выполнены)

- `npx tsc --noEmit` — чисто; `npx jest` — **88/88 suites, 1320/1320**
  (было 86/1309: +2 suites, +11 tests); `npx expo export --platform web`
  — собирается; `git diff --check` / `git diff --cached --check` — чисто.
- Вторая итерация (свет Finance), браузер 375 px: `transform` обоих
  blob'ов меняется между двумя замерами с интервалом 2.5 с (дрейф идёт);
  backdrop `blur(16px) saturate(1.4)`; `canvas` в панели — 0; консоль без
  ошибок; внизу шторки — бирюзовое пятно слева, cyan — справа на середине,
  небесно-синий blob за шапкой, синий — у правого края, как в Finance.
- Production (`adar4026.github.io`, свежая изолированная вкладка, 375 px):
  загружен `entry-de8ef887…` (= локальная сборка, `gh-pages` `bf425b3`);
  `drawer-scene` есть / `hero-scene` нет / `canvas` 0; blob'ы дрейфуют;
  группы `rgba(255,255,255,.55)` + `1px rgba(255,255,255,.75)`; 8
  `drawer-row-sep`; шеврон шапки; `scrollWidth 375`; `/profile` — прежняя
  белая карточка (ice-blue TASK_076 отсутствует); консоль чиста.
- Браузер (dev-сервер, Chromium), Главная → ☰, профиль A-Lex +
  Крещение 28-06-2015 / Пионер 10-03-2018 / Хихон 01-09-2021:
  - **390 px** (панель 335): `drawer-scene` есть, `hero-scene` в панели
    нет, `canvas` в панели 0; фон панели `rgb(244,247,248)`; блок вех —
    `background transparent`, `border 0`, `radius 0`, `left 20 / right
    315`; строки 64 / 65 / 65 px, `borderTop 1px` только у 2-й и 3-й,
    `borderBottom 0` у всех; карточки групп `rgba(255,255,255,0.58)`,
    `border 0`, `box-shadow none`, `radius 20`, `left 16 / right 319`;
    `scrollWidth === innerWidth === 390`; консоль без ошибок.
  - Тап по шапке / «Личные данные» открывает `ProfileEditSheet` поверх
    шторки (шторка остаётся под ним); × редактора закрывает только
    редактор; × шторки закрывает шторку.
  - **320 px** (панель 275): «Личный профиль» в одну строку (`right 209`
    при × `left 215`), даты в одной правой колонке (`right 247`),
    `scrollWidth === 320`, консоль без ошибок.
  - `/profile` — прежняя белая карточка с тремя колонками и капс-подписями
    (вид до TASK_076), консоль без ошибок.

## 4. Не входит

Страница `/profile` (кроме отката), редактор профиля, модель данных,
маршруты, нижняя навигация, Главная и её `HeroScene`, backdrop шторки,
финансовые пункты LexMoney (не переносились).

## 5. Architecture Review Checklist (ADR-007)

- [x] Нет новых зависимостей; `package.json` не менялся.
- [x] Модель данных и ключи AsyncStorage не менялись; `profile.events`,
      `saveProfile`, `ProfileEditSheet`, лимит 3 записи — как были.
- [x] Один источник данных: `useStore().profile` → `ProfileSummary`
      (без локальных копий), как в TASK_066/072.
- [x] Навигация / состав пунктов / `profileMenu.ts` / `activateMenuItem`
      — без изменений; `HomeDrawer` логика (анимация, свайп, Escape,
      `rendered`) не тронута — только стили и слой сцены.
- [x] Токены: `DRAWER_ICE` — отдельный кластер вне `MINISTRY` по
      прецеденту `NAV` / `FIGURE_GLASS`; `MINISTRY` (hue/contrast-тесты,
      шейдер, `ministryCssVars()`) не менялся; `PROFILE_ICE` (ошибочный
      one-off TASK_076) удалён; никакого дублирования hex в компонентах.
- [x] Доступность: `accessibilityLabel` строк вех, шапки, ×, групп
      (`header`) — прежние; × — 44×44; `ink` ≥ 12:1, `ink2` ≥ 4.5:1 на
      каждом тоне сцены (тест); маркер `importantForAccessibility="no"`.
- [x] Производительность: сцена — SVG, без второго WebGL-контекста (тест
      на отсутствие `HeroCanvas`/`canvas` в панели).
- [x] Мёртвый код убран: `PROFILE_ICE`, `DRAWER_CHEVRON`, импорт
      `HeroScene`/`MINISTRY` из `HomeDrawer`, `MINISTRY` из
      `DrawerGroup`/`DrawerFooter`/`BackupSection`.
- [x] Regression: +8 тестов, 3 переписаны, 1 обновлён (см. §2.8);
      старые 17 тестов `ProfileHeroCard` снова зелёные после отката.
- [x] Commit (`4860a90`, `8cdc049`) → push → deploy (`gh-pages` `bf425b3`)
      → production проверен (см. §3).
- [ ] Живая проверка на iPhone (PWA standalone) — post-deploy шаг владельца.
