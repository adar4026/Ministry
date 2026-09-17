# TASK_066 — Главная: hamburger-header и боковая шторка с профилем

**Дата:** Сентябрь 2026
**Статус:** Реализовано, ожидает подтверждения владельца (не запушено,
не задеплоено, тег не проставлен)
**Референсы:** Lexcar — верхняя строка `☰  название`
(`src/components/SideDrawer.js`, `App.js`); Alex Finance — боковая шторка
(`index.html`, блок `.drawer*`, TASK_017/050/051 там): группировка меню,
стеклянные карточки на сцене Главной, footer «Название · vX.Y.Z /
Обновлено: месяц год». Ministry — своя палитра `MINISTRY` (TASK_065).

---

## 1. Что было

Верх Главной (`app/(tabs)/index.tsx`, TASK_065): слева «Христианская
жизнь» + дата, справа круглый `ProfileAvatar` (TASK_043), ведущий на
вкладку `/profile`. Профиль — отдельная вкладка `app/(tabs)/profile.tsx`:
`ProfileHeroCard` (имя, фото, до трёх памятных дат) → `ProfileEditSheet`;
«Настройки» (Уведомления → `/notifications`, пять заглушек «Появится
позже»); «Данные и резервные копии» (`BackupSection` + «Синхронизация»);
«О приложении» (версия — литерал `"0.4.4"`, второй такой же литерал в
`src/data/backup.ts`; «История изменений», «Обратная связь» — заглушки).

## 2. Модель профиля — что реально хранится

`UserProfile` (`src/types/index.ts`, ключ `mj_profile_v1`):
`displayName?`, `profilePhotoUri?`, `events: ProfileEvent[]` — **до трёх
записей «название + дата», которые пользователь называет сам** (TASK_042
сознательно отказался от системных полей «крещение / пионер»). Поэтому
«Крещение», «Пионер», «Последний переезд» в шторке — это те же три
`profile.events` владельца, показанные из того же `useStore().profile`,
которым пользуются `ProfileHeroCard` и `ProfileEditSheet`. Никаких новых
полей, никакой второй копии данных: изменение в редакторе профиля
мгновенно видно в шторке (один стор, одна подписка).

## 3. Решение

### 3.1 Header Главной

`[ ☰ ]  Христианская жизнь` — кнопка меню `MenuIcon` (три линии,
`react-native-svg`, как остальные иконки проекта; не emoji) слева,
touch-area 44×44, без круга/карточки, цвет `MINISTRY.ink`;
`accessibilityLabel="Открыть меню"`, `accessibilityState.expanded`.
Заголовок и дата — тем же шрифтом/размером/насыщенностью, что и раньше,
начинаются правее кнопки с отступом 10 px. Круглый аватар справа удалён
полностью — без пустого контейнера, без зарезервированной ширины. Hero-фон,
цифры месяца, прогресс, кнопки, даты и логика TASK_065 не тронуты.

### 3.2 Шторка `HomeDrawer`

`src/components/drawer/HomeDrawer.tsx`. Тот же базовый примитив, что у
`AddActionSheet`/`ProfileEditSheet` (TASK_058/042): `RNModal transparent`
без встроенной анимации + `Animated` + `PanResponder` из `react-native`
— он уже проверен на блокировку скролла фона и перекрытие плавающего
TabBar, вложенные модалки (редактор профиля, предпросмотр восстановления)
в нём уже используются. Новых зависимостей нет.

- Панель слева, ширина `min(86 % ширины окна, 360)` — справа остаётся
  полоска Главной; затемнённый backdrop (`rgba(10,36,30,.34)` + blur на
  web); тап по нему закрывает.
- Открытие: `translateX` от `-width` до 0 (spring, 320 ms), backdrop
  проявляется; закрытие — 220 ms timing, модалка размонтируется после
  анимации. `prefers-reduced-motion` (web) → мгновенно.
- Свайп влево по панели (PanResponder: горизонтальный жест заметнее
  вертикального) тянет панель, отпускание дальше 60 px или быстрее
  0.5 px/ms — закрывает, иначе возвращает. Вертикальный скролл внутри
  панели не перехватывается.
- Escape (web) закрывает; `role="dialog"`, `accessibilityViewIsModal`,
  `accessibilityLabel="Меню"`; RNW `Modal` держит фокус внутри и
  возвращает его на hamburger при закрытии.
- Safe-area: верхний inset панели — `insets.top + 12`, нижний — в footer.
- Собственный вертикальный `ScrollView`; основной экран под шторкой не
  скроллится (модалка перекрывает его целиком, включая TabBar).
- Фон панели — `HeroScene` в новом статичном режиме (`animated={false}`):
  тот же SVG-fallback палитры Ministry (mint → `MINISTRY.bg`, три складки),
  без второго WebGL-контекста. Поверх — светлые стеклянные карточки.
- Лёгкая haptic-отдача при открытии (как у `AddActionSheet`).

### 3.3 Содержимое шторки (сверху вниз)

1. **Профильный блок** `ProfileSummary` (`src/components/profile/`):
   аватар (`ProfileAvatar` — те же фото/инициалы/`onInvalidPhoto`, что
   раньше в header), имя (или «Мой профиль»), ниже — строки по каждому
   `profile.events`: название → дата (`formatDateDMY`, канонический формат
   `DD-MM-YYYY` TASK_022) и прошедший срок (`calendarElapsed` /
   `formatProfileEventElapsed`, как в `ProfileHeroCard`). Пустой профиль —
   «Настроить профиль / Добавьте имя, фотографию и важные даты». Тап по
   блоку открывает `ProfileEditSheet`. Справа — круглая кнопка «×»
   (`XIcon`, 44×44, «Закрыть меню»).
2. **ПРОФИЛЬ** — «Личные данные» (подпись: имя или «Имя и фотография»),
   «Памятные даты» (подпись «N из 3»). Оба → `ProfileEditSheet`.
3. **СЛУЖЕНИЕ** — Цели, Календарь служения, Статистика (те же заглушки
   «Появится позже», что на странице Профиль).
4. **ПРИЛОЖЕНИЕ** — Уведомления (→ `/notifications`), Оформление, Язык.
5. **ДАННЫЕ И РЕЗЕРВНЫЕ КОПИИ** — `BackupSection` (Создать / Восстановить /
   Последняя копия — вся логика TASK_062/064 без изменений) +
   «Синхронизация · Скоро — через A-Lex Core».
6. **О ПРИЛОЖЕНИИ** — Версия приложения (значение), История изменений,
   Обратная связь.
7. **Footer** (в потоке скролла, не fixed): `A-Lex Ministry · v0.4.4`
   (полужирная) / `Обновлено: сентябрь 2026` (светлее), по центру, с
   воздухом сверху и снизу + нижний safe-area inset.

Список пунктов настроек и «О приложении» вынесен в общий
`src/components/profile/profileMenu.ts` — и страница Профиль, и шторка
рендерят **один и тот же** массив, заглушка `soon()` одна.

### 3.4 Внешний вид групп

`DrawerGroup`: заголовок группы — 12 px, uppercase, `MINISTRY.ink2`;
карточка — `rgba(255,255,255,.62)` + blur 14 px (web), рамка 1 px
`rgba(255,255,255,.7)`, радиус 22, тень практически отсутствует
(`0 4px 12px / 0.04`). Строки — `ProfileSettingsRow` в варианте `drawer`
(через `ProfileRowVariantContext`, а не через пропсы — так `BackupSection`
не нужно ничего прокидывать): тонкая контурная иконка `MINISTRY.ink`
без цветной плитки, заголовок `MINISTRY.ink`, подпись `MINISTRY.ink2`,
chevron `rgba(15,42,38,.35)`, разделитель с отступом под иконку, высота
строки ≥ 56. Для `tone="danger"` — тот же `DS.danger`.

### 3.5 Версия — единый источник

`src/data/appInfo.ts`: `APP_VERSION = "0.4.4"` (совпадает с
`package.json` и тегом `v0.4.4`; тест сверяет с `package.json`),
`APP_UPDATED = "2026-09"`, `formatUpdatedLabel()` → «сентябрь 2026»,
`APP_DISPLAY_NAME = "A-Lex Ministry"`. `src/data/backup.ts` реэкспортирует
`APP_VERSION` оттуда (внешний контракт `backup.ts` не изменился), страница
Профиль и шторка читают ту же константу. Версия **не** поднималась —
это отдельный релизный шаг владельца.

### 3.6 Вкладка «Профиль»

Не удалена. На неё завязаны: `Tabs.Screen name="profile"` и `TabBar`
(`TAB_ORDER`), `app/notifications.tsx` (`fallbackHref="/profile"`), тесты
`profile.test.tsx` и `notificationsScreen.test.tsx`. Всё содержимое
страницы теперь доступно в шторке из тех же компонентов; вкладка стала
дублирующей — см. §6 «Открытый вопрос владельцу».

## 4. Файлы

| Файл | Что |
|---|---|
| `app/(tabs)/index.tsx` | header: hamburger + заголовок, аватар убран; `HomeDrawer` |
| `src/components/drawer/HomeDrawer.tsx` | шторка: модалка, анимация, свайп, Escape, контент |
| `src/components/drawer/DrawerGroup.tsx` | заголовок группы + стеклянная карточка |
| `src/components/drawer/DrawerFooter.tsx` | фирменный footer |
| `src/components/profile/ProfileSummary.tsx` | компактный профильный блок |
| `src/components/profile/profileMenu.ts` | общие пункты меню Профиля (страница + шторка) |
| `src/components/profile/ProfileSettingsRow.tsx` | `ProfileRowVariantContext` («card» / «drawer») |
| `src/components/dashboard/HeroScene.tsx` | проп `animated` (false → без `HeroCanvas`) |
| `src/components/icons.tsx` | `MenuIcon`, `XIcon`, `StarIcon` |
| `src/data/appInfo.ts` | версия, дата обновления, имя |
| `src/data/backup.ts` | `APP_VERSION` — реэкспорт из `appInfo` |
| `app/(tabs)/profile.tsx` | пункты из `profileMenu.ts`, версия из `appInfo` |

## 5. Проверки

- `npx tsc --noEmit`, `npx jest`, `git diff --check`,
  `npx expo export --platform web`.
- Браузер (dev-сервер): 375 / 390 / 430 px и 320 px — hamburger слева,
  заголовок правее, аватара справа нет, hero на всю ширину; шторка
  открывается/закрывается кнопкой, backdrop, свайпом, Escape; фон не
  скроллится; `scrollWidth === innerWidth`; профильные данные из стора и
  обновляются после «Готово» в редакторе; все пункты работают; footer в
  самом низу скролла.
- Тесты, добавленные в задаче — см. §5.1.

### 5.1 Тесты

| Файл | Покрытие |
|---|---|
| `src/components/drawer/__tests__/HomeDrawer.test.tsx` | открытие/закрытие (кнопка ×, backdrop, Escape, свайп), profile summary из стора и его обновление после `saveProfile`, пустой профиль, группы и все пункты, `/notifications`, footer с версией из `appInfo`, ширина панели < ширины окна, safe-area, reduced-motion |
| `app/(tabs)/__tests__/index.test.tsx` | hamburger с a11y-label, отсутствие старого «Открыть профиль»-аватара, открытие шторки, заголовок/дата на месте, hero без изменений; тесты TASK_043 переведены на аватар внутри шторки (тот же `profile.profilePhotoUri`) |
| `src/components/profile/__tests__/ProfileSummary.test.tsx` | имя, события с датой и сроком, пустое состояние, `onPress` |
| `src/data/__tests__/appInfo.test.ts` | `APP_VERSION === package.json.version`, формат метки месяца, `backup.ts` реэкспортирует ту же константу |
| `src/components/profile/__tests__/profileMenu.test.ts` | страница и шторка используют один список пунктов |
| `src/components/dashboard/__tests__/HeroScene.test.tsx` | `animated={false}` → без `HeroCanvas` |

## 6. Открытый вопрос владельцу

Вкладка «Профиль» полностью продублирована шторкой (те же компоненты,
тот же стор). Кандидаты на следующую задачу после подтверждения:
удалить `app/(tabs)/profile.tsx` и пункт в `TabBar`/`_layout`, перевести
`notifications.tsx` `fallbackHref` на `/`, обновить `profile.test.tsx` и
`notificationsScreen.test.tsx`. **В рамках TASK_066 не делается.**

## 7. Не входит

Изменение hero-фона, палитры, нижней навигации, бизнес-логики часов и
месяца, событий; новые профильные поля; edge-swipe для открытия шторки;
bump версии; commit/push/deploy до подтверждения владельца.

## 8. Architecture Review Checklist (ADR-007)

- [x] Нет новых зависимостей (`package.json` не менялся).
- [x] Нет изменения модели данных и ключей AsyncStorage.
- [x] `StoreContext` не менялся; шторка читает `profile`/`saveProfile`
      через `useStore()` — единственный источник.
- [x] Пункты меню и версия — по одному источнику (`profileMenu.ts`,
      `appInfo.ts`).
- [x] Палитра — только токены `MINISTRY`/`DS`, чужих hex нет.
- [x] Существующий маршрут `/profile` сохранён до решения владельца.
- [ ] Живая проверка на iPhone (PWA standalone, Dynamic Island, свайп) —
      post-deploy шаг владельца.
