# TASK_067 — Нижняя навигация: floating glass capsule, живая active pill, drag-жест, «＋» справа, вкладка «Скоро»

**Дата:** Сентябрь 2026
**Статус:** Реализовано, ожидает подтверждения владельца (не закоммичено)
**Референсы:** LexCar `src/components/BottomNav.js` + `src/index.css`
(коммиты 1fbdeb0 → 4cff324 → 57fe0df → e387441 → b2e5423), Alex Finance
`index.html` (TASK_056/057: `.nav`, `.nav-indicator`, `.nav-add`, `navDrag`).
Тот же утверждённый принцип; палитра, стек и токены — Ministry.

---

## 1. Что было

`src/components/TabBar.tsx` — плотная белая капсула (`COLORS.card`,
radius 28, рамка `COLORS.border`, marginHorizontal 20), четыре вкладки
`index · hours · timeline · profile` («Главная / Часы / События /
Профиль») и **в центре** синяя круглая «＋» 54 px, выступающая из капсулы
(`marginTop −28`) с подписью «Добавить» → route `add`. Active —
серая подложка `#f1f5f9` на самой вкладке, синий `COLORS.accent`.
`position: fixed` на web / `absolute` на native (TASK_046);
`useTabBarContentInset()` = `TAB_BAR_HEIGHT + (insets.bottom || 12) + 16`.
Тем нет — приложение только светлое; стеклянных токенов нет.

## 2. Решение

### 2.1 Структура

```
[ Главная · Часы · Скоро · События · Профиль ]        (＋)
```

Порядок существующих вкладок сохранён; «Скоро» — строго в центре
(слот 2 из 5). «＋» вынесена из капсулы в отдельную плавающую
glass-кнопку справа над капсулой, действие прежнее (`go("add")` →
`navigation.navigate`). Route `add` в `Tabs` не менялся; когда он
активен, ни одна вкладка не выделена и pill скрыта (как `.ready` в
Finance).

### 2.2 Капсула (материал)

`NAV` в `src/components/dashboard/tokens.ts` — новый объект токенов
(рядом с `MINISTRY`, из той же палитры; в `MINISTRY` не добавлен, чтобы
не смешивать rgba-стекло с hex-палитрой, которую охраняет `tokens.test`):

| Токен | Значение | Роль |
|---|---|---|
| `bg` | `rgba(255,255,255,0.12)` | стекло капсулы (web) |
| `bgSolid` | `rgba(255,255,255,0.94)` | fallback без backdrop-filter / native |
| `border` | `rgba(15,42,38,0.30)` | тонкий контур на ink |
| `highlight` | `rgba(255,255,255,0.45)` | верхний блик (inset) |
| `blur` / `saturate` | `10px` / `150%` | backdrop-filter |
| `muted` / `active` | `MINISTRY.ink2` / `MINISTRY.primary` | подпись/иконка |
| `pillBg` | `rgba(31,166,131,0.16)` | заливка pill на `MINISTRY.accent` |
| `pillBorder` | `rgba(255,255,255,0.40)` | контур pill |
| `pillGlowColor` | `MINISTRY.accent` | мягкая тень pill |
| `glint` | `rgba(255,255,255,0.45)` | блик под пальцем |
| `edgeLight` / `edgeDark` | `rgba(255,255,255,0.32)` / `rgba(15,42,38,0.06)` | передний/задний край при drag |
| `addBg` / `addBorder` | `rgba(255,255,255,0.14)` / `rgba(15,42,38,0.30)` | кнопка «＋» |

Геометрия (LexCar b2e5423 / Finance TASK_057): высота **64**, radius
**32** (полностью скруглённые торцы), padding 7, marginHorizontal 16,
maxWidth 480 → капсула узкая и компактная. `TAB_BAR_HEIGHT = 64`,
контракт `useTabBarContentInset()` не менялся.

Стекло: `backgroundColor: NAV.bg` + `backdropFilter`/`WebkitBackdropFilter:
blur(10px) saturate(150%)` (только web, через `Platform.select`) + border
1 px + inset-блик (`boxShadow` web) + мягкая внешняя тень. Прозрачность —
только в `backgroundColor`; на панели нет `opacity`, иконки и подписи
непрозрачны. **Fallback:** native — `NAV.bgSolid` (в RN нет
backdrop-filter); web без поддержки — правило `@supports not
((backdrop-filter…)) { [data-ministry-glass] { background: … } }` в
`app/+html.tsx`, элементы помечены `dataSet={{ ministryGlass: "nav" |
"add" }}`. Тем в Ministry нет; при появлении тёмной темы `NAV` получает
второй набор значений там же.

### 2.3 Active pill

Один общий `Animated.View` внутри капсулы: `position: absolute`,
`top/bottom/left = 7`, `width = (ширина капсулы − 14) / 5` (из
`onLayout`, не на каждом движении), `borderRadius 999`, `NAV.pillBg` +
`NAV.pillBorder` + inset-блик + мягкая teal-тень. Положение —
`translateX = pillX` (Animated.Value, px). При смене вкладки —
`Animated.spring` к `slot × slotW`; при reduced-motion — короткий
`timing`. Pill может стоять только на реальных вкладках (слоты
0, 1, 3, 4); центр (2) — никогда.

### 2.4 Drag-жест

`PanResponder` на капсуле (`onMoveShouldSetPanResponderCapture`): жест
становится drag после `|dx| ≥ 8` и `|dx| > |dy|` — до этого обычный tap
по `Pressable` вкладки работает как раньше; вертикальное движение не
перехватывается. Геометрия (`slotW`, `maxX`) берётся из последнего
`onLayout` (обновляется при resize/повороте), не измеряется в
`onPanResponderMove`. Во время drag меняются **только** Animated-значения
(`pillX`, `stretch`, `edgeDir`, `edgeOpacity`, `glintX/Y`) через
`setValue` — без re-render; единственный `setState` — `preview` (ближайшая
реальная вкладка) и меняется ≤ 4 раз за жест. Pill ограничена
`[0, maxX]`.

На отпускании: `target = nearestRealSlot(x)` — среди `{0,1,3,4}`, по
расстоянию; при равном расстоянии от центра — в сторону движения. Pill
пружиной (`Animated.spring`, 380 мс-порядок; reduced-motion → timing
200 мс) прилипает к target; если target ≠ текущая вкладка — вызывается
тот же `go()`, что и при tap; если та же — просто возврат. После drag
`suppressTapUntil` на 400 мс глотает click/onPress, который RNW может
послать вслед за pointerup, — вкладка не переключится дважды.

### 2.5 «Скоро»

Слот 2, `HourglassIcon` (спокойный контурный, как остальные), подпись
«Скоро», `accessibilityRole="button"`, `accessibilityState.disabled`,
`accessibilityLabel="Скоро — появится позже"`. Короткое нажатие: лёгкий
`Haptics.selectionAsync()` (no-op на web) и короткое «дыхание»
иконки (scale 1 → 0.92 → 1, 220 мс, reduced-motion → нет); навигации и
смены active нет, alert нет. В drag — не цель: `nearestRealSlot` его
не возвращает, preview на нём не ставится.

### 2.6 «＋» справа

Отдельный `Pressable` в том же wrap (`pointerEvents="box-none"`), не
потомок капсулы → `PanResponder` капсулы его не видит; drag, начатый на
кнопке, ничего не переключает. 48 px, круг, glass (`NAV.addBg` + тот же
blur, контур, inset-блик, мягкая тень), `PlusIcon` 22 в `MINISTRY.ink`.
Позиция: правый край = правый край капсулы (16 px от экрана или
центрированное смещение при maxWidth), низ = верх капсулы + 12 px;
`zIndex`/`elevation` выше капсулы. `accessibilityLabel="Добавить"`,
короткое нажатие → прежний `go(add)`.

### 2.7 Живое стекло pill (только при удержании / drag)

Два декоративных слоя внутри pill (`pointerEvents: none`,
`overflow: hidden` на pill):
- **glint** — 56×48 px, `radial-gradient(closest-side, NAV.glint, transparent 72%)`
  (web; native — мягкий круг с opacity), центр = положение пальца в
  координатах pill (`glintX/Y` Animated); виден только в `live`.
- **edge** — `linear-gradient(90deg, edgeDark → transparent 38% → transparent 62% → edgeLight)`,
  `scaleX = edgeDir` (±1), `opacity = edgeOpacity` — сглаженная скорость
  `v = 0.7·v + 0.3·min(|Δx|/14, 1)`.
- **stretch** — `scaleX = 1 + 0.05·v` на pill.
На отпускании всё возвращается в покой вместе со snap-пружиной. При
reduced-motion glint/edge/stretch выключены. Без Canvas/WebGL/SVG-фильтров.

## 3. Файлы

| Файл | Что |
|---|---|
| `src/components/TabBar.tsx` | переписан: капсула-стекло, 5 слотов, pill, drag, «Скоро», «＋» справа |
| `src/components/dashboard/tokens.ts` | `NAV` токены |
| `src/components/icons.tsx` | `HourglassIcon` |
| `app/+html.tsx` | `@supports not (backdrop-filter)` fallback для `[data-ministry-glass]` |
| `src/components/__tests__/TabBar.test.tsx` | + структура, «Скоро», «＋», pill, drag-математика |
| `docs/ARCHITECTURE.md`, `docs/STATUS.md` | обновлены |

## 4. Проверки

`npx tsc --noEmit`, `npx jest`, `git diff --check`, `npx expo export
--platform web`; браузер 320 / 375 / 390 / 430 px на всех экранах
(Главная, Часы, События, Профиль, Добавить, /notifications,
/upcoming-events): пять пунктов без обрезки, «＋» не перекрывает капсулу,
`scrollWidth === innerWidth`, контент уходит под стекло, tap по вкладкам,
«Скоро» без навигации, drag влево/вправо, pill не липнет к центру,
консоль чистая. Тем в проекте нет — проверена единственная (светлая).

## 5. Не входит

Тёмная тема (её нет в проекте); новый экран для «Скоро»; изменение
экранов, hero, drawer, данных; commit/push/deploy до подтверждения.

## 6. Architecture Review Checklist (ADR-007)

- [x] Нет новых зависимостей.
- [x] Нет изменения модели данных / ключей.
- [x] Навигационная логика (`navigation.emit('tabPress')` + `navigate`) —
      та же функция `go()` для tap, drag и «＋».
- [x] Токены — `NAV` в `tokens.ts`, из палитры `MINISTRY`; чужих hex нет.
- [x] `useTabBarContentInset()` — контракт не изменён.
- [ ] Живая проверка на iPhone — post-deploy шаг владельца.
