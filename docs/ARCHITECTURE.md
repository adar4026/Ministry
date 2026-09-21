# ARCHITECTURE — Ministry

## Стек

| Слой | Технология | Статус |
|------|-----------|--------|
| Платформа | Expo (React Native), SDK 54 | Есть |
| Навигация | expo-router | Есть |
| Хранилище | AsyncStorage | Есть |
| Исходный прототип | React + localStorage (`prototype/`) | Удалён (TASK_009) |
| Язык | TypeScript | Есть |

---

## Структура папок (актуальная)

```
ministry/
├── app/                        # expo-router screens
│   ├── (tabs)/
│   │   ├── index.tsx           # Главная (TASK_007)
│   │   ├── hours/              # Модуль «Часы» (TASK_005D)
│   │   │   ├── _layout.tsx     # Вложенный Stack-навигатор
│   │   │   ├── index.tsx       # Hours Dashboard
│   │   │   ├── entry.tsx       # Manual Entry (Session)
│   │   │   ├── history.tsx     # История сессий
│   │   │   ├── timer.tsx       # Ministry Timer (TASK_005C)
│   │   │   ├── stats/          # Статистика: обзор + месяц + год (TASK_061)
│   │   │   │   ├── index.tsx   # Обзор: две карточки без графиков
│   │   │   │   ├── month/[key].tsx  # «Статистика за месяц»
│   │   │   │   └── year/[key].tsx   # «Статистика за служебный год»
│   │   │   └── month/[key].tsx # Детали месяца
│   │   ├── add.tsx             # Добавить
│   │   ├── timeline.tsx        # События (вкл. публичные речи)
│   │   ├── profile.tsx         # Профиль (содержимое продублировано в HomeDrawer, TASK_066)
│   │   └── _layout.tsx         # Tab navigator (5 вкладок)
│   ├── settings.tsx            # «Настройки»: режим служения + цель часов (TASK_073)
│   ├── appearance.tsx          # «Оформление»: тема light / dark / system (TASK_078)
│   ├── participation/          # Статистика участия возвещателя (TASK_073)
│   │   ├── index.tsx           # Месяцы → дни служения
│   │   └── [key].tsx           # Месяц: календарь + отметки
│   ├── statistics/             # «Статистика служения» из шторки Профиля (TASK_081)
│   │   ├── index.tsx           # Год (‹ 2026 ›) / За всё время: hero, Кратко, Динамика, По месяцам, Сравнение
│   │   └── month/[key].tsx     # Месяц: итог, дни служения → /entry
│   ├── notifications.tsx       # «Уведомления» — заглушка «Скоро появится» (TASK_060)
│   ├── upcoming-events.tsx     # Ближайшие события (TASK_019)
│   ├── service.tsx             # Легаси-маршрут: redirect к /hours
│   └── _layout.tsx             # Root layout
│
├── src/
│   ├── data/
│   │   ├── seed.js / seed.ts   # Пустые массивы для первого запуска (TASK_009)
│   │   ├── constants.ts        # Цвета, хелперы, агрегация (Session-first)
│   │   ├── stats.ts            # Чистые функции статистики (TASK_005E)
│   │   ├── periodStats.ts      # Сводки периода (TASK_037)
│   │   ├── periodChart.ts      # Дневные ряды и шкалы графиков (TASK_061)
│   │   ├── serviceStats.ts     # Индекс + чистые расчёты «Статистики» по календарным годам (TASK_081)
│   │   ├── timer.ts            # Чистые функции таймера (TASK_005C)
│   │   ├── ministryMode.ts     # Режим служения / настройки: fallback, цель (TASK_073)
│   │   ├── participation.ts    # Участие: уникальность по дате, месяцы (TASK_073)
│   │   ├── backup.ts           # Формат копии v2 (.json), валидация, миграция (TASK_064)
│   │   ├── backupImport.ts     # Восстановление: страховка, откат (TASK_062)
│   │   ├── backupFile(.web).ts # Сохранение/выбор файла по платформам
│   │   ├── appInfo.ts          # APP_VERSION / имя / дата обновления — один источник (TASK_066)
│   │   └── sha256.ts           # SHA-256 + канонический JSON (TASK_062)
│   │
│   ├── store/
│   │   └── StoreContext.tsx    # Global state (Context API)
│   │
│   ├── theme/                  # Цветовая тема (TASK_078)
│   │   ├── scheme.ts           # Реестр активной схемы, live(light, dark), resolveScheme
│   │   ├── ThemeProvider.tsx   # ThemeProvider / useTheme / useThemedStyles, data-theme на web
│   │   └── index.ts
│   │
│   ├── hooks/
│   │   ├── useStorage.ts       # AsyncStorage wrapper
│   │   └── useTimer.ts         # Жизненный цикл mj_timer_v1
│   │
│   ├── components/             # Переиспользуемые компоненты
│   │   ├── dashboard/          # Компоненты Главной (TASK_007)
│   │   │   ├── tokens.ts       # DS + MINISTRY (палитра, TASK_065) + NAV + FIGURE_GLASS (TASK_071) + ministryCssVars()
│   │   │   ├── HeroScene.tsx   # Фон hero: SVG-fallback + HeroCanvas (TASK_065)
│   │   │   ├── HeroCanvas(.web).tsx  # WebGL «жидкий шёлк», шейдер LexCar 1:1 (TASK_069) / native no-op
│   │   │   ├── HomeHero.tsx    # Контент hero по режиму (TASK_073): часы (pioneer) / PublisherHero
│   │   │   ├── heroFigure.tsx  # GlassFigure + общие стили hero (TASK_071 → TASK_073)
│   │   │   ├── PublisherHero.tsx            # Дни участия + мини-календарь (TASK_073)
│   │   │   └── ParticipationMiniCalendar.tsx
│   │   ├── participation/      # ParticipationSheet (bottom sheet), ParticipationJournal, ParticipationRow (TASK_073)
│   │   ├── drawer/             # Боковая шторка Главной (TASK_066)
│   │   │   ├── HomeDrawer.tsx  # RNModal + Animated + PanResponder, контент Профиля
│   │   │   ├── DrawerScene.tsx # Свет шторки Finance: SVG-слои + 2 дрейфующих blob'а (TASK_077)
│   │   │   ├── DrawerGroup.tsx # Заголовок группы + полупрозрачная поверхность
│   │   │   └── DrawerFooter.tsx# «A-Lex Ministry · vX.Y.Z / Обновлено: …»
│   │   ├── profile/            # ProfileHeroCard, ProfileEditSheet, ProfileSummary,
│   │   │                       #   ProfileSettingsRow (+ ProfileRowVariantContext), profileMenu.ts
│   │   ├── forms/              # RecordForm, SessionForm, EventForm, TalkForm
│   │   ├── stats/              # Карточки и график статистики служебного года (TASK_061)
│   │   ├── statistics/         # Раздел «Статистика» (TASK_081): YearSwitcher, StatsHero, StatTiles,
│   │   │                       #   YearTrendChart (SVG), BarRows, FactRows, YearComparisonCard, StatsEmptyState
│   │   ├── TabBar.tsx          # Нижняя навигация: floating glass capsule, pill, drag, «＋» (TASK_067)
│   │   ├── HeatMap.tsx · MonthHeader.tsx · SessionRow.tsx · …
│   │   └── TodayCard.tsx
│   │
│   └── types/
│       └── index.ts            # TypeScript типы
│
├── docs/                       # ARCHITECTURE · STATUS · DECISIONS ·
│                               #   ADR/ · TASKS/ · AI_INFRASTRUCTURE.md
└── package.json
```

---

## Модели данных

### Record (запись часов)
```typescript
type Record = {
  id:     string;   // уникальный ID
  year:   number;   // календарный год
  month:  number;   // 1–12
  hours:  number;   // часов за месяц
  note:   string;   // заметка (необязательно)
}
```

### Event (событие)
```typescript
type Event = {
  id:       string;
  date:     string;   // ISO: "2026-06-28"
  title:    string;
  category: 'pioneer' | 'appointment' | 'move' | 'school' | 'personal' | 'other';
}
```

### Talk (публичная речь)
```typescript
type Talk = {
  id:       string;
  date:     string;         // ISO: "2026-06-28"
  number:   number | null;  // номер речи (null = специальная)
  title:    string;         // название речи
  location: string;         // место / собрание
}
```

### Session (запись времени, TASK_005A)

Основная сущность учёта времени, начиная с TASK_005. Гранулярная запись —
в отличие от Record (итог за месяц). Подробности правила агрегации —
см. `docs/TASKS/TASK_005_ARCHITECTURE.md` §6–§8.

```typescript
type Session = {
  id:              string;
  date:            string;   // ISO-день "YYYY-MM-DD"
  startTime?:      string;   // ISO datetime; обязателен при source === "timer"
  endTime?:        string;   // ISO datetime; обязателен при source === "timer"
  durationMinutes: number;   // авторитетная длительность; всегда обязателен
  note?:           string;
  source:          'manual' | 'timer';
  createdAt:       string;   // ISO datetime
  updatedAt:       string;   // ISO datetime
}
```

---

### MinistrySettings / ServiceParticipation (TASK_073)

```typescript
type MinistryMode = "publisher" | "pioneer" | "specialPioneer";
type MinistrySettings = {
  ministryMode:    MinistryMode;   // отсутствует в старых данных → "pioneer"
  monthlyHourGoal: number | null;  // отсутствует → 50 (= бывшая константа MONTHLY_GOAL); null = цель не задана
};
type ServiceParticipation = {
  id:           string;
  date:         string;  // "YYYY-MM-DD" — уникальна; счётчики считают только различные даты
  participated: true;
  createdAt:    string;
  updatedAt:    string;
};
```

`pioneer` и `specialPioneer` — один часовой механизм (цель, прогресс,
таймер), различаются только сохранённым режимом. `publisher` — отдельная
главная метрика (участие). Часы и участие никогда не конвертируются друг
в друга; переключение режима меняет только presentation layer. Служебная
годовая цель = `monthlyHourGoal × 12` (`yearlyGoalFor`), `MONTHLY_GOAL` /
`YEARLY_GOAL` остались значениями по умолчанию. `monthProgress()` принимает
`goal` четвёртым параметром (по умолчанию — прежняя константа).

---

## Ключи хранилища (AsyncStorage)

```
mj_records_v1            — массив Record[]
mj_events_v1             — массив Event[]
mj_talks_v1              — массив Talk[]
mj_sessions_v1           — массив Session[]        (TASK_005A)
mj_timer_v1              — TimerState              (TASK_005C)
mj_profile_v1            — UserProfile             (TASK_042)
mj_custom_categories_v1  — CustomCategory[]        (TASK_045)
mj_settings_v1           — MinistrySettings        (TASK_073; seed {pioneer, 50}; TASK_078 + theme: "system"; normalizeMinistrySettings())
mj_participation_v1      — ServiceParticipation[]  (TASK_073; seed [])
mj_backup_safety_v1      — страховочная копия данных     (TASK_062)
mj_last_backup_v1        — ISO-дата последней копии      (TASK_062)
```

> ⚠️ При изменении схемы данных — менять версию ключа (v1 → v2) и писать миграцию.

---

## Seed-данные и приватность (TASK_009)

- `src/data/seed.js` — канонический источник первого запуска. `SEED_RECORDS`,
  `SEED_EVENTS`, `SEED_TALKS` — пустые массивы (`[]`) с TASK_009; ни один
  публичный seed/source файл не содержит личных данных пользователя.
- `src/data/seed.ts` остаётся типизированной точкой входа без изменений —
  импортирует те же три коллекции из `seed.js` и приводит их к типам
  `HourRecord[]` / `MinistryEvent[]` / `Talk[]`; ни один потребитель
  (`StoreContext.tsx`) не менялся.
- После гидратации авторитетным источником данных является AsyncStorage
  устройства (`usePersistentState`, `src/hooks/useStorage.ts`): пустой seed
  используется только при полном отсутствии сохранённого значения по
  ключу (первый запуск), и никогда не перезаписывает уже существующие
  данные — ни ключ хранения, ни эта гарантия не изменились.
- Архивный прототип `prototype/App.jsx` удалён из отслеживаемого дерева
  (TASK_009) — не имел активных импортов и дублировал те же личные
  маркеры, что и `seed.js`. Верифицированная приватная резервная копия
  личных данных (включая расхождение прототипа для события `e21`) хранится
  вне репозитория.
- Исторические коммиты Git всё ещё содержат прежнее (непустое) содержимое
  `seed.js` и файл `prototype/App.jsx` — TASK_009 не переписывает историю
  Git; это отдельная, ещё не одобренная задача.

---

## Логика служебного года

Служебный год начинается в сентябре:
- Сентябрь 2025 – Август 2026 → "2025–2026"
- Январь 2026 относится к году "2025–2026"

```typescript
function serviceYear(year: number, month: number): string {
  return month >= 9
    ? `${year}–${year + 1}`
    : `${year - 1}–${year}`;
}
```

---

## Состояние (State)

Единый глобальный стор через React Context:

```
StoreContext
├── records:  Record[]
├── events:   Event[]
├── talks:    Talk[]
├── sessions: Session[]   (TASK_005A)
├── settings: MinistrySettings           (TASK_073)
├── participation: ServiceParticipation[] (TASK_073)
├── loaded:   boolean
├── saveRecord  / deleteRecord
├── saveEvent   / deleteEvent
├── saveTalk    / deleteTalk
├── saveSession / deleteSession   (TASK_005A)
├── setMinistryMode / setMonthlyHourGoal                              (TASK_073)
└── markParticipation / updateParticipationDate / deleteParticipation (TASK_073)
```

Правила участия живут в сторе, не только в UI: повторная отметка той же
даты — no-op (`{ ok: true, created: false }`), будущая дата —
`{ ok: false, error: "future" }`, перенос на уже отмеченный день —
`"duplicate"`.

Все экраны читают из стора через `useStore()`. Никакого локального состояния для данных.

---

## Резервные копии (TASK_013 → TASK_062 → TASK_064)

Формат копии — `ministry-backup` версии 2. Единственный файл, который
пишет приложение: `ministry-backup-YYYY-MM-DD-HHmm.json`, MIME
`application/json`, с отступами. Расширение `.mfb` (TASK_062) больше не
создаётся: целостности оно не добавляло — контрольная сумма лежит внутри
файла, — зато на iPhone показывалось как неизвестный документ.
Дублирующее действие «Экспорт данных» удалено (TASK_064): оно писало ту
же полезную нагрузку под другим именем.

Копия содержит все шесть коллекций приложения (`records`, `events`,
`talks`, `sessions`, а также `customCategories` и `profile`), точные
счётчики и SHA-256 контрольную сумму всего содержимого, кроме самого поля
`checksum`. Сумма считается по каноническому JSON (сортировка ключей, без
пробелов), поэтому не зависит от форматирования файла. Объявленные
`counts` сверяются с фактическим содержимым: у v2 расхождение —
критическая ошибка, у v1 — примечание.

Формат распознаётся **по содержимому, а не по расширению**. Читаются и
восстанавливаются: новые `.json` (v2), уже созданные `.mfb` (v2) и старые
`.json` версии 1 (TASK_013, четыре коллекции, без checksum — её
отсутствие повреждением не считается). Тем событий и профиля в v1 нет,
поэтому восстановление v1-копии эти два ключа на устройстве не трогает.
Файловый выбор принимает `.json,.mfb,application/json,application/octet-stream`.

Валидация поэлементная и **именующая**: сущность, номер, id, поле,
причина. Общей формулировки «файл содержит повреждённые записи» нет.
Восстановление: снимок → страховочная копия в `mj_backup_safety_v1` →
запись → сверка байтов и счётчиков → применение к `StoreContext` → откат
при любой ошибке. Подробности —
`docs/TASKS/TASK_064_BACKUP_SINGLE_JSON_FORMAT.md`.

Копия v2 **пока не включает** `mj_settings_v1` и `mj_participation_v1`
(TASK_073) — расширение формата до v3 (счётчики, checksum, валидация) —
отдельная задача; восстановление эти два ключа не трогает.

Ключи `mj_backup_safety_v1` и `mj_last_backup_v1` принадлежат этой
подсистеме, а не модели данных: `StoreProvider` их не читает,
восстановление их не перезаписывает и в файл копии они не попадают.

---

## Главная: hero-зона и палитра Ministry (TASK_065)

Верх Главной — не карточка, а **сцена**: `HeroScene` (absolute, clipped,
`pointerEvents:none`) с SVG-fallback (градиент mint → фон + три мягких
складки) и web-only `HeroCanvas` — WebGL-шейдер «жидкого шёлка»: фрагментный
шейдер взят **побайтно** из финального LexCar (`8a6b74d`, TASK_069):
`fold()`/`layer()` — три height-field-складки одной непрерывной
поверхности, псевдонормаль, diffuse/specular, мягкая тень, band,
растворение в фон внутри шейдера. «Отдельные волны» `waveShape/relief`
(Finance TASK_055) — снятый look; `HeroShader.test.ts` не даёт ему
вернуться. `HomeHero` кладёт
цифры месяца прямо на сцену: без eyebrow месяца (дата уже в шапке); главная
цифра — единственный **центрированный** элемент hero (wrapper `width 100%`,
`alignItems center`): число `60/600` + единица `24/500` во вторичном ink
вплотную, на одной базовой линии, SF Rounded на iOS через `ui-rounded`;
caption и всё ниже — в левой сетке (TASK_070). Сама цифра — **frosted glass
на глифах** (TASK_071), без плашки: `figureGlassStyles()` даёт четыре слоя
одной и той же строки — `shadow` (прозрачный текст + мягкая teal-тень),
`depth` (+1.5 px, тонкий тёмный teal), `body` (in-flow, градиент
white → pale-mint с `background-clip: text`), `rim` (1 px белый
text-stroke); оверлеи absolute, без `numberOfLines` (иначе RNW-`overflow:
hidden` режет тень); native — одно тело frosted white + textShadow; rgba —
`FIGURE_GLASS` в `tokens.ts`. На Home `SafeAreaView` не паддит верх — сцена
уходит под status bar, inset применяет сам экран.

Палитра — `MINISTRY` в `src/components/dashboard/tokens.ts`, единственный
источник; на web она же публикуется как `--ministry-*` из `app/+html.tsx`
(`ministryCssVars()`), откуда шейдер читает цвета через `getComputedStyle`.
Зелёная сторона teal (hue 150–172°) — сознательно в стороне от Finance
(violet, ~248°) и Lexcar (cyan / ice-blue, 185–202°); тест
`tokens.test.ts` охраняет эту полосу. `DS`, `HOME_GRADIENT`,
`HoursHeroCard`, `HomeBackground` остаются для остальных экранов.

Производительность: DPR ≤ 2, 30 fps, один draw на кадр, пауза при
`document.hidden` / вне viewport, `prefers-reduced-motion` и слабое
устройство → fallback, полный teardown при unmount. Подробности —
`docs/TASKS/TASK_065_HOME_HERO_SILK_WAVES.md`,
`docs/TASKS/TASK_069_MINISTRY_HERO_LEXCAR_FINAL_SURFACE.md`,
`docs/TASKS/TASK_070_HOME_HERO_COMPACT_FIGURE_TYPOGRAPHY.md`,
`docs/TASKS/TASK_071_HOME_HERO_GLASS_FIGURE.md`.

---

## Режим служения (TASK_073)

`settings.ministryMode` переключает **только контентный слой**; сцена
hero (`HeroScene` / WebGL), палитра, Events, Timeline, Profile, routes —
общие для всех режимов.

| | Pioneer / Special pioneer | Publisher |
|---|---|---|
| `HomeHero` | `HoursHero`: `37 ч`, цель из настроек, %, прогресс, темп, метрики | `PublisherHero`: `8` (тот же `GlassFigure`), «дней служения в сентябре», «Последний раз: …», `ParticipationMiniCalendar` |
| Кнопки hero | Детали → `/hours/month/[key]`; «+ Добавить часы» → `/entry` | Детали → `/participation`; «✓ Отметить служение» → `ParticipationSheet` |
| Главная, «Текущий служебный год» | показан | скрыт |
| Вкладка `hours` | «Часы», Hours dashboard | «Служение» (`hoursTabTitle`), `ParticipationJournal` — тот же route |
| `/add` | три карточки | без «Добавить месяц (часы)» |

Шторка → ПРИЛОЖЕНИЕ → «Настройки» (`SETTINGS_SCREEN_ITEM`, подпись
«Режим: …») → `app/settings.tsx`: radio-карточки трёх режимов + поле
«Цель часов» (только для часовых режимов; целое 1–9999, пусто = null;
значение хранится независимо от режима и не стирается при переключении).

---

## Цветовая тема: light / dark / system (TASK_078)

По образцу Lex Finance (`state.theme` + `applyTheme()` + кнопка ☼/☾ в
шапке шторки). Предпочтение — `settings.theme` (`mj_settings_v1`, default
`"system"`, `normalizeMinistrySettings` терпит отсутствие/мусор);
`setThemePreference()` в StoreContext. Фактическая схема = `resolveScheme(
preference, useColorScheme())`.

**Механизм (ADR-007, см. TASK_078 §3).** Все цвета приложения живут в
модульных кластерах токенов, которые читаются внутри модульных
`StyleSheet.create`. Чтобы не трогать каждый цвет и не перемонтировать
дерево (это сбрасывало бы навигатор):

1. `src/theme/scheme.ts` — реестр активной схемы (`getScheme` /
   `setScheme`) и `live(light, dark)`: объект с живыми геттерами, каждое
   чтение `DS.navy` идёт в набор активной схемы. **Каждый кластер — пара**
   `X_LIGHT` / `X_DARK` → `X = live(...)`: `DS`, `GRADIENTS`, `MINISTRY`,
   `NAV`, `FIGURE_GLASS`, `DRAWER_ICE`, `HERO_GLASS` (tokens.ts), `COLORS`,
   `CAT`, `TALK_CATEGORY` (constants.ts), `HOURS_COLORS`, `HISTORY_COLORS`,
   `CHART`, `TIMELINE_COLORS`, `ADD_TIME_COLORS`. `live()` бросает, если
   наборы ключей не совпадают — тёмный токен нельзя забыть молча.
   Light-наборы = прежние значения (тесты MINISTRY-band, cssVars и т.д. —
   без изменений); тёмные — не инверсия, а отдельные значения по Finance
   dark (`#0f1115` / `#1c2029` / `#e7ebf2` / `#8b93a3`, стекло white
   `.10/.16`), с AA-гардами в `tokens.test.ts`.
2. `ThemeProvider` (внутри `StoreProvider`, `app/_layout.tsx`) ставит схему
   в реестр **во время своего рендера** (до потребителей) и — на web —
   `data-theme` + `color-scheme` на `<html>`, фон `body`, `meta
   theme-color`, тоже синхронно (эффект ребёнка `HeroCanvas` читает CSS-
   переменные раньше эффекта родителя). `useTheme()` → `{ scheme,
   preference, setPreference, cycle }`; `cycle` = light → dark → system.
3. `useThemedStyles(makeStyles)`: каждый модульный `StyleSheet.create`
   стал фабрикой `const makeStyles = () => StyleSheet.create({…})`, а
   компонент читает `const styles = useThemedStyles(makeStyles)` — лист
   строится один раз на схему (WeakMap-кэш, стабильная identity),
   компонент подписан на контекст и перерисовывается при смене темы.
   Модульные `Platform.select` с токенами (TabBar glass, heroFigure
   HERO/GLASS_STYLES) — тоже фабрики.
4. `ministryCssVars()` эмитит два блока: `:root{…}` (light) и
   `:root[data-theme="dark"]{…}`; `HeroCanvas.web` перезапускает шейдер по
   смене `scheme` и перечитывает `--ministry-*`. `+html.tsx` до загрузки
   бандла читает `localStorage.mj_settings_v1` и ставит `data-theme`
   (нет светлой вспышки); glass-fallback таббара — для обеих тем.
5. UI: кнопка ☼/☾ в шапке шторки (`HomeDrawer`, `testID="drawer-theme"`,
   36 pt стекло слева от ×, иконка по фактической схеме, a11y-подпись
   «Сменить тему. Сейчас: …») и экран `app/appearance.tsx` («Оформление»
   в меню, `href: "/appearance"`) — три radio-карточки как «Режим» в
   `/settings`.

Роли, где `navy`/`blue`/`card` использовались одновременно как текст и
как заливка, разведены: `COLORS.navyFill` / `blueFill`, `DS.navyFill`,
`DS.pressedBg` / `dangerBg`, `COLORS.warnBg`, `HOURS_COLORS.pressed` /
`secondaryButton` / `dangerButtonBg` — заливки остаются глубокими под белый
текст в обеих схемах.

---

## Главная: hamburger и боковая шторка (TASK_066)

Верхняя строка Главной — `[☰]  Христианская жизнь` (Lexcar): `MenuIcon`
слева (44×44, без круга), заголовок и дата правее; круглый аватар справа
удалён. Кнопка открывает `HomeDrawer` (`src/components/drawer/`) —
левую шторку по образцу A-Lex Finance: `RNModal transparent
animationType="none"` (тот же примитив, что `AddActionSheet` /
`ProfileEditSheet`) + один `Animated.Value progress` (translateX панели и
opacity backdrop) + `PanResponder` для свайпа влево. Панель — `min(86 %,
360)`, фон — с TASK_077 собственная `DrawerScene`: точный перенос
«света» шторки Lex Finance (light): SVG-градиент `#dbeafe → #eef2f8`,
белое свечение сверху, cyan/бирюзовые пятна, два дрейфующих `Animated`
blob'а (22 с / 27 с, reduced-motion → статика), без второго
WebGL-контекста — вместо зелёного `HeroScene`; поверх — стеклянные
`DrawerGroup` (`.drawer-card`: white `.55`, кромка `.75`, radius 22,
blur 14). Все цвета шторки — кластер `DRAWER_ICE` (`tokens.ts`, вне
`MINISTRY`, по прецеденту `NAV`/`FIGURE_GLASS`; значения = `--hero-*`
Finance light; `ink #16181f`, `ink2 #4f5c70`); его берут только
`src/components/drawer/*` и вариант `drawer` у `ProfileSettingsRow`.
Закрытие: ×, backdrop, свайп, Escape (web); `role="dialog"`,
`prefers-reduced-motion` → без анимации.

Содержимое шторки = страница «Профиль»: `ProfileSummary` (имя, фото,
`profile.events` — три пользовательские памятные даты, из того же
`useStore().profile`; с TASK_072 они — список milestones на всю ширину
под именем; с TASK_077 шапка — по LexMoney (аватар 56, имя 21/600,
«Личный профиль» ink2, без карточки), а вехи — **не карточка**: строки без
фона/рамки/радиуса прямо на сцене, hairline только между строками,
teal-маркер, название как введено, дата 700 + срок вторичным ink2; ×
шторки наложен на строку имени через `headTrailingSpace`), группы
ПРОФИЛЬ (одна строка «Личные данные» — «Памятные даты» убраны в TASK_072,
даты редактируются тапом по summary или через «Личные данные») / СЛУЖЕНИЕ /
ПРИЛОЖЕНИЕ / ДАННЫЕ И РЕЗЕРВНЫЕ КОПИИ / О ПРИЛОЖЕНИИ и footer. Пункты меню — общий
`src/components/profile/profileMenu.ts`, строки — `ProfileSettingsRow` в
варианте `drawer` через `ProfileRowVariantContext`, `BackupSection` и
`ProfileEditSheet` переиспользуются как есть. Версия — только
`src/data/appInfo.ts` (`backup.ts` реэкспортирует). Вкладка «Профиль»
сохранена до решения владельца (см. TASK_066 §6).

---

## Нижняя навигация: floating glass capsule (TASK_067)

`src/components/TabBar.tsx` — кастомный `tabBar` для `<Tabs>` по тому же
утверждённому принципу, что LexCar `BottomNav` и Finance `.nav`
(TASK_056/057 там), на стеке Ministry:

```
[ Главная · Часы · Скоро · События · Профиль ]        (＋)
```

- **Капсула** 64 pt, radius 32, padding 7, margin 16, ≤ 480 pt — near-clear
  стекло: `NAV.bg` + `backdrop-filter blur(10px) saturate(150%)` (web,
  `Platform.select`), контур `NAV.border`, inset-блик, мягкая тень;
  прозрачность только в `backgroundColor`. Native — `NAV.bgSolid`; web без
  backdrop-filter — `@supports not` в `app/+html.tsx` по
  `data-ministry-glass`. Токены — объект `NAV` в `tokens.ts` (rgba на базе
  `MINISTRY`, вне hex-палитры).
- **Active pill** — один `Animated.View` шириной в слот (из `onLayout`),
  `translateX` → `slot × slotW`; только на реальных слотах 0/1/3/4;
  скрыта на route `add`.
- **Drag** — `PanResponder` на капсуле (`onMoveShouldSetPanResponderCapture`
  после 8 px горизонтали); во время жеста меняются только Animated-значения
  (pillX, stretch, edgeDir/opacity, glint), preview ближайшей реальной
  вкладки; на отпускании `nearestRealSlot()` (центр никогда) → пружина →
  тот же `go()`, что у tap; 400 мс подавления click после drag.
- **«Скоро»** — слот 2, `HourglassIcon`; tap → haptic + короткое сжатие
  иконки + `router.push("/upcoming-events")` (TASK_068) — экран «Ближайшие
  события» из root-Stack, `BackButton` возвращает на прежнюю вкладку; для
  pill/drag центр по-прежнему не цель.
- **«＋»** — отдельный glass-`Pressable` в том же wrap (не потомок
  капсулы), 48 pt, справа на 12 pt выше капсулы, прежний `go("add")`.
- `TAB_BAR_HEIGHT = 64`; контракт `useTabBarContentInset()` не менялся.
  Тем в проекте нет — только светлая. Детали —
  `docs/TASKS/TASK_067_FLOATING_GLASS_TAB_BAR.md`.

---

## Статистика служения (TASK_081)

Пункт «Статистика» в шторке Профиля / на странице Профиля
(`profileMenu.ts`, `href: "/statistics"`) открывает root-Stack экран
`app/statistics/index.tsx`. Статистика — **производное представление**
`records` + `sessions` из `StoreContext`, без собственного хранилища и
без изменения модели данных. Ядро — `src/data/serviceStats.ts`:
`buildServiceStatsIndex()` один проход по обеим коллекциям → `Map<"YYYY-MM",
MonthBucket>` (минуты, источник `session | legacy`, дни `Map<"YYYY-MM-DD",
минуты>`), Session-first по месяцу — то же правило, что `monthTotal()`
(TASK_005 §7–8); `creditHours` не входит. Индекс мемоизируется на экране
по `records`/`sessions`; `yearStats()`, `yearComparison()`,
`lifetimeStats()`, `monthDetail()`, `yearSwitcherBounds()` — дешёвые
чтения над ним. Всё в целых минутах; даты группируются срезом строки
`"YYYY-MM-DD"`, `new Date()` при группировке не используется.

Раздел работает по **календарному** году (Январь–Декабрь) — в отличие от
`/hours/stats` (служебный год Сен–Авг), который не менялся. Среднее в
месяц = итог / число месяцев с записями (будущие/пустые месяцы не
искажают). Легаси-месяцы (`HourRecord`) дают итог, но не дни — UI пишет
«нет разбивки по дням» и ведёт в `/hours/month/[key]`; месяцы с сессиями
раскрываются по дням, тап по дню → `/entry?id=` (одна сессия) или выбор
через `Modal` (несколько) — как в `/hours/history`. Empty state ведёт в
`/hours/history`. Формат «37 ч 30 м» — `formatHM()`; для четырёхзначных
часов группировка тысяч NBSP (`formatStatMinutes`). График «Динамика» —
`react-native-svg`, Catmull-Rom с клампом контрольных точек к оси, цвета
только `MINISTRY.accent` + `DS`. Подробности —
`docs/TASKS/TASK_081_SERVICE_STATISTICS_SCREEN.md`.

---

## Уведомления о событиях (отложено — TASK_060)

TASK_059 реализовал локальные уведомления через Service Worker + Notifications
API, но был откачен (TASK_060): фоновая доставка на iOS зависела от таймера
Service Worker, который система вправе выгрузить в любой момент — то есть
именно в закрытом состоянии приложения, ради которого функция и нужна,
доставка не гарантирована. Экран «Профиль → Уведомления»
(`app/notifications.tsx`) сейчас — информационная заглушка «Скоро появится»,
без переключателей и без обращений к Notification/ServiceWorker API.

Настоящая реализация требует серверного планировщика (Web Push: подписка
устройства + cron, который шлёт push точно в 19:00/09:00 независимо от того,
открыта ли PWA) — отдельная задача, ожидающая решения владельца по
инфраструктуре (кандидат — Cloudflare Workers + D1 + Cron Triggers) и нового
ADR (поправка к ADR-002, поскольку push-подписка технически покидает
устройство). Подробности отката — `docs/TASKS/TASK_060_NOTIFICATIONS_STUB_ROLLBACK.md`.
