# TASK_078 — Тема приложения: светлая / тёмная / системная (по Lex Finance)

**Дата:** 20 сентября 2026
**Статус:** Implemented / deployed / production verified. Закоммичено
(`0a0fb81`), запушено, задеплоено (`gh-pages` `8849eb3`, бандл
`entry-fdb7c73a…`, хэш совпал с локальной сборкой), проверено на
production. Ожидает проверки владельца на iPhone.
**Скоуп:** всё приложение — модель настройки, инфраструктура темы, тёмные
наборы для всех кластеров токенов, все экраны/листы/таббар, кнопка ☼/☾ в
шапке шторки, экран «Оформление». Не только шторка.

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

## 3. Архитектурное решение (ADR-007: зафиксировано до кода)

Все ~73 файла с цветами читают их из модульных констант (`DS`, `MINISTRY`,
`COLORS`, `NAV`, `HOURS_COLORS`, …) внутри модульных `StyleSheet.create`,
т.е. значение фиксируется при загрузке модуля. Рассмотрено:

- **CSS custom properties** (RNW 0.21 пропускает `var(--x)` в цветах) —
  отвергнуто: тема только на web, native получил бы невалидные строки
  (против ADR-001 — Expo/iPhone как цель).
- **Перемонтирование дерева по `key={scheme}`** — отвергнуто: сбрасывает
  состояние навигатора (переключение на экране «Оформление» выбрасывало
  бы на Главную).
- **Выбрано:** тема через React-контекст + хук, без перемонтирования:
  1. `src/theme/scheme.ts` — реестр активной схемы (`getScheme` /
     `setScheme`), `live(light, dark)` — объект с живыми геттерами: каждый
     кластер токенов становится парой light/dark, `DS.navy` читает
     текущую схему; light-значения не меняются (существующие тесты и
     `MINISTRY`-гарды работают как раньше).
  2. `src/theme/ThemeProvider.tsx` — резолвит `settings.theme`
     (`light|dark|system`) через `useColorScheme()`, ставит схему в реестр
     **во время своего рендера** (до потребителей), даёт `useTheme()` →
     `{ scheme, preference, setPreference }` и `useThemedStyles(make)` —
     мемо-лист на схему. На web синхронизирует `data-theme` +
     `color-scheme` на `<html>` и `meta[name=theme-color]` — аналог
     `applyTheme()` Finance.
  3. Кодмод: `const styles = StyleSheet.create({…})` → `const makeStyles
     = () => StyleSheet.create({…})` + `const styles =
     useThemedStyles(makeStyles)` в каждом компоненте файла. Компонент
     подписан на контекст → перерисовывается при смене темы, лист
     пересобирается один раз на схему.
  4. `MinistrySettings.theme` (`mj_settings_v1`), default `"system"`,
     `normalizeMinistrySettings` терпит отсутствие/мусор.
  5. Тёмные наборы — не инверсия, а отдельные значения по образцу Finance
     dark (`--bg #0f1115`, `--card #1c2029`, `--text #e7ebf2`, `--muted
     #8b93a3`, hero dark `#111827` + приглушённые пятна, стекло `white
     .10/.16`).

## 4. Реализация

### 4.1 Модель и store

- `MinistrySettings.theme: ThemePreference` (`"light" | "dark" | "system"`),
  `ColorScheme` (`src/types`). `DEFAULT_MINISTRY_SETTINGS.theme = "system"`;
  `normalizeMinistrySettings` — отсутствие / мусор → `"system"`;
  `settingsEqual` сравнивает и тему; `THEME_PREFERENCES`, `THEME_LABEL`,
  `THEME_DESCRIPTION`, `isThemePreference`, `nextThemePreference` (цикл
  Finance light → dark → system) — `src/data/ministryMode.ts`.
- `StoreContext.setThemePreference(theme)` — по образцу `setMinistryMode`.

### 4.2 `src/theme/` (новый)

- `scheme.ts` — `getScheme` / `setScheme`, `resolveScheme(pref, system)`
  (неизвестная системная = light), `live(light, dark)` (живые
  enumerable-геттеры; бросает при несовпадении ключей).
- `ThemeProvider.tsx` — `ThemeProvider` (внутри `StoreProvider`), ставит
  схему в реестр и, на web, `data-theme` / `color-scheme` / `body` bg /
  `meta[theme-color]` **синхронно в рендере** (`applyDocumentScheme`,
  `THEME_COLOR = { light #f8fafc, dark #0f1115 }`); `useTheme()` (вне
  провайдера отвечает из реестра — для голых тестов); `useThemedStyles(make)`
  — WeakMap-кэш лист-на-схему, стабильная identity.
- `app/_layout.tsx` — `ThemeProvider` + `ThemedStatusBar` (light-иконки в
  dark).

### 4.3 Токены — пары light/dark

Все кластеры превращены в `X_LIGHT` / `X_DARK` → `X = live(...)`. Light
= прежние значения (ни один light-hex не изменился). Dark по Finance dark:

| Кластер | Тёмные ключевые значения |
|---|---|
| `DS` | navy `#e7ebf2`, cardBg `#1c2029`, homeBase `#0f1115`, subText `#8b93a3`, subInk `#9aa3b5`, accent `#5b8bff`, divider white .10; новые `pressedBg`, `dangerBg`, `navyFill` |
| `GRADIENTS` (новый кластер вместо `RING_STOPS`/`HOME_GRADIENT`/`HOME_MINT_GRADIENT*`) | home `#161c22→#0f1115`, homeMint `#0f1f1c→#0f1115`, accentRing на dark-accent |
| `MINISTRY` (тип `MinistryPalette`) | heroTop `#0f2b26`, heroA `#146b55`, heroB `#1d5f52`, heroC `#284c45`, heroDeep `#06201b`, bg `#0f1115`, surface `#1c2029`, ink `#e7ebf2`, ink2 `#a9b8b4`, primary `#3fc4a3`, accent `#2fc492`, accentSoft `#163a32`, heroAlpha `.36/.30/.28`, heroLight `.2` — та же green-teal семья (hue 150–175°) |
| `NAV` | Finance dark nav: bg `rgba(30,30,36,.42)`, solid `rgba(28,32,41,.96)`, border white .16, pill на dark-accent .26, blur 16 |
| `FIGURE_GLASS` | стекло цифры — белые глифы, чёрный lift, mint-база глубже |
| `DRAWER_ICE` | Finance dark `--hero-*` verbatim (top `#111827`, glow `rgba(120,160,255,.10)`, b1–b4 `.34/.22/.18/.30`, glass `.10/.16`, sep `.14×.45`); ink `#e7ebf2`, ink2 `#a3abbb` (Finance `--muted #8b93a3` = 3.5:1 в центре sky-blob'а → поднят на шаг, зеркально light-решению) |
| `HERO_GLASS` (новый) | белые rgba-подложки hero/мини-календаря/☰ (были литералами) → на dark white `.08–.18` |
| `COLORS` | text/navy `#e7ebf2`, muted `#8b93a3`, bg `#0f1115`, card `#1c2029`, border white .10, accent `#5b8bff`, danger `#f87171`, green `#4ade80`, teal `#2dd4bf`, *Bg-тинты глубокие; новые `warnBg`, `navyFill`, `blueFill` |
| `CAT` / `TALK_CATEGORY` / custom | bg — глубокий тон того же hue, tx — светлый конец, dot общий |
| `HOURS_COLORS`, `HISTORY_COLORS`, `ADD_TIME_COLORS`, `TIMELINE_COLORS` | графит `#0f1115` / `#1c2029`, текст `#f2f4f8` / `#9aa1ae` / `#6b7280`; lavender-акцент истории `#a78bfa`, filledDay `#2e2657`; новые `pressed`, `secondaryButton`, `dangerButtonBg` |
| `CHART` | fact `#818cf8`, ideal `#3f3f8f`, axis/grid white .28/.12, label `#cbd5e1` |

`ministryCssVars()` → `:root{light}:root[data-theme="dark"]{dark}`.

### 4.4 Кодмод (81 файл)

`const styles = StyleSheet.create({…})` → `const makeStyles = () =>
StyleSheet.create({…})`; в каждый компонент файла, читающий `styles.`, —
`const styles = useThemedStyles(makeStyles)` + импорт `@/theme` (скрипт со
скобочным сканером сигнатур; отчёт: ни одного helper'а с хуком, ни одного
модульного использования). Вручную: `heroFigure.tsx` (`HERO` → `makeHERO`
/ `useHero()`, `GLASS_STYLES` → фабрика), `HomeHero` (`HERO` внутри
фабрики), `PublisherHero` (`useHero()`), `ui.tsx` (generic-компонент),
`TabBar.tsx` (модульные `Platform.select` с `NAV` → `makeGlass` +
`useThemedStyles`), `GoalRing` / `HomeBackground` → `GRADIENTS.*`,
`HeroCanvas.web` (`fallback()` вместо константы, перезапуск шейдера по
`scheme`).

### 4.5 Литералы, ставшие токенами

`rgba(255,255,255,…)` в hero-pill'ах / треке / мини-календаре / ☰ →
`HERO_GLASS`; `#F5F7FB` → `DS.pressedBg`; `#fee2e2` → `DS.dangerBg`;
`#f1f5f9` трек → `COLORS.light`; `#166534` → `DS.successInk`; `#fff`
подложки листов/чипов/инпутов → `COLORS.card`; `#F7F7F9` / `#F2F2F7` /
`#FDECEC` → `HOURS_COLORS.*`; 26 hex в `timer.tsx` → `COLORS.*`;
`rgba(0,0,0,.06)` кромки → `HERO_GLASS.hairline`. `#fff` на акцентных
заливках и `shadowColor: "#000"` — оставлены (уместны в обеих темах).
Роли «текст и заливка одним токеном» (`COLORS.navy` у аватара,
`COLORS.blue` у кнопок, `DS.navy` у иконки в `AddActionSheet`,
`COLORS.card` как цвет текста кнопки) разведены на `*Fill` / `onAccent`.

### 4.6 UI

- Шторка: кнопка ☼/☾ (`testID="drawer-theme"`, 36 pt стекло + кромка, слева
  от ×; иконки `SunIcon` / `MoonIcon` = пути Finance `.dh-theme`; иконка по
  фактической схеме, подпись «Сменить тему. Сейчас: …»; `onPress` =
  `theme.cycle`). × стал 40 pt (hitSlop 6 → зона 52), `CLOSE_BTN_SPACE =
  40 + 6 + 36 + 2`; зазоры шапки ужаты (`gap 10`, шеврон `−4`), чтобы
  «Личный профиль» на 375 px остался в одну строку (проверено: 119 px,
  1 строка).
- `app/appearance.tsx` — «Оформление»: карточка «Цветовая тема» с
  подсказкой («Сейчас по настройке устройства: тёмная/светлая» для
  system) и radiogroup из трёх карточек (`testID="theme-*"`). Пункт меню
  `appearance` получил `href: "/appearance"` (шторка и `/profile`).
- `+html.tsx`: inline-скрипт до бандла ставит `data-theme="dark"` из
  `localStorage.mj_settings_v1` / media query (нет светлой вспышки);
  `html[data-theme="dark"]` фон `#0f1115`; glass-fallback таббара для
  обеих тем (`NAV_LIGHT` / `NAV_DARK`).

### 4.7 Тесты

- Новые: `src/theme/__tests__/scheme.test.ts` (3), `ThemeProvider.test.tsx`
  (4: system → device, явное предпочтение, смена без remount + persist,
  identity листа, вне провайдера — из реестра), `app/__tests__/
  appearanceScreen.test.tsx` (2), `HomeDrawer.test` — кнопка темы (цикл +
  persist), `tokens.test` — 5 dark-гардов (переключение live-кластеров,
  DS/MINISTRY/COLORS/DRAWER_ICE контраст, hue MINISTRY_DARK 150–175°,
  Finance dark verbatim), `ministryMode.test` — тема/цикл/equal.
- Обновлены под `theme` в настройках: `settingsScreen`,
  `ministryModeStore`, `ministryMode`, `profileMenu` (`Оформление`
  routed), `profile.test` (Оформление → `/appearance`), `HomeBackground` /
  `index.test` (`GRADIENTS.*`), `tokens.test` (два CSS-блока, ×2
  переменных), `HomeDrawer.test` (× 40 pt; `ThemeProvider` в харнесе —
  в обоих местах, иначе перемонтирование).

## 5. Проверки (выполнены)

- `npx tsc --noEmit` — чисто; `npx jest` — **91/91 suites, 1337/1337**
  (было 88/1320: +3 suites, +17 tests); `npx expo export --platform web`
  — собирается; `git diff --check` — чисто.
- Браузер (dev-сервер, 375 px), тёмная тема через ☼/☾ в шторке (system →
  light → dark): `data-theme="dark"`, `color-scheme: dark`,
  `mj_settings_v1.theme = "dark"`; экраны в dark: Главная (pine-hero,
  WebGL перезапущен, pill'ы `HERO_GLASS`), Часы, Скоро, События, Профиль,
  Настройки, Оформление, Таймер, История (lavender-акцент), Статистика,
  Добавить время, Уведомления, Участие, Месяц, Добавить (таб), шторка
  (Finance dark) — все на графитовых грунтах, светлых «дырок» нет;
  консоль свежей вкладки чиста; навигация при смене темы не
  сбрасывается (переключение на экране «Оформление» оставляет на нём).
- System-режим: эмуляция `prefers-color-scheme: dark` → `data-theme` и
  подсказка «Сейчас по настройке устройства: тёмная» меняются вживую, и
  обратно.
- Светлая тема: Главная, Оформление, шторка — как до TASK_078.
- Перезагрузка с сохранённым `dark`: `data-theme` уже `dark` до бандла
  (boot-скрипт), `body` `rgb(15,17,21)`.
- Dev-сервер отвечает 404 на прямые URL `/appearance`, `/settings`,
  `/participation` (страницы при этом рендерятся) — поведение dev-сервера
  для верхнеуровневых маршрутов, не связано с задачей.

## 6. Architecture Review Checklist (ADR-007)

- [x] Нет новых зависимостей; `package.json` не менялся.
- [x] Модель: одно новое поле `theme` в `mj_settings_v1` без смены версии
      ключа — `normalizeMinistrySettings` терпит его отсутствие
      (старые установки → `"system"`), тест миграции обновлён.
- [x] Один источник данных: `settings.theme` в StoreContext →
      `ThemeProvider`; шторка и «Оформление» пишут одно поле.
- [x] Архитектурное решение (live-токены + `useThemedStyles`, без
      remount) описано в §3 ДО кода и в `docs/ARCHITECTURE.md`; ADR не
      нужен — ADR-001/005 не нарушены (кроссплатформенно, expo-router
      без изменений маршрутизации).
- [x] Light-палитра: ни один light-hex не изменён; hue/contrast-гарды
      `MINISTRY` — без изменений; dark-наборы под собственными гардами
      (AA на грунтах, MINISTRY_DARK в green-teal band).
- [x] Доступность: radiogroup/radio с `accessibilityState`, a11y-подпись
      кнопки темы называет предпочтение, × зона ≥ 44 pt (hitSlop),
      StatusBar по схеме, `color-scheme` на `<html>`.
- [x] Производительность: лист на схему строится один раз (WeakMap),
      identity стабильна; шейдер перезапускается только по смене схемы.
- [x] Мёртвый код: `RING_STOPS` / `ACCENT_RING_STOPS` / `HOME_GRADIENT` /
      `HOME_MINT_GRADIENT(_STOPS)` заменены `GRADIENTS`; `DRAWER_CHEVRON`
      и hex-литералы убраны.
- [x] Regression: +17 тестов (см. §4.7), 91/91 suites.
- [x] Commit (`0a0fb81`) → push → deploy (`gh-pages` `8849eb3`) →
      production проверен: бандл-хэш совпал, `index.html` несёт boot-скрипт
      и dark-блок CSS-переменных, ☼/☾ переключает и сохраняет тему,
      перезагрузка стартует тёмной до бандла, консоль чиста.
- [ ] Живая проверка на iPhone (PWA standalone), в т.ч. system-режим при
      смене темы iOS — post-deploy шаг владельца.

## 7. Не входит

Изменение состава меню, данных, маршрутов.
