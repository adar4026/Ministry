# TASK_068 — Вкладка «Скоро» открывает «Ближайшие события»

**Дата:** Сентябрь 2026
**Статус:** Реализовано, ожидает подтверждения владельца (не закоммичено)
**Предшественник:** TASK_067 (`docs/TASKS/TASK_067_FLOATING_GLASS_TAB_BAR.md`)

## 1. Что было

Центральная вкладка «Скоро» (TASK_067) была placeholder'ом: tap давал
только haptic и короткое сжатие иконки, `aria-disabled`, без навигации.

## 2. Решение

Tap по «Скоро» → `router.push("/upcoming-events")` — тот же переход, что
у «Показать все» на карточке «Ближайшие события» Главной
(`src/components/UpcomingEventsCard.tsx`, TASK_019). Экран
`app/upcoming-events.tsx` уже существует (root-Stack route, вне `Tabs`),
его `BackButton` возвращает на ту вкладку, с которой пришли.

Что **не** изменилось:
- «Скоро» остаётся не-вкладкой для pill и drag: `slotForRoute("soon") = -1`,
  `nearestRealSlot()` центр не возвращает, `state.index` на него не
  указывает — pill не переезжает, active остаётся на прежней вкладке.
- Подпись «Скоро», `HourglassIcon`, haptic и сжатие иконки — прежние.
- `aria-disabled` снят (вкладка теперь действие); `accessibilityLabel`
  — «Скоро — ближайшие события».
- Tap-подавление после drag (400 мс) распространяется и на этот tap.

## 3. Файлы

| Файл | Что |
|---|---|
| `src/components/TabBar.tsx` | `onSoonPress` → `router.push("/upcoming-events")`, a11y |
| `src/components/__tests__/TabBarGlass.test.tsx` | tap «Скоро» → push `/upcoming-events`, без `navigate`/`emit`, без `selected` |
| `src/components/__tests__/TabBar.test.tsx` | mock `expo-router` (TabBar теперь его импортирует) |
| `docs/ARCHITECTURE.md`, `docs/STATUS.md` | обновлены |

## 4. Проверки

`npx tsc --noEmit`, `npx jest` (79/79, 1230), `git diff --check`,
`expo export --platform web`; браузер 390 px: tap «Скоро» с `/hours` →
`/upcoming-events` (экран с «Назад»), «Назад» → `/hours`, pill на «Часы»,
консоль чистая.

## 5. Architecture Review Checklist (ADR-007)

- [x] Нет новых зависимостей; нет изменения данных.
- [x] Переход — существующий route и существующий паттерн `router.push`.
- [x] Навигационная логика вкладок (`go()`), pill и drag не тронуты.
- [ ] Живая проверка на iPhone — post-deploy шаг владельца.
