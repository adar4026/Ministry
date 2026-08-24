# AGENTS.md — Ministry

Этот файл читается Codex автоматически при каждом запуске.

---

## Обязательное чтение перед любой работой

1. `docs/ARCHITECTURE.md`
2. `docs/STATUS.md`
3. `docs/DECISIONS.md`
4. Текущую задачу в `docs/TASKS/`

**Не пиши код до завершения чтения.**

---

## Правила

- Нет задачи в TASKS/ — нет кода
- Репозиторий buildable после каждого коммита
- Данные пользователя неприкосновенны (seed.js не трогать)
- Один логический этап — один коммит
- После задачи: обновить docs/STATUS.md
- Deploy и Git Tag — только после успешного прохождения Architecture
  Review Checklist задачи (см. ADR-007, `docs/DECISIONS.md`)

---

## Проект

**Ministry** — личный журнал теократического служения.
**Владелец:** сопровождающий проекта Ministry.
**Прототип:** `prototype/App.jsx` (React + localStorage)
**Цель:** Expo + React Native на iPhone.
**Данные:** `src/data/seed.js` — история с 2003 года, не изменять.
