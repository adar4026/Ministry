# TASK_001 — Миграция на Expo + React Native

**Статус:** ГОТОВО К ЗАПУСКУ  
**Приоритет:** P0  
**Исполнитель:** Claude Code

---

## Контекст

Этот репозиторий содержит начальную реализацию приложения Ministry.

Текущий прототип — React веб-компонент (`App.tsx`), работающий с localStorage.  
Цель этой задачи — мигрировать его на Expo + React Native без потери данных и функциональности.

---

## Первый промпт для Claude Code

```
This repository contains the initial implementation of the Ministry application.
Read all project documentation before making any changes.

Required reading:
- docs/README.md
- docs/PROJECT_CONSTITUTION.md
- docs/ARCHITECTURE.md
- docs/ROADMAP.md
- docs/STATUS.md
- docs/PROGRESS.md
- docs/TASK_001.md

Do not write any code yet.

First:
1. Review the repository.
2. Verify that the documentation matches the current implementation.
3. Summarize your understanding of the project.
4. List any inconsistencies you find.
5. Explain how you plan to execute TASK_001.

Only after the review is complete should implementation begin.
```

---

## Задача

Мигрировать проект с React Web на Expo (React Native).

---

## Требования

### Обязательно
- [ ] Использовать `expo-router` для навигации (файловая структура в `app/`)
- [ ] Заменить `localStorage` на `AsyncStorage` (`@react-native-async-storage/async-storage`)
- [ ] Сохранить все существующие данные (seed.js не трогать)
- [ ] Реализовать все 5 экранов: Главная, Часы, События, Речи, Добавить
- [ ] Сохранить функциональность CRUD для часов, событий и речей
- [ ] Приложение должно запускаться через `npx expo start`
- [ ] Приложение должно работать в Expo Go на iOS и Android

### Нельзя
- Менять ключи AsyncStorage (см. ARCHITECTURE.md)
- Удалять или изменять seed-данные
- Добавлять новые зависимости без обоснования
- Оставлять репозиторий в нерабочем состоянии

---

## Структура (целевая)

```
app/
├── _layout.tsx          # Root layout + Tab navigator
└── (tabs)/
    ├── index.tsx        # Главная
    ├── hours.tsx        # Часы
    ├── timeline.tsx     # События
    ├── talks.tsx        # Речи
    └── add.tsx          # Добавить

src/
├── data/
│   ├── seed.ts
│   └── constants.ts
├── store/
│   └── StoreContext.tsx
├── hooks/
│   └── useStorage.ts
└── components/
    └── (переиспользуемые компоненты)
```

---

## Порядок выполнения

1. Прочитай всю документацию
2. Проверь текущую структуру проекта
3. Инициализируй Expo если нужно (`npx create-expo-app`)
4. Настрой expo-router
5. Перенеси данные и стор
6. Создай экраны по одному, начиная с Главной
7. Проверь каждый экран перед переходом к следующему
8. Финальный тест: `npx expo start` → Expo Go на телефоне

---

## Критерий завершения

Приложение запускается на телефоне через Expo Go, все 5 вкладок работают, данные сохраняются между сессиями.

---

## После завершения

Обнови `PROGRESS.md` и `STATUS.md`.  
Создай `TASK_002.md` для следующего шага (редактирование записей).
