# TASK_023 — Типографическая шкала: размеры и снижение fontWeight 800→700

**Статус:** ЗАВЕРШЕНА — реализована, задеплоена и проверена в проде.
**Основание:** ADR-004 (нет TASK — нет кода). Запрошено владельцем напрямую:
локальный визуальный прототип согласован в предыдущей сессии (без коммита),
скриншоты «до/после» просмотрены и одобрены владельцем; эта задача
формализует и фиксирует уже одобренный вариант.
**Связана с:** [[TASK_022]] (формат дат `ДД-ММ-ГГГГ` — не затрагивается).

---

## 1. Проблема

Приложение не задаёт `fontFamily` нигде в коде (кроме моноширинных цифр
таймера, `hours/timer.tsx`) — react-native-web уже рендерит весь текст
стеком `-apple-system, "system-ui", "Segoe UI", Roboto, Helvetica, Arial,
sans-serif` (подтверждено чтением computed style в браузере), а нативный
iOS при отсутствии `fontFamily` резолвит текст в системный шрифт (San
Francisco) автоматически. То есть требование «системный шрифт Apple, без
загрузки файлов SF Pro» уже выполнялось нулевым изменением кода — сам
шрифт не был источником визуальной проблемы.

Источник ощущения «круглого»/тяжёлого текста — повсеместный
`fontWeight: "800"` (заголовки, названия карточек, KPI-значения) и
тесные, местами мелкие (`fontSize` 10–14px) размеры вторичного текста,
кнопок, тегов и нижней навигации.

## 2. Реализованное изменение

- **Шрифт:** без изменений в коде. Явное указание строкового имени
  `"SF Pro Display"/"SF Pro Text"` через `fontFamily` не добавлялось —
  Apple не адресует эти имена как устанавливаемые сторонним приложениям
  напрямую через `fontFamily`; текущее поведение (не задавать `fontFamily`
  вовсе) — единственный надёжный способ получить настоящий San Francisco
  на iOS, и он уже был в проекте.
- **Вес:** каждый `fontWeight: "800"` в `app/` и `src/` (24 файла) заменён
  на `"700"` — в проекте больше нет значений 800/900.
- **Размеры:** точечно увеличены (в основном на 1px, иногда на 2px)
  заголовки страниц, заголовки секций, названия карточек, вторичный текст
  (даты/подписи), теги/бейджи, кнопки, поля форм, нижняя навигация и
  заголовки модальных окон — по каждому конкретному стилю, не глобальным
  правилом. Полная таблица «было → стало» — в отчёте реализации,
  `docs/STATUS.md` (запись TASK_023).
- **Нижняя навигация:** ранее активная и неактивная вкладки имели
  одинаковый `fontWeight: "600"` — добавлено различие (неактивная — 500,
  активная — 600) через новый стиль `labelActive` в
  `src/components/TabBar.tsx`; JSX-разметка `Text` не менялась, кроме
  добавления условного стиля.
- **Сохранено без изменений (обоснованно):** KPI-числа и другие крупные
  элементы 24px и выше (`HoursHeroCard.total`, `GoalRing.pct`,
  `MonthSummaryCard.totalHours`/`ringPct`, `MonthlyStatsCard.hoursDone`,
  `ProjectionCard.projValue`, `PaceCard.value`,
  `ServiceYearStatsCard.totalHours`, таймер `timerDisplay` 56px) — уже
  крупные, риск переполнения при дальнейшем росте; и плотные декоративные
  подписи 9–10px в стеснённых по ширине местах (`MonthChip.month`,
  `profile.factLabel`, uppercase-теги в статистике —
  `MonthlyStatsCard.chipLabel`, `ProjectionCard.projLabel`/`footerLabel`,
  `PaceCard.period`, метки `HeatMap`/`TrendChart`).

## 3. Область изменений

Только текстовые стили — `fontSize`, `fontWeight`, где требовалось
`lineHeight` (пропорционально возросшему `fontSize`, напр.
`idleSubtitle`/`recoverySubtitle` в `hours/timer.tsx`), и один новый
стиль-модификатор веса (`labelActive` в `TabBar.tsx`). Список изменённых
файлов (39, все — экраны/компоненты представления):

`app/(tabs)/add.tsx`, `app/(tabs)/hours/entry.tsx`,
`app/(tabs)/hours/history.tsx`, `app/(tabs)/hours/month/[key].tsx`,
`app/(tabs)/hours/stats.tsx`, `app/(tabs)/hours/timer.tsx`,
`app/(tabs)/index.tsx`, `app/(tabs)/profile.tsx`,
`app/(tabs)/timeline.tsx`, `app/upcoming-events.tsx`,
`src/components/Avatar.tsx`, `src/components/Badge.tsx`,
`src/components/Modal.tsx`, `src/components/MonthChip.tsx`,
`src/components/MonthHeader.tsx`, `src/components/MonthSummaryCard.tsx`,
`src/components/MonthlyHoursCard.tsx`,
`src/components/QuickActionsRow.tsx`, `src/components/SessionRow.tsx`,
`src/components/StatCard.tsx`, `src/components/TabBar.tsx`,
`src/components/TalkRow.tsx`, `src/components/TodayCard.tsx`,
`src/components/UpcomingEventsCard.tsx`, `src/components/WheelPicker.tsx`,
`src/components/dashboard/EventCard.tsx`,
`src/components/dashboard/GoalRing.tsx`,
`src/components/dashboard/HeroProgressRing.tsx`,
`src/components/dashboard/HoursHeroCard.tsx`,
`src/components/dashboard/SectionHeader.tsx`,
`src/components/dashboard/SummaryCard.tsx`,
`src/components/dashboard/UpcomingEventRow.tsx`,
`src/components/forms/RecordForm.tsx`,
`src/components/forms/SessionForm.tsx`,
`src/components/settings/BackupSection.tsx`,
`src/components/stats/MonthlyStatsCard.tsx`,
`src/components/stats/PaceCard.tsx`,
`src/components/stats/ProjectionCard.tsx`,
`src/components/stats/ServiceYearStatsCard.tsx`, `src/components/ui.tsx`.

## 4. Вне области (не трогаем)

- Бизнес-логика, модель данных, `StoreContext`, `src/data/*`,
  `src/hooks/*`, `src/types/*` — ни один файл этих директорий не менялся
  (подтверждено `git diff --name-only` перед коммитом).
- Формат отображаемой даты `ДД-ММ-ГГГГ` (TASK_022) и внутренний
  ISO-формат `YYYY-MM-DD` — не затрагивались.
- Компоновка (размеры карточек, отступы, gap, навигация), существующее
  поведение переноса/обрезания длинных названий (`numberOfLines`,
  `ellipsis` там, где было, перенос там, где было) — не менялись.
- Файлы шрифтов SF Pro — не добавлялись и не загружались.
- `AGENTS.md` — не трогаем ни при каких условиях (не менялся, не
  удалялся, не перемещался, не добавлялся в Git).

### Найденный, но не исправляемый в этой задаче дефект

На `/hours/stats` компонент `src/components/stats/MonthlyStatsCard.tsx`
переполняет ширину карточки строкой из трёх чипов (`ДО ЦЕЛИ ОСТАЛОСЬ` /
`ОСТАЛОСЬ ДНЕЙ` / третий чип обрезан за правым краем), из-за чего
соседняя колонка с крупным значением часов (`hoursDone`) схлопывается по
ширине и её текст рендерится по одному символу в столбец. Дефект
воспроизведён и подтверждён на чистом `main` (HEAD `1b8fc5b`, до TASK_023)
— он не связан с типографикой и не вызван и не усилен изменениями этой
задачи. **Сознательно не исправляется в рамках TASK_023** — открытый
вопрос, требует отдельной задачи (проблема раскладки `flexDirection: row`
трёх чипов без переноса/сжатия, не связана с `fontSize`/`fontWeight`).

## 5. Тесты

Полный набор запускался без изменений тестовых файлов — задача чисто
визуальная (`fontSize`/`fontWeight` не проверяются существующими
тестами, кроме одного комментария в
`src/components/dashboard/__tests__/HeroProgressRing.test.tsx`,
упоминающего `fontWeight: "800"` — это комментарий, не assertion, тест не
менялся и не потребовал изменений). Единственный сбой
(`EventCard` › «Сегодня») воспроизводится идентично на чистом `main` —
см. §6.

## 6. Проверки (обязательны перед коммитом)

- `npx tsc --noEmit` — чисто.
- `npx jest` — полный набор, **384/385**; единственный сбой
  (`EventCard.test.tsx`, «Сегодня») — предсуществующий date-boundary
  flake, воспроизведён идентично на чистом `main` (HEAD `1b8fc5b`, до
  TASK_023) через `git stash`/повторный прогон; не связан с типографикой,
  не исправляется в рамках TASK_023.
- `npx expo export --platform web` — 24 статических маршрута, без
  изменений.
- Визуальная проверка dev-сервера на 320×700, 375×812 и 428×926 (узкий
  мобильный, стандартный iPhone, широкий мобильный) — Главная,
  `/upcoming-events`, `/timeline`, `/hours/history`, `/hours/entry`,
  `/hours/stats`, `/profile`: `scrollWidth === innerWidth` на всех трёх
  ширинах (нет горизонтального переполнения); длинные русские названия
  событий обрезаются многоточием (`EventCard`, `UpcomingEventRow`) или
  переносятся (`timeline.tsx`) — как и раньше, поведение не менялось;
  нижняя навигация из пяти пунктов не сжимается и не обрезается.

## 7. Результат

Реализационный коммит `90784c3`
(`style(typography): increase scale and cap fontWeight at 700 (TASK_023)`),
запушен в `origin/main`; локальный `HEAD` совпадает с `origin/main`.
Деплой — `npm run deploy`, gh-pages `67e216b` (был `eb64e66`), бандл
`entry-d2107823f70cc321d1a34ee62b23f717.js`, опубликовано на
**https://adar4026.github.io/Ministry/**. Прод-проверка (read-only,
реальные данные владельца) — Главная, `/timeline`, `/profile`: без
регрессий, консольных ошибок и неуспешных сетевых запросов нет. Версия не
поднималась (остаётся `0.4.4`), тег не ставился. Подробности проверок —
`docs/STATUS.md` (запись TASK_023).
