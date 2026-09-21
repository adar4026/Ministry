# TASK_083 — «Календарь служения» из шторки: root-экран `/calendar`

**Дата:** 21 сентября 2026
**Статус:** Implemented, verified locally (§5а). Commit / deploy /
production — §5б.
**Скоуп:** пункт «Календарь служения» (шторка Профиля / страница Профиля)
перестаёт быть заглушкой и открывает новый root-Stack экран `/calendar`,
собранный из **существующей** календарной части `/hours/history`.
`/hours/history` остаётся рабочим экраном вкладки «Часы». Данные, ключи
AsyncStorage, `StoreContext`, редактор `/entry`, `/hours/month/[key]` —
не меняются; миграции нет.

---

## 1. Принцип

Второй календарь не создаётся. Вся календарная логика History —
состояние периода/месяца, `dailyMinutesForMonth()`, `sessionsForDay()`,
`sortSessionsDescending()`, `totalMinutesForPeriod()` /
`totalCreditForPeriod()` (Session-first / legacy), тап по дню →
`/entry?id=` или выбор из нескольких, легаси-месяц → `/hours/month/[key]`
— выносится в один общий компонент `ServiceCalendarContent`, который
рендерят **оба** экрана:

```
вкладка «Часы» → /hours/history  ─┐
                                   ├─ ServiceCalendarContent (одна логика)
шторка → /calendar (root Stack) ──┘
```

## 2. Визуальный вариант

Компоненты History (`HistoryCalendar`, `HistorySessionRow`,
`HistoryTotalCard`, `LegacyMonthRow`, `PeriodNav`, `PeriodSwitcher`)
раскрашены локальной палитрой `HISTORY_COLORS` (лаванда, TASK_032).
Чтобы `/calendar` выглядел частью Ministry, а History не менялась ни на
один цвет, вводится `CalendarVariantContext` (`"history" | "ministry"`,
по прецеденту `ProfileRowVariantContext`, TASK_066) и палитра
`MINISTRY_CALENDAR_COLORS` с теми же ролями, но из live-токенов
`DS`/`MINISTRY` (карточки `DS.cardBg`, текст `DS.navy`/`DS.subInk`,
день с записями `MINISTRY.accentSoft`, «сегодня» `MINISTRY.accent`,
радиус 22 как у `/statistics`). Компоненты берут палитру и лист стилей
через `useCalendarStyles()` / `useCalendarPalette()`; без провайдера
вариант — `"history"`, т.е. вкладка «Часы» рендерится байт-в-байт как
раньше.

## 3. Экран `/calendar` (`app/calendar.tsx`)

- Root Stack (как `/statistics`, `/participation`, `/appearance`): tab bar
  под ним не монтируется; шапка «Календарь служения» + `BackButton
  fallbackHref="/"`; `HomeBackground`, `DS.homeBase`, `useThemedStyles`,
  light/dark.
- Часовые режимы (`pioneer` / `specialPioneer`) → `ServiceCalendarContent`
  в варианте `ministry`: Месяц / Год / Всё время, ‹ › навигация, «Итого»
  (с зачётными часами для служебного года — как в History), сетка
  месяца, список сессий или легаси-строка.
- `publisher` → `<Redirect href="/participation" />` — календарь участия
  уже существует, второй не создаётся.
- Год — служебный (TASK_082): в варианте `ministry` заголовок периода —
  `serviceYearLabel()` («2025–2026»), под ним «Сентябрь 2025 — август
  2026»; сумма — `totalMinutesForPeriod(…, "year", endYear)` через
  `serviceYearMonths()` (уже так в History).
- `profileMenu.ts`: `calendar.href = "/calendar"`.
- `/statistics` empty state «Открыть календарь» → `/calendar`. Тап по дню
  в `/statistics/month/[key]` по-прежнему ведёт в `/entry` (не ломается).

## 4. Тесты

- `app/__tests__/calendarScreen.test.tsx`: заголовок, назад, текущий
  месяц, ‹ ›, тап дня с одной сессией → `/entry?id=`, с несколькими →
  выбор, легаси-месяц → `/hours/month/[key]`, publisher → редирект на
  `/participation`, год = служебный «2025–2026» с суммой Сен–Авг,
  31.08 / 01.09 в разных служебных годах.
- `profileMenu.test.ts`, `profile.test.tsx`: «Календарь служения» →
  `/calendar`; `statisticsScreen.test.tsx`: empty state → `/calendar`.
- `history.test.tsx` — без изменений (History не должна измениться).

## 5. Проверки

`tsc`, `jest`, `expo export`, `git diff --check`, браузер 320/390/430,
light/dark, месяц с большим числом записей / без записей / легаси /
несколько сессий в день, отсутствие tab bar и двойной шапки, Back → `/`;
затем commit → push → deploy → production.

## 5а. Проверки (выполнены)

- `npx tsc --noEmit` — чисто; `npx jest` — **95/95 suites, 1391/1391**
  (было 94/1384; +1 suite `calendarScreen.test.tsx` — 7 тестов; правки
  `profileMenu.test.ts`, `profile.test.tsx`, `statisticsScreen.test.tsx`;
  `history.test.tsx` — без изменений, зелёный); `npx expo export
  --platform web` — собирается; `git diff --check` — чист.
- Браузер, отдельный origin `127.0.0.1:8082` (синтетика: сентябрь 2026 с
  10 днями записей и двумя сессиями 5-го, 31.08.2026, пустой июль,
  легаси-июнь 30 ч + 30 ч зачёт; origin очищен после): 390 px light —
  «Календарь служения», Месяц/Год/Всё время, «Сентябрь 2026 · Текущий
  месяц», «Итого 19 часов 5 минут», сетка в DS/MINISTRY (день с записью —
  мятный, «сегодня» — accent), список сессий; тап по 5-му → выбор
  1:00 / 0:45 → `/entry?id=…` → назад в `/calendar`; ‹ ‹ → июль «Нет
  записей за этот месяц», июнь — «Сохранён месячный итог…», «30 ч + 30 ч
  кредит»; «Год» → **«2026–2027 · Текущий год · Сентябрь 2026 — август
  2027»**, «19 часов 5 минут» (31.08 не вошёл); 320 px dark — заголовок
  одной строкой (18 pt / 46 px, замер 21.5 px высоты), без горизонтального
  скролла; 430 px light; Главная → ☰ → «Календарь служения» →
  `/calendar` (шторка закрыта, tab bar не смонтирован) → «Назад» → `/`;
  режим `publisher` → `/participation` («Участие в служении»);
  `/hours/history` — прежний лавандовый вид с tab bar; консоль — только
  404 dev-сервера на deep-link.

## 5б. Production

_(заполняется после деплоя)_

## 6. Architecture Review Checklist (ADR-007)

- [x] Нет новых зависимостей.
- [x] Данные и стор не менялись; нет второго календаря/редактора.
- [x] Одна календарная логика для `/hours/history` и `/calendar`
      (`ServiceCalendarContent`); `history.tsx` — только шапка/фон.
- [x] History в варианте `history` рендерится как прежде (тесты
      `history.test.tsx` зелёные без правок, визуально — лаванда).
- [x] Цвета `/calendar` — только live-токены `DS`/`MINISTRY`
      (`MINISTRY_CALENDAR_PALETTE`), light/dark проверены.
- [x] Служебный год — только `src/data/serviceYear.ts`
      (`serviceYearLabel` в `PeriodNav`, суммы — прежний
      `totalMinutesForPeriod` через `serviceYearMonths`).
