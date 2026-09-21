# TASK_081 — Раздел «Статистика служения»: год, месяцы, динамика, за всё время

**Дата:** 21 сентября 2026
**Статус:** Implemented / deployed / production verified. Закоммичено
(`2690561`), запушено в `origin/main`, задеплоено на GitHub Pages
(`gh-pages` `4f4c382`), проверено на production (см. §5б).
**Скоуп:** пункт «Статистика» в шторке Профиля (группа СЛУЖЕНИЕ) и на
странице Профиля перестаёт быть заглушкой и открывает новый полноэкранный
раздел `/statistics` (root-Stack, как `/participation` и `/appearance`) с
детализацией месяца `/statistics/month/[key]`. Модель данных, ключи
AsyncStorage, `StoreContext`, календарь `/hours/history`, статистика по
служебному году `/hours/stats` — **не меняются**.

---

## 1. Принцип

Статистика — производное представление уже существующих данных, без
собственного хранилища. Источник — `records` (`HourRecord[]`,
`mj_records_v1`: легаси-итоги за месяц, часы без разбивки по дням) и
`sessions` (`Session[]`, `mj_sessions_v1`: `date: "YYYY-MM-DD"` — локальный
день строкой, `durationMinutes` — целые минуты). Правило агрегации —
единственный примитив `monthTotal()` (`src/data/stats.ts`, TASK_005 §7–8):
если в месяце есть хотя бы одна `Session`, месяц считается только по
сессиям; иначе — по `HourRecord`. `creditHours` (зачёт) в итоги не
входит, как и везде в приложении.

Раздел строится по **календарному году** (Январь–Декабрь, как в ТЗ
владельца). Существующая статистика по *служебному* году (Сен–Авг) в
`/hours/stats` остаётся без изменений.

## 2. Домен — `src/data/serviceStats.ts`

Чистые функции, без React и без стора. Все длительности — в **минутах**
(целые), в часы переводятся только при форматировании.

- `buildServiceStatsIndex(records, sessions)` — один проход по обеим
  коллекциям → `Map<"YYYY-MM", MonthBucket>`, где `MonthBucket = { year,
  month, minutes, source: "session" | "legacy", days: Map<"YYYY-MM-DD",
  minutes> }` (`days` пуст у легаси-месяца — у него нет разбивки по дням).
  Session-first: месяц с сессиями игнорирует свой `HourRecord`. Легаси
  `hours` → `Math.round(hours * 60)`. Строится один раз на изменение
  данных (`useMemo` на экране) — переключение года его не пересчитывает.
- `yearStats(index, year)` → `{ year, totalMinutes, months[12]:
  { month, minutes, activeDays, source | "none" }, monthsWithData,
  averagePerMonthMinutes, activeDays, busiestMonth | null, hasData }`.
  **Среднее = итог / число месяцев с записями** — пустые и будущие месяцы
  среднее не искажают (ТЗ §4, §12). `activeDays` — число различных дат
  сессий за год (легаси-месяцы дней не знают и в счёт не входят).
- `yearComparison(index, year)` → `{ year, minutes, prevYear, prevMinutes,
  deltaMinutes, deltaPercent | null } | null` — `null`, если у предыдущего
  года нет данных (блок не показывается). Формулировки нейтральные.
- `lifetimeStats(index)` → `{ totalMinutes, firstDate | null, yearsWithData,
  activeDays, averagePerMonthMinutes, busiestMonth | null, years:
  [{ year, minutes }] по убыванию года, hasData }`. `firstDate` — самая
  ранняя дата сессии или первое число самого раннего легаси-месяца.
- `monthDetail(index, year, month)` → `{ year, month, totalMinutes,
  activeDays, averagePerActiveDayMinutes, source, days: [{ date, minutes }]
  по возрастанию даты }`.
- `availableYears(index)` — годы с данными по возрастанию;
  `yearSwitcherBounds(index, now)` — `{ min, max }` для стрелок: от
  самого раннего года с данными до текущего (в будущее листать нельзя).
- `formatStatMinutes(minutes)` — «37 ч 30 м» / «52 ч» / «0 ч» на базе
  `formatHM()` (утверждённый формат Ministry), плюс группировка тысяч
  неразрывным пробелом («1 842 ч 15 м») — единственное отличие, нужное только
  здесь. `durationPairs(minutes)` — `[["1 842","ч"],["15","м"]]` для
  hero-цифры (число крупнее, единица меньше — как `GlassFigure` на
  Главной).

Даты: только строковые `slice`/`split` по `"YYYY-MM-DD"`, ни одного
`new Date()` при группировке — запись 31 декабря 23:50 никогда не уедет в
соседний год.

## 3. UI

Маршруты (root `Stack`, `headerShown: false`):
- `app/statistics/index.tsx` — «Статистика». Шапка `‹ Статистика`
  (`BackButton fallbackHref="/"`), фон `HomeBackground` + `DS.homeBase`.
  Порядок блоков — ровно ТЗ §23: переключатель периода → hero → «Кратко»
  → «Динамика» → «По месяцам» → «Сравнение» → «За всё время ›».
  Режим «За всё время»: hero «Всего служения» + факты (первая запись, лет
  с данными, дней служения, среднее в месяц, самый активный месяц) +
  «По годам» (тап по году → статистика года).
  Empty state (год без записей): «Пока нет статистики» + «Открыть
  календарь» → `/hours/history`.
- `app/statistics/month/[key].tsx` — «Март 2026»: Всего / Дней служения /
  Среднее за день служения + список дней; тап по дню → существующая
  логика календаря (`/entry?id=` для одной сессии, выбор сессии через
  `Modal` для нескольких — как в `/hours/history`). Легаси-месяц: подпись
  «Сохранён месячный итог без разбивки по дням» + строка → `/hours/month/[key]`.

Компоненты — `src/components/statistics/`: `YearSwitcher`, `StatsHero`,
`StatTiles`, `YearTrendChart` (react-native-svg: плавная линия, точки,
мягкая заливка, tap по колонке месяца → «Март · 52 ч 30 м»), `BarRows`
(строки месяцев / годов / дней с полосой доли от максимума), `FactRows`,
`YearComparisonCard`, `StatsEmptyState`, общий `StatsCard`. Цвета —
только `DS` / `MINISTRY` (live light/dark), график — `MINISTRY.accent` и
его прозрачные состояния, ни одного hex-литерала.

`profileMenu.ts`: у `stats` появляется `href: "/statistics"` — шторка
закрывается и открывает экран (тот же путь, что у «Оформление»).

## 4. Тесты

- `src/data/__tests__/serviceStats.test.ts` — одна запись; несколько
  сессий одного дня; несколько месяцев; несколько лет; год без записей;
  неполный текущий год (среднее по месяцам с данными); часы + минуты;
  31 декабря → 1 января; total/average/activeDays; lifetime; сравнение с
  предыдущим годом (есть/нет); Session-first при наличии легаси-записи;
  форматирование тысяч.
- `app/statistics/__tests__/statisticsScreen.test.tsx` — заголовок,
  назад (`BackButton`), стрелки года, empty state → `/hours/history`,
  тап по месяцу → `/statistics/month/YYYY-MM`, «За всё время» → «По
  годам» → тап по году.
- `app/statistics/__tests__/monthScreen.test.tsx` — сводка и список дней,
  тап по дню с одной сессией → `/entry?id=`.
- Правки существующих тестов, где «Статистика» ожидалась заглушкой.

## 5. Проверки

`npx tsc --noEmit`, `npx jest`, `npx expo export --platform web`,
`git diff --check`, визуальная проверка в браузере (320 / 390 / 430 px,
light + dark, консоль без ошибок), затем commit → push → deploy →
проверка production.

## 5а. Проверки (выполнены)

- `npx tsc --noEmit` — чисто.
- `npx jest` — **94/94 suites, 1376/1376 tests** (было 91/1335 на
  TASK_080; +3 suites, +41 tests: `serviceStats.test.ts` — 26,
  `statisticsScreen.test.tsx` — 11, `monthScreen.test.tsx` — 4; два
  существующих теста (`profileMenu.test.ts`, `profile.test.tsx`)
  переведены с ожидания заглушки на `href: "/statistics"`).
  Предупреждение jest «A worker process has failed to exit gracefully»
  воспроизводится и без новых тестов (проверено прогоном с
  `--testPathIgnorePatterns app/statistics serviceStats`) — не связано с
  задачей.
- `npx expo export --platform web` — собирается; `git diff --check` — чист.
- Браузер (dev-сервер `expo start --web`), **отдельный origin
  `127.0.0.1:8082`** с синтетическими данными (198 сессий + 17
  легаси-записей за 2023–2026, несколько сессий в один день, шов
  31.12→01.01, легаси-запись, перекрытая сессиями, `creditHours`) — данные
  на `localhost:8082` не трогались, тестовый origin очищен после проверки:
  - 390 px light / 320 px dark / 430 px light: hero «302 ч 35 м»,
    «Среднее 37 ч 49 м / месяц» (8 месяцев с данными, не /12); «Кратко»
    2×2; «Динамика» — линия не уходит ниже оси на пустом июне (кламп
    контрольных точек), подписи Янв…Дек не слипаются на 320 px (кегль 8);
    тап по колонке месяца меняет подпись «Май · 48 ч»; «По месяцам» —
    12 строк, пустые «—» без трека; «Сравнение» `2026 / 2025`,
    «−118 ч 55 м −28,2 %»; «За всё время ›».
  - «За всё время»: hero «1 709 ч 5 м» и «1 714 ч 45 м» (шесть цифр —
    компактный кегль) помещаются в карточку на 320 px (замер
    `getBoundingClientRect`: 211 из 248 px); «Первая запись: Сентябрь
    2023» (легаси-месяц — без выдуманного дня); «По годам» 2026 → 2023,
    тап по 2024 → год 2024 (легаси: «нет разбивки по дням», «месячный
    итог» в строках, 12 из 12).
  - `/statistics/month/2026-03`: «54 ч 15 м», 18 дней, «3 ч 1 м» в
    среднем, список дней; тап по дню с двумя сессиями → `Modal` выбора
    (1:00 / 0:45) → `/entry?id=…` открыл существующий редактор.
  - Главная → ☰ → Статистика → `/statistics` (шторка закрылась) →
    «Назад» → `/` (Главная).
  - `scrollWidth === innerWidth` на 320/390/430; консоль: новых ошибок
    нет (единственные записи — 404 dev-сервера на deep-link `/statistics`
    при прямом заходе, как и у `/participation`; на production их
    закрывает SPA-fallback). Первая версия hit-зон графика (`onPress` на
    SVG `Rect`) сыпала в консоль «Unknown event handler property
    onResponder…» на web — заменена на `Pressable`-колонки поверх SVG.

## 5б. Production

Закоммичено `2690561` (`main`, было `e1604f2`; 21 файл, +2449/−6),
запушено в `origin/main`. Задеплоено на GitHub Pages: `gh-pages`
`4f4c382` (было `b63a0dc`), бандл `entry-12b070190678d2a8aa0933d79935bb7a.js`
— хэш идентичен между `npx expo export` локально и ответом
`adar4026.github.io` (вторая попытка опроса `curl … ?nocache=` после ~20 с
CDN-задержки; первая ещё отдавала старый `entry-73082e35…`). Изолированная
вкладка браузера фактически загрузила именно этот `entry-*.js`
(`document.scripts`). Проверено на production (390 px): deep-link
`/Ministry/statistics/` открывается через SPA-fallback (единственная
запись консоли — ожидаемый 404 самого fallback, как у всех deep-link'ов);
на этом origin записей нет → корректный empty state «Пока нет
статистики» + «Открыть календарь» → `/Ministry/hours/history`; Главная →
☰ → «Статистика» → `/Ministry/statistics`, шторка закрылась,
`stats-period` на месте. Полная проверка с данными (годы, месяцы, график,
сравнение, месяц → день → редактор) выполнена на dev-сервере (§5а) —
production отдаёт тот же бандл побайтно (хэш). Ожидает проверки владельца
на iPhone (PWA) с реальными записями.

## 6. Architecture Review Checklist (ADR-007)

- [x] Нет новых зависимостей; `package.json` не менялся
      (`react-native-svg` уже был).
- [x] Данные, ключи AsyncStorage, `StoreContext` — не менялись; нет
      второго хранилища статистики; миграции нет и не требуется.
- [x] Агрегация — только через `monthTotal()`-правило (Session-first);
      расчёты вынесены в чистый модуль `serviceStats.ts`, UI не считает
      сам (индекс мемоизирован по `records`/`sessions`).
- [x] Цвета — только live-токены `DS`/`MINISTRY`; light/dark проверены.
- [x] Календарь и редактор записей не дублируются — навигация ведёт в
      существующие `/hours/history`, `/entry`, `/hours/month/[key]`.
- [x] `/hours/stats` (служебный год) и `/hours/history` не менялись.
