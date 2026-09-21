# TASK_080 — Финальная иконка Ministry: установка во все слоты

**Дата:** 21 сентября 2026
**Статус:** Implemented / deployed / production verified. §4a —
поправка владельца после первого прохода: Android adaptive icon
переделан на отдельный foreground-ассет с прозрачной safe zone вместо
edge-to-edge полноформатного изображения. Закоммичено (`7d24af6`),
запушено в `origin/main`, задеплоено на GitHub Pages (`gh-pages`
`b63a0dca`), проверено на production (см. §7).
**Основание:** ADR-004 (нет TASK — нет кода). Владелец предоставил
финальную утверждённую иконку (`public/ministry-icon.png`, уже в
репозитории как untracked-файл) и явно запретил любое редактирование
самого изображения (без перекраски, кадрирования, перерисовки, рамок и
padding). Прецедент — TASK_012 (первая установка иконки); в этот раз
образ — конечный, cutout/blur-обработка (как в TASK_012 §4) не
выполняется.

---

## 1. Цель

Заменить иконку приложения на новую утверждённую графику Ministry
(«часы + книга + белая башня», исходник 1254×1254 PNG без альфы) во всех
местах, где сейчас используется иконка: Expo/native icon, Android
adaptive icon, web favicon, apple-touch-icon. Web-манифеста /
`site.webmanifest` в проекте не обнаружено (см. §3) — этот пункт не
применим.

## 2. Ограничения (от владельца)

- Исходное изображение не редактируется: без перекраски, кадрирования,
  перерисовки, добавления рамок/padding.
- Разрешено: масштабирование (resize) без изменения композиции для
  производных размеров (180×180, 1024×1024 и т.п.), исходный файл
  `public/ministry-icon.png` сохраняется без изменений.
- Native-конфигурация не должна ссылаться на файл напрямую из `public`
  — для Expo используется копия/производная в `assets/`.
- Не трогать: UI экранов, drawer, цвета приложения, логотип в
  интерфейсе, навигацию, Profile, Home, данные пользователя, бизнес-логику.
- Commit / push / deploy — только после проверки и подтверждения
  владельцем.

## 3. Текущая конфигурация (до задачи)

- `expo.icon` = `./assets/icon.png` (1024×1024, из TASK_012).
- `expo.android.adaptiveIcon.foregroundImage` =
  `./assets/adaptive-icon-foreground.png`,
  `backgroundImage` = `./assets/adaptive-icon-background.png` (TASK_012:
  ручной cutout + blur, не переносится в эту задачу — новый образ
  финальный и не редактируется).
- `expo.web.favicon` = `./assets/favicon.png` (196×196).
- `app/+html.tsx` — статический `<link rel="apple-touch-icon"
  href="/Ministry/apple-touch-icon.png">`, файл лежит в
  `public/apple-touch-icon.png` (180×180), копируется в `dist/` как есть
  при экспорте (не генерируется).
- `manifest.json` / `site.webmanifest` / Expo-generated web manifest —
  в проекте не найдены (grep по `app/`, `src/`, `public/`, `app.json`) —
  PWA-манифеста нет, пункт задачи «4. PWA / manifest» не применим.
- `dist/favicon.ico` — генерируется Expo-экспортом из
  `expo.web.favicon` (не хранится в репозитории, `dist/` в `.gitignore`).

## 4. Решение

Один источник — `public/ministry-icon.png` (не редактируется, остаётся
как есть). Производные (только resize, без изменения композиции):

| Файл | Размер | Источник | Назначение |
|------|--------|----------|------------|
| `assets/ministry-icon.png` | 1024×1024 | resize из `public/ministry-icon.png` | `expo.icon`, `expo.web.favicon` |
| `assets/ministry-icon-adaptive-foreground.png` | 1024×1024 RGBA | тот же артворк, resize до 676×676 + центрирование на прозрачном холсте (§4a) | `android.adaptiveIcon.foregroundImage` |
| `public/apple-touch-icon.png` | 180×180 | resize из `public/ministry-icon.png` (заменяет старое содержимое) | `<link rel="apple-touch-icon">` в `app/+html.tsx` (ссылка не меняется) |

**Android adaptive icon (§4a, поправка владельца):** edge-to-edge
`ministry-icon.png` как foreground был отклонён — маска Android
(круг/squircle) обрезала бы артворк без запаса. Вместо этого отдельный
ассет `assets/ministry-icon-adaptive-foreground.png` (1024×1024, RGBA):
неизменённый `public/ministry-icon.png`, **масштабированный** (resize,
без кадрирования/перекраски/перерисовки) до 676×676 (66 % от 1024 —
рекомендованная Android safe zone, диаметр 66dp на холсте 108dp) и
размещённый по центру полностью прозрачного холста 1024×1024 (176 px
прозрачного inset с каждой стороны). Сам artwork внутри своего квадрата
не менялся — изменилось только его положение и масштаб на новом, ранее
не существовавшем холсте.

`adaptiveIcon.backgroundColor` = `#323f70` — тёмно-синий, посчитан как
усреднение пикселей внешней (за пределами скруглённого квадрата)
подложки исходного `ministry-icon.png` (кольцо точек по периметру
холста, шаг 20 px, скрипт на `jimp-compact`), а не подобран произвольно.
Он виден в зазоре safe zone вокруг foreground и на фоновых элементах
лончера.

**iOS/generic icon:** аналогично, у образа есть собственный (запечённый)
скруглённый квадрат с более тёмной подложкой вокруг — платформа наложит
свою маску на весь квадрат целиком (включая подложку), поэтому вокруг
уже скруглённой графики может быть видна тонкая тёмная кайма на
некоторых поверхностях. Это результат самого утверждённого изображения,
не обработки в рамках задачи — при необходимости устранения требуется
отдельное решение владельца (правка исходника, вне скоупа TASK_080).

## 5. Старые ассеты — удаление

После обновления `app.json` файлы `assets/icon.png`,
`assets/adaptive-icon-foreground.png`,
`assets/adaptive-icon-background.png`, `assets/favicon.png` не имеют ни
одной ссылки в проекте (проверено grep по `app/`, `src/`, `*.json` до и
после правки) — удаляются как часть этой задачи.

## 6. Проверка

`tsc --noEmit`, `jest`, `npx expo export --platform web`, ручная
проверка `dist/` (favicon.ico, apple-touch-icon.png, отсутствие ссылок
на старые файлы), `git diff --check`. Результаты — в отчёте владельцу и,
после подтверждения, в `docs/STATUS.md`.

## 7. Деплой и production-проверка (после подтверждения владельцем)

- Коммит `7d24af6` (`main`), запушен в `origin/main`.
- `npm run deploy` → `expo export --platform web && gh-pages -d dist
  --nojekyll`; `gh-pages` HEAD после публикации — `b63a0dca`.
- GitHub Pages CDN отдал предыдущий (закэшированный) бандл при первой
  проверке сразу после деплоя — известная задержка ~20 с – 2 мин;
  повторный опрос с `Cache-Control: no-cache` и cache-busting query
  подтвердил обновление в течение первой же повторной попытки.
- Побайтовое сравнение (`shasum -a 256`) production-файлов с локальным
  `dist/`: `favicon.ico`, `apple-touch-icon.png`, `ministry-icon.png` и
  JS-бандл (`entry-73082e35084373bf60a2783385c8cc14.js`) — хэши
  совпадают.
- Старые icon-файлы на production (`icon.png`, `favicon.png`,
  `adaptive-icon-foreground.png`, `adaptive-icon-background.png`) —
  все 404.
- В production-бандле нет ни одной строки со старыми путями (`grep` по
  скачанному `entry-*.js`).
- Визуально в свежей вкладке браузера (`adar4026.github.io/Ministry`,
  без предшествующего кэша/AsyncStorage): консоль без ошибок, favicon
  рендерится как новая иконка Ministry (проверено через `<link
  rel="icon">` → живой fetch → inline `<img>`), `apple-touch-icon`
  отдаёт корректный 180×180 PNG. Нулевые метрики на экране — пустой
  seed для новой браузерной сессии (TASK_009), не утечка данных
  владельца.
- Working tree после финального коммита — чистый (`git status
  --porcelain` пуст).
- **Native (iOS/Android) сборка не выполнялась** в рамках этого
  web-деплоя — `npm run deploy` собирает только web-экспорт. Обновлённая
  иконка/adaptive icon конфигурация в `app.json` (§4, §4a) применится
  автоматически при следующей native-сборке (`expo prebuild` / EAS
  Build) — отдельное, не выполненное в этой задаче действие.
