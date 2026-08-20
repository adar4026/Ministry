# TASK_053 — Спокойный мятно-голубой градиент фона Главной

**Статус:** реализовано, протестировано, задеплоено
**Область:** фон именно экрана «Главная» (`app/(tabs)/index.tsx`) —
цветовые стопы его собственного вертикального градиента, базовый цвет
под ним, и верхняя safe-area-полоса `app/(tabs)/_layout.tsx`, гейтованная
на `isHome`.
**Не входит:** фон Hours/Timeline/Profile/`/upcoming-events` (все
продолжают рендерить `<HomeBackground />` с исходными
`HOME_GRADIENT`/`DS.homeBase` без изменений); нижняя навигация
(`TabBar.tsx` не тронут); белые карточки, тени, отступы; синие действия,
тёмно-синий текст, логотип, типографика, вёрстка, логика экранов.

---

## 1. Цель

Владелец запросил для Главной спокойный светлый мятно-голубой вертикальный
градиент по точному CSS-эквиваленту:

```css
background: linear-gradient(
  180deg,
  #DCEFE9 0%,
  #EDF6F3 42%,
  #F7FAF9 100%
);
```

Критерии (см. постановку задачи владельца):

- Градиент начинается сразу под iOS status bar / safe area — сверху не
  должно оставаться отдельной белой полосы.
- Внизу — почти белый с лёгким мятным оттенком, не серый.
- Белые карточки/тени/отступы/читаемость — без изменений.
- Нижняя навигация — белая либо очень слегка translucent, не мятная.
- Синие действия, тёмно-синий текст, логотип, типографика, вёрстка,
  логика экранов — без изменений.
- Фон не синий/фиолетовый/тёмный.
- Тёмная тема — не ухудшена (в проекте отдельной тёмной темы для Home не
  реализовано — `useColorScheme`/`prefers-color-scheme` нигде в
  `src/components/dashboard/`, `app/(tabs)/index.tsx`,
  `app/(tabs)/_layout.tsx` не используются, см. §6).
- Изменения минимальны и локальны — именно Главная, без случайных
  побочных эффектов на другие экраны.

---

## 2. Найденная существующая архитектура

До этой задачи `<HomeBackground />` (TASK_010, `src/components/dashboard/
HomeBackground.tsx`) — **общий** компонент без пропсов, рендерящий
фиксированный SVG-градиент по константе `HOME_GRADIENT` (`tokens.ts`,
`["#cfe3d9", "#e3ece8", "#eef2f0"]`, стопы `0/0.55/1`). Его переиспользуют
**пять** экранов через один и тот же барабан токенов:

- `app/(tabs)/index.tsx` (Главная)
- `app/(tabs)/hours/index.tsx` (Часы, TASK_046)
- `app/(tabs)/timeline.tsx` (События)
- `app/(tabs)/profile.tsx` (Профиль)
- `app/upcoming-events.tsx` («Ближайшие события», полноэкранный вид)

`DS.homeBase` (`#eef2f0`) используется как плоский `backgroundColor` под
градиентом на всех пяти экранах (`screen: { backgroundColor: DS.homeBase }`
в каждом). `app/(tabs)/_layout.tsx` красит верхнюю safe-area-полосу
`HOME_GRADIENT[0]` и нижнюю scene-полосу `DS.homeBase`, но **только** когда
`isHome` (`pathname === "/"`) — остальные вкладки уже используют
`COLORS.bg`, никогда `HOME_GRADIENT`/`DS.homeBase`.

Прямая правка `HOME_GRADIENT`/`DS.homeBase` "на месте" изменила бы фон
всех пяти экранов, а не только Главной — это нарушило бы явное требование
"без случайного изменения других экранов". Поэтому реализация вводит
Home-only токены и делает `<HomeBackground />` параметризуемым, а не
трогает общие константы.

---

## 3. Изменения

### `src/components/dashboard/tokens.ts`

- Новая константа `HOME_MINT_GRADIENT = ["#DCEFE9", "#EDF6F3", "#F7FAF9"]`
  — точные цвета из ТЗ, отдельная от `HOME_GRADIENT`.
- Новая константа `HOME_MINT_GRADIENT_STOPS = [0, 0.42, 1]` — точные
  офсеты из ТЗ (42%), отдельная от дефолтных `[0, 0.55, 1]`.
- Новый токен `DS.homeMintBase = "#F7FAF9"` — плоская база под градиентом
  Главной, совпадает с последним стопом `HOME_MINT_GRADIENT` (тот же
  паттерн, что `DS.homeBase` ↔ `HOME_GRADIENT[2]`). Отдельный от
  `DS.homeBase`, который остаётся `#eef2f0` для остальных четырёх экранов.

### `src/components/dashboard/HomeBackground.tsx`

- Добавлены необязательные пропсы `colors?: readonly [string, string,
  string]` и `stops?: readonly [number, number, number]`, по умолчанию
  равные прежним `HOME_GRADIENT`/`[0, 0.55, 1]` — вызовы без пропсов (все
  четыре не-Home экрана) рендерят ровно то же самое, что и раньше.
- Высота градиента (`GRADIENT_HEIGHT = 360`) и структура SVG
  (`LinearGradient`/`Stop`/`Rect`, уникальный `gradientId` через `useId()`
  для TASK_019) — не менялись.

### `app/(tabs)/index.tsx`

- `<HomeBackground />` → `<HomeBackground colors={HOME_MINT_GRADIENT}
  stops={HOME_MINT_GRADIENT_STOPS} />`.
- `styles.screen.backgroundColor`: `DS.homeBase` → `DS.homeMintBase`.
- Ничего больше в файле не менялось — хедер, `HoursHeroCard`,
  `UpcomingEventsCard`, `SummaryCard`/`MonthChip`-сетка, `EventCard`-лист,
  `Modal`/`RecordForm` — все как были.

### `app/(tabs)/_layout.tsx`

- Импорт `HOME_GRADIENT` → `HOME_MINT_GRADIENT` из
  `@/components/dashboard/tokens` (прямой импорт из модуля токенов, не из
  барабана `@/components/dashboard/index.ts` — сохранена та же защита от
  цикла импорта через `HoursHeroCard → StoreContext`, что уже была
  задокументирована в файле до этой задачи).
- В `SafeAreaView`: `isHome && { backgroundColor: HOME_GRADIENT[0] }` →
  `isHome && { backgroundColor: HOME_MINT_GRADIENT[0] }`.
- В `sceneStyle`: `isHome ? DS.homeBase : COLORS.bg` →
  `isHome ? DS.homeMintBase : COLORS.bg`.
- Оба изменения по-прежнему строго гейтованы `isHome` — остальные четыре
  вкладки (`hours`, `timeline`, `profile`, `add`) продолжают получать
  `COLORS.bg` на обеих полосах, без изменений.

### `.claude/launch.json`

Порт дев-сервера временно менялся на `8091` для визуальной проверки (в
папке уже был запущен чужой сеанс на `8082`) и возвращён обратно на
`8082` после проверки — файл не отслеживается git (`git ls-files` не
показывает его), в коммит не входит.

---

## 4. Почему это удовлетворяет каждому критерию

- **Градиент сразу под status bar:** не новая механика — уже существующий
  паттерн TASK_048 (`SafeAreaView`'s фон = первый стоп градиента,
  `edges={["top","left","right"]}`), только перенаправленный на
  `HOME_MINT_GRADIENT[0]` для Home. Визуально подтверждено (§5) —
  никакой отдельной белой полосы над хедером.
- **Низ — почти белый с мятным оттенком, не серый:** `#F7FAF9` — это не
  серый (нет равных RGB-каналов; лёгкий сдвиг в сторону мятного/зелёного
  относительно чистого белого), в точности последний стоп ТЗ.
- **Белые карточки/тени/отступы:** `SummaryCard`/`HoursHeroCard`/
  `EventCard`/`UpcomingEventsCard` не менялись — используют
  `DS.cardBg`/`DS.shadow`, не тронутые этой задачей.
- **Нижняя навигация белая:** `TabBar.tsx` не менялся вообще — его
  `bar.backgroundColor` остаётся `COLORS.card` (белый), подтверждено
  вычисленным стилем `rgb(255, 255, 255)` в браузере (§5), новый
  регресс-тест `HomeBackground.test.tsx` "stay distinct constants" не
  даёт `DS.homeMintBase` случайно совпасть с `DS.homeBase` (что было бы
  первым шагом к утечке мятного цвета в переиспользуемые части UI).
- **Синие действия/тёмно-синий текст/логотип/типографика/вёрстка/логика:**
  ни `DS.navy`, `DS.accent`, `pageTitle`/`pageDate`-стили, JSX-структура,
  `useMemo`/обработчики — не менялись; diff `app/(tabs)/index.tsx`
  ограничен двумя строками (проп `<HomeBackground>` и один
  `backgroundColor`) плюс импорт.
- **Не синий/фиолетовый/тёмный:** все три новых цвета — light mint/green
  family (`#DCEFE9`/`#EDF6F3`/`#F7FAF9`), ровно значения ТЗ.
- **Тёмная тема не ухудшена:** в этой части дерева тёмной темы нет —
  `useColorScheme`/`prefers-color-scheme` не встречаются ни в
  `src/components/dashboard/`, ни в затронутых экранах/layout
  (`grep` подтвердил отсутствие); следовательно, "текущую визуальную
  логику" тёмной темы менять было нечего — не деградировано, потому что
  не существовало для этого экрана до задачи.
- **Минимально и локально:** изменения в 4 файлах кода (+1 новый тест-файл,
  +1 расширенный тест-файл); `HOME_GRADIENT`/`DS.homeBase`
  (Hours/Timeline/Profile/upcoming-events) физически не редактировались —
  подтверждено live-проверкой всех четырёх экранов (§5) и тестами.

---

## 5. Верификация

- `npx tsc --noEmit` — чисто.
- `npx jest` — **964/964, 0 failed** (66/66 suites; +6 к базе TASK_052:
  4 новых теста в `src/components/dashboard/__tests__/HomeBackground.test.tsx`,
  2 новых теста в `app/(tabs)/__tests__/index.test.tsx`).
- `git diff --check` — чисто.
- Живая проверка — dev-сервер (порт 8091, отдельный от чужого сеанса на
  8082), мобильный viewport 375×812 (iPhone), `localhost:8091`:
  - Скриншот Главной: градиент от `#DCEFE9` сверху до почти-белого снизу,
    без белой полосы над хедером, белые карточки (`HoursHeroCard`,
    «Ближайшие события», список событий) и белый нижний бар — визуально
    подтверждено.
  - `document.querySelectorAll('stop')` на Главной →
    `[{offset:"0",color:"#DCEFE9"}, {offset:"0.42",color:"#EDF6F3"},
    {offset:"1",color:"#F7FAF9"}]` — точное совпадение с ТЗ.
  - То же на `/hours`, `/timeline`, `/profile` →
    `[{offset:"0",color:"#cfe3d9"}, {offset:"0.55",color:"#e3ece8"},
    {offset:"1",color:"#eef2f0"}]` на всех трёх — исходный `HOME_GRADIENT`,
    не задет.
  - Вычисленный `background-color` контейнера нижнего таб-бара (родитель
    текстового узла «Главная», уровень с `bar`-стилем) →
    `rgb(255, 255, 255)` — чистый белый, не мятный.
  - Консоль браузера — без ошибок (`read_console_messages`,
    `onlyErrors: true` → пусто).
- `npx expo export --platform web` — см. §7 (выполнялся перед деплоем).

---

## 6. Architecture Review Checklist (ADR-007)

- Нет нового бэкенда, облачной синхронизации, аутентификации.
- Нет миграции схемы хранения — AsyncStorage-ключи, `StoreContext`,
  `saveRecord`/`saveEvent`/`saveSession` не тронуты; задача чисто
  презентационная (только `src/components/dashboard/tokens.ts`,
  `HomeBackground.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/_layout.tsx`).
- Бизнес-логика не менялась: агрегация, `formatHM`, `serviceYearAggregation`,
  таймер, статистика — ни одна функция не тронута; diff ограничен цветами
  и одним новым пропом презентационного компонента.
- `HOME_GRADIENT`/`DS.homeBase` (используются Hours/Timeline/Profile/
  upcoming-events через тот же `<HomeBackground/>`) оставлены нетронутыми
  — новые Home-only константы `HOME_MINT_GRADIENT`/
  `HOME_MINT_GRADIENT_STOPS`/`DS.homeMintBase` добавлены рядом, не заменяя
  существующие; подтверждено live-проверкой всех четырёх остальных
  экранов (§5) и юнит-тестом на дефолтные пропы `<HomeBackground/>`.
  `TabBar.tsx`, `COLORS` (`src/data/constants.ts`) — не изменялись.
- `<HomeBackground/>` остаётся презентационным, без пропсов/данных —
  новые `colors`/`stops` необязательны с дефолтами, воспроизводящими
  прежнее поведение 1:1 (см. тест "defaults to the shared HOME_GRADIENT").
- Личные данные пользователя (`src/data/seed.js`, AsyncStorage) не
  затрагивались.
- Deploy и Git Tag выполнены после прохождения этого checklist без
  замечаний — владелец подтвердил коммит + пуш + деплой (см. `docs/
  STATUS.md`).
