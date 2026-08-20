# TASK_049 — Расширенная цветовая шкала срочности «Ближайшие события»

**Статус:** реализация
**Область:** только цвет relative-статуса в карточках «Ближайшие события»
(`UpcomingEventRow.tsx`, `src/data/dateFormat.ts`, `tokens.ts`).
**Не входит:** разметка карточки, расчёты дат (`calendarElapsed`,
`daysBetweenUTC`, пороги 7/30 дней), абсолютная дата после `·` (остаётся
`DS.subInk`, как и раньше), любые другие экраны.

---

## 1. Цель

TASK_048 ввёл 4 уровня срочности (`overdue` / `today` / `tomorrow`+`soon` /
`later`, где `later` покрывал сразу и 8–30 дней, и >30 дней одним и тем же
нейтральным цветом). Задача — различить эти два случая по шкале из ТЗ
владельца:

| Условие | Цвет | Токен |
|---|---|---|
| `Просрочено` | красный | `DS.danger` (без изменений) |
| `Сегодня` | оранжевый | `DS.todayInk` (**новый**) |
| `Завтра` и 2–7 дней | янтарный | `DS.warnInk` (переиспользован) |
| 8–30 дней | фирменный синий акцент | `DS.accentInk` (переиспользован) |
| > 30 дней | нейтральный серо-синий | `DS.subInk` (без изменений) |

Разметка карточки, вычисление `primary`/`secondary`, абсолютная дата после
`·` — не меняются. Изменился только цвет relative-текста и добавлен один
промежуточный уровень срочности между «soon» (2–7 дн.) и «later» (>30 дн.).

---

## 2. `src/data/dateFormat.ts`

`UpcomingUrgency` получает новое значение `"upcoming"` для диапазона 8–30
дней (граница `RELATIVE_HORIZON_DAYS = 30` не менялась). Диапазон >30 дней
по-прежнему возвращает `"later"` — как и раньше, до этой задачи (визуально
не меняется, `DS.subInk` уже использовался для этого случая).

```
diff < 0                     -> "overdue"
diff === 0                   -> "today"
diff === 1                   -> "tomorrow"
2 <= diff <= 7  (SOON_DAYS)  -> "soon"
8 <= diff <= 30              -> "upcoming"   (новое значение)
diff > 30                    -> "later"      (без изменений)
```

Расчёт `diff` (`daysBetweenUTC`), пороги `SOON_DAYS`/`RELATIVE_HORIZON_DAYS`,
тексты `primary`/`secondary` — не менялись.

---

## 3. Токены (`src/components/dashboard/tokens.ts`)

Добавлен **один** новый токен — `todayInk`. Остальные четыре цвета шкалы
переиспользуют уже существующие AA-токены TASK_048 (значения не менялись):

```
todayInk:  "#c2410c"  // новый — 5.17:1 на DS.cardBg (оранжевый, Tailwind orange-700)
warnInk:   "#b45309"  // существующий — 5.02:1 (янтарный, Tailwind amber-700)
accentInk: "#2d55c7"  // существующий — 6.48:1 на DS.cardBg (фирменный синий)
subInk:    "#5f7290"  // существующий — 4.89:1 (нейтральный серо-синий)
danger:    "#dc2626"  // существующий — 4.83:1 (красный)
```

`todayInk` выбран отдельно от `warnInk`, чтобы «Сегодня» (оранжевый) и
«Завтра»/«Через 2–7 дней» (янтарный) визуально различались — по ТЗ это два
разных уровня шкалы, а не один.

---

## 4. `UpcomingEventRow.tsx`

`URGENCY_COLOR` расширена на новый уровень `upcoming`:

```
overdue:  DS.danger
today:    DS.todayInk
tomorrow: DS.warnInk
soon:     DS.warnInk
upcoming: DS.accentInk
later:    DS.subInk
```

Абсолютная дата после `·` (`styles.date`) остаётся на `DS.subInk` — не
входит в шкалу срочности, ТЗ явно требует сохранить её приглушённой.

---

## 5. Тесты

`src/data/__tests__/dateFormat.test.ts` (`upcomingDateLabel`):

- граница 7/8 дней: `diff === 7` -> `urgency: "soon"`, `diff === 8` ->
  `urgency: "upcoming"`;
- граница 30/31 дня: `diff === 30` -> `urgency: "upcoming"`, `diff === 31`
  -> `urgency: "later"`;
- существующий тест на `diff === 15` (`"Через 15 дней"`) обновлён:
  `urgency` теперь `"upcoming"`, а не `"later"` (единственное изменившееся
  ожидание в файле — остальные диапазоны/тексты не менялись).

Разметка и расчёт дат не тестируются заново — уже покрыты TASK_048.

---

## 6. Architecture Review Checklist (ADR-007)

- Нет нового бэкенда, хранения, миграции AsyncStorage — изменения чисто
  презентационные (цвет + один новый уровень enum в чистой функции).
- `calendarElapsed`, `daysBetweenUTC`, `formatDateHuman`,
  `pluralDaysRu`/`pluralRu`, пороги `SOON_DAYS`/`RELATIVE_HORIZON_DAYS` —
  не менялись.
- Разметка `UpcomingEventRow` (структура `SummaryCard`, `itemTitle`,
  `statusRow`, `separator`, `date`) — не менялась, только цветовая карта.
- `formatDateDMY()` (TASK_022) вне области — не затронут.
- Единственный новый токен (`todayInk`) — Home-scoped `DS` (не
  `src/data/constants.ts`), как и остальные токены TASK_048; проверено
  AA-контрастом (5.17:1 на `DS.cardBg`).
- `seed.js` не открывался.

---

## 7. Верификация

`npx tsc --noEmit`, `npx jest` (0 failed), `npx expo export --platform
web`, `git diff --check` — результаты см. `docs/STATUS.md`.
