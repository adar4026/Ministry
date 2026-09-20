# TASK_078 — Тема приложения: светлая / тёмная / системная (по Lex Finance)

**Дата:** 20 сентября 2026
**Статус:** Запланировано (решение владельца при приёмке TASK_077) — код
не писался.
**Скоуп (предварительно):** всё приложение. Не только шторка.

---

## 1. Что просит владелец

Как в Lex Finance: круглая стеклянная кнопка ☼/☾ в шапке боковой шторки
(`.dh-theme` рядом с `.drawer-head`) переключает тему **всего**
приложения — `toggleTheme()` по кругу `light → dark → system`,
`applyTheme()` ставит `data-theme` на `:root`, иконка следует за
фактической темой.

## 2. Почему это отдельная задача, а не часть TASK_077

В Ministry инфраструктуры темы нет: ни `useColorScheme`, ни
`prefers-color-scheme`, ни `data-theme`; все экраны — на жёстких светлых
токенах (`DS`, `MINISTRY`, `COLORS`, `NAV`, `FIGURE_GLASS`, `DRAWER_ICE`),
WebGL-hero читает `--ministry-*` из `ministryCssVars()`, таббар — светлое
стекло. Пункт «Оформление» в меню — заглушка. Переключатель, который
темнит только шторку, а остальное приложение оставляет светлым, владелец
отклонил как половинчатый.

## 3. Ориентировочный план (уточнить при старте)

1. Модель: `theme: "light" | "dark" | "system"` в `MinistrySettings`
   (`mj_settings_v1`, `normalizeMinistrySettings` — default `"system"`).
2. `ThemeProvider` / `useTheme()`: резолв `system` через
   `useColorScheme()` (RN) и `prefers-color-scheme` (web); на web —
   `data-theme` на `<html>` + `color-scheme`, чтобы системные элементы и
   `+html.tsx` следовали теме.
3. Второй набор токенов для каждого кластера (`DS`, `MINISTRY`, `NAV`,
   `FIGURE_GLASS`, `DRAWER_ICE`, `COLORS`) — тёмные значения с теми же
   ролями; hue/contrast-тесты `tokens.test.ts` — на оба набора.
4. Экраны по одному: Главная (hero + WebGL: `ministryCssVars()` на два
   набора, `HeroScene`/`HeroCanvas`), Часы, Скоро, События, Профиль,
   настройки, шторка (`DrawerScene` — тёмный вариант), таббар, модальные
   листы.
5. UI: кнопка ☼/☾ в шапке шторки (между шевроном и ×, 38–40 px, glass),
   экран «Оформление» с тремя radio-карточками (как «Режим» в
   `app/settings.tsx`).
6. Тесты + ADR-007 checklist + deploy.

## 4. Не входит

Изменение состава меню, данных, маршрутов.
