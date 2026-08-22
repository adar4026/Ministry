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
│   │   │   ├── stats.tsx       # Статистика (TASK_005E)
│   │   │   └── month/[key].tsx # Детали месяца
│   │   ├── add.tsx             # Добавить
│   │   ├── timeline.tsx        # События (вкл. публичные речи)
│   │   ├── profile.tsx         # Профиль
│   │   └── _layout.tsx         # Tab navigator (5 вкладок)
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
│   │   └── timer.ts            # Чистые функции таймера (TASK_005C)
│   │
│   ├── store/
│   │   └── StoreContext.tsx    # Global state (Context API)
│   │
│   ├── hooks/
│   │   ├── useStorage.ts       # AsyncStorage wrapper
│   │   └── useTimer.ts         # Жизненный цикл mj_timer_v1
│   │
│   ├── components/             # Переиспользуемые компоненты
│   │   ├── dashboard/          # Компоненты Главной (TASK_007)
│   │   ├── forms/              # RecordForm, SessionForm, EventForm, TalkForm
│   │   ├── stats/              # Карточки статистики (TASK_005E)
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

## Ключи хранилища (AsyncStorage)

```
mj_records_v1            — массив Record[]
mj_events_v1             — массив Event[]
mj_talks_v1              — массив Talk[]
mj_sessions_v1           — массив Session[]        (TASK_005A)
mj_timer_v1              — TimerState              (TASK_005C)
mj_profile_v1            — UserProfile             (TASK_042)
mj_custom_categories_v1  — CustomCategory[]        (TASK_045)
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
├── loaded:   boolean
├── saveRecord  / deleteRecord
├── saveEvent   / deleteEvent
├── saveTalk    / deleteTalk
└── saveSession / deleteSession   (TASK_005A)
```

Все экраны читают из стора через `useStore()`. Никакого локального состояния для данных.

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
