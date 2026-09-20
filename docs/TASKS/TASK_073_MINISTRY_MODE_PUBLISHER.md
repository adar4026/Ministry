# TASK_073 — Режим служения: возвещатель / пионер / специальный пионер

**Дата:** 20 сентября 2026
**Статус:** Реализовано, закоммичено (`f38cb58`), задеплоено на GitHub Pages
(`gh-pages` `cb84ffb`), проверено на production, подтверждено владельцем
**Скоуп:** настройки приложения (новый экран «Настройки» из шторки), режим
служения и пользовательская цель часов, отдельная модель участия
(`serviceParticipation`), publisher-режим Главной / Hero / вкладки «Часы» /
нижней навигации. WebGL Hero, палитра, Events, Timeline, Profile, routes,
существующие ключи хранилища и расчёты часов — без изменений.

---

## 1. Цель

Ministry должен корректно работать не только для пионера (учёт часов и
цель), но и для обычного возвещателя (учёт **дней участия** без часов и без
процентов). Новая функциональность внедряется поверх существующей системы,
с полной обратной совместимостью: существующий пользователь после
обновления видит интерфейс **точно таким же**, пока сам не переключит
режим.

## 2. Migration path (определён до UI)

### 2.1 Текущая persistence-модель

- `usePersistentState(key, seed)`: читает `AsyncStorage[key]`; если ключа
  нет — пишет seed. Никогда не перезаписывает существующее значение.
- Ключи: `mj_records_v1`, `mj_events_v1`, `mj_talks_v1`, `mj_sessions_v1`,
  `mj_profile_v1`, `mj_custom_categories_v1` (+ `mj_timer_v1`,
  `mj_backup_*` вне стора).
- Цель часов — константа `MONTHLY_GOAL = 50` (`src/data/constants.ts`),
  `YEARLY_GOAL = 600`. Персистентной цели нет.
- Единственная существующая «миграция» — эффект в `StoreProvider`,
  подрезающий `profile.events` до 3 после гидратации.

### 2.2 Решение — только добавление

Два **новых** ключа, ни один существующий не читается иначе, не
переименовывается и не переписывается:

```
mj_settings_v1        — MinistrySettings   { ministryMode, monthlyHourGoal }
mj_participation_v1   — ServiceParticipation[]
```

Seed при отсутствии ключа (= существующая установка после обновления):

```ts
{ ministryMode: "pioneer", monthlyHourGoal: 50 /* = MONTHLY_GOAL */ }
[]
```

`normalizeMinistrySettings(raw)` — чистая функция: любой неполный/битый
объект настроек (нет `ministryMode`, неизвестное значение, цель не число)
приводится к безопасным значениям (`pioneer`, `50`). Применяется при чтении
и записывается обратно один раз после гидратации (тот же паттерн, что
profile-cap). Часы, сессии, записи, события — не трогаются ни при каком
переключении режима.

### 2.3 Модели

```ts
type MinistryMode = "publisher" | "pioneer" | "specialPioneer";
type MinistrySettings = { ministryMode: MinistryMode; monthlyHourGoal: number | null };
type ServiceParticipation = { id; date: "YYYY-MM-DD"; participated: true; createdAt; updatedAt };
```

`monthlyHourGoal: null` = цель не задана (существующая ветка
`hasGoal=false` в `HomeHero`). Служебная годовая цель — `monthlyHourGoal × 12`
(для 50 → 600, как и было). Часы и участие **никогда** не конвертируются
друг в друга.

### 2.4 Инварианты участия

- Уникальность по календарной дате: повторная отметка той же даты не
  создаёт запись (`markParticipation` → `{ ok: true, created: false }`).
- Дни за месяц считаются по **уникальным датам** (`participationDaysInMonth`),
  даже если в storage случайно есть дубли.
- Будущая дата запрещена в сторе (`{ ok: false, error: "future" }`), не
  только в UI.
- Изменение даты записи на уже отмеченную — `{ ok: false, error: "duplicate" }`.

## 3. UI (после данных и тестов)

| Область | Pioneer / Special pioneer | Publisher |
|---|---|---|
| Hero (контент) | как сейчас: `37 ч`, цель, %, прогресс, темп, метрики | `8` (та же стеклянная цифра) + «дней служения в сентябре», «Последний раз: …», мини-календарь месяца |
| Кнопки hero | Детали → `/hours/month/[key]`; «+ Добавить часы» → `/entry` | Детали → `/participation`; «✓ Отметить служение» → bottom sheet |
| Главная, «Текущий служебный год» | как сейчас | скрыт (это часы) |
| Вкладка `hours` | label «Часы», экран как сейчас | label «Служение», экран — журнал участия по месяцам |
| `/add` (глобальный «＋») | как сейчас | карточка «Добавить месяц (часы)» скрыта, события/речи остаются |
| Шторка → Приложение | новая строка «Настройки» → `/settings` | то же |
| «Цели» (шторка/Профиль) | → `/settings` (вместо «Появится позже») | то же |

Цель часов из настроек подставляется вместо константы во все живые
потребители: `HomeHero`, `MonthHeader` (детали месяца), статистика
(обзор / месяц / год). `MONTHLY_GOAL`/`YEARLY_GOAL` остаются как
значения по умолчанию.

Bottom sheet «Отметить служение»: дата (по умолчанию сегодня; выбор через
существующий `MonthCalendarModal`; будущие дни недоступны), состояние
«уже отмечено», кнопка «Отметить». В режиме редактирования (журнал,
детали месяца) — «Сохранить» + «Удалить».

## 4. Файлы

| Файл | Что |
|---|---|
| `src/types/index.ts` | `MinistryMode`, `MinistrySettings`, `ServiceParticipation` |
| `src/data/ministryMode.ts` | нормализация настроек, `isHoursMode`, labels, `yearlyGoalFor` |
| `src/data/participation.ts` | чистые функции участия (уникальность, месяцы, будущее) |
| `src/store/StoreContext.tsx` | два новых ключа, `settings`, `participation`, `setMinistryMode`, `setMonthlyHourGoal`, `markParticipation`, `updateParticipationDate`, `deleteParticipation` |
| `app/settings.tsx` | экран «Настройки» (root Stack) |
| `app/participation/index.tsx`, `app/participation/[key].tsx` | статистика участия (месяцы → месяц) |
| `src/components/dashboard/HomeHero.tsx`, `PublisherHero.tsx`, `ParticipationMiniCalendar.tsx` | контентный слой hero по режиму |
| `src/components/participation/ParticipationSheet.tsx`, `ParticipationJournal.tsx` | sheet и журнал |
| `app/(tabs)/index.tsx`, `hours/index.tsx`, `_layout.tsx`, `add.tsx`, `hours/month/[key].tsx`, `hours/stats/*` | режим/цель |
| `src/components/drawer/HomeDrawer.tsx`, `profile/profileMenu.ts`, `icons.tsx` | «Настройки», `SettingsIcon` |
| тесты | см. §5 |

## 5. Regression tests (обязательные)

- Existing user migration: только старые ключи → `mode = pioneer`,
  `goal = 50`, Hero часов, вкладка «Часы».
- Pioneer → Publisher: часы остаются в storage; Hero — дни участия.
- Publisher → Pioneer: часовая история снова отображается.
- Special pioneer: часовой Hero, `ministryMode = "specialPioneer"` сохранён.
- Goal persistence: Pioneer 50 → Publisher → Pioneer = 50.
- Participation duplicate: две отметки `2026-09-20` = 1 день.
- Participation delete: уменьшает месячное число дней.
- Future date: отклоняется.
- Existing hour calculations: все прежние тесты проходят без изменений.

## 5a. Проверки (выполнены)

- `npx tsc --noEmit` — чисто; `npx jest` — **86/86 suites, 1307/1307**
  (было 80/80, 1254): `ministryMode.test.ts`, `participation.test.ts`,
  `ministryModeStore.test.tsx` (миграция старых ключей, побайтная
  неизменность storage, ремонт битых настроек, Pioneer→Publisher→Pioneer,
  Special pioneer, goal persistence 50/70, дубль даты, удаление, будущее,
  перенос даты, дубли в storage считаются одним днём), `PublisherHero.test.tsx`
  (hero по режиму, sheet, «Уже отмечено», Детали), `participationJournal.test.tsx`,
  `settingsScreen.test.tsx`, `HomeDrawer.test.tsx` (+«Настройки»),
  `index.test.tsx` (годовой блок часов скрыт/возвращён). Все прежние тесты
  часов проходят без изменений.
- `git diff --check` — чисто; `npx expo export --platform web` — собирается,
  `dist/settings.html`, `dist/participation/{index,[key]}.html`.
- Браузер 390 px (dev server): миграция существующих данных (37 ч, ключи
  добавлены, интерфейс прежний) → Настройки → цель 70 (Главная «из цели 70
  часов · 53%», статистика «из 70 ч / из 840 ч») → Возвещатель: Главная
  «0 / дней служения в сентябре», мини-календарь, вкладка «Служение»,
  «Отметить служение» → sheet → будущая дата отклонена → 17 сентября →
  сегодня → повтор «Уже отмечено» (в storage 2 записи, не 3) → журнал,
  перенос 17→10, `/participation`, `/participation/2026-09`, `/add` без
  карточки часов → Специальный пионер: часы 37 ч и цель 70 вернулись,
  вкладка «Часы», отметки участия остались в storage. Тестовые данные в
  браузере возвращены к исходным (pioneer, 50, `[]`).

## 5b. Релиз (выполнено)

- Закоммичено `f38cb58` на `main` (было `cafef63`), запушено в
  `origin/main`.
- Задеплоено (`npm run deploy` = `expo export --platform web` +
  `gh-pages -d dist --nojekyll`): `gh-pages` продвинулся до `cb84ffb`,
  бандл `entry-89f1d433a0d11cf1cf7218968ed2993e.js`.
- Дождались обновления CDN (~30–40 с) и подтвердили побайтно, что
  `adar4026.github.io/Ministry/` отдаёт именно этот бандл — не старую
  закэшированную версию.
- Проверено на production в свежей вкладке браузера (без предзагруженного
  кэша): шторка → «⚙️ Настройки · Режим: Пионер» → `/settings` — три
  radio-карточки, поле «Цель часов» (50 → 65, сохраняется между Пионером
  и Спец. пионером, скрыто у Возвещателя) → Возвещатель: Главная — дни
  участия + мини-календарь, нижняя вкладка «Служение», `/hours` — журнал
  участия → обратно в Пионер: часы (45 ч) и цель (65) вернулись без
  потерь, вкладка снова «Часы» с таймером. Тестовые данные (сессия часов,
  настройки) очищены из этой браузерной сессии после проверки.
- Подтверждено владельцем.

## 6. Известные ограничения / follow-up

- Резервная копия v2 (`ministry-backup`) пока **не включает**
  `mj_settings_v1` и `mj_participation_v1`: формат имеет счётчики,
  checksum и поэлементную валидацию — расширение до v3 выносится в
  отдельную задачу. Восстановление копии эти два ключа не трогает.
- Иконка вкладки `hours` в publisher-режиме остаётся `ChartIcon`.
