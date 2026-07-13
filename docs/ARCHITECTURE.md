# ARCHITECTURE — Ministry

## Стек

| Слой | Технология | Статус |
|------|-----------|--------|
| Платформа | Expo (React Native) | Цель |
| Навигация | expo-router | Цель |
| Хранилище | AsyncStorage | Цель |
| Текущий прототип | React + localStorage | Есть |
| Язык | JavaScript (→ TypeScript) | Планируется |

---

## Структура папок (целевая)

```
ministry/
├── app/                        # expo-router screens
│   ├── (tabs)/
│   │   ├── index.tsx           # Главная (Dashboard)
│   │   ├── hours.tsx           # Часы
│   │   ├── timeline.tsx        # События
│   │   ├── talks.tsx           # Речи
│   │   └── add.tsx             # Добавить
│   └── _layout.tsx             # Root layout + Tab navigator
│
├── src/
│   ├── data/
│   │   ├── seed.ts             # Все исторические данные
│   │   └── constants.ts        # Цвета, категории, хелперы
│   │
│   ├── store/
│   │   └── StoreContext.tsx    # Global state (Context API)
│   │
│   ├── hooks/
│   │   └── useStorage.ts       # AsyncStorage wrapper
│   │
│   ├── components/             # Переиспользуемые компоненты
│   │   ├── Badge.tsx
│   │   ├── StatCard.tsx
│   │   ├── MonthChip.tsx
│   │   └── TalkRow.tsx
│   │
│   └── types/
│       └── index.ts            # TypeScript типы
│
├── docs/                       # Вся документация проекта
├── App.tsx                     # Точка входа
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
mj_records_v1    — массив Record[]
mj_events_v1     — массив Event[]
mj_talks_v1      — массив Talk[]
mj_sessions_v1   — массив Session[]  (TASK_005A)
```

> ⚠️ При изменении схемы данных — менять версию ключа (v1 → v2) и писать миграцию.

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
