# TASK_043 — аватар профиля на Главной странице

## Цель

В правой верхней части шапки Главной страницы (`app/(tabs)/index.tsx`)
показать круглый интерактивный аватар пользователя, отображающий
`profile.profilePhotoUri`, сохранённый в TASK_042. Нажатие открывает
вкладку «Профиль».

## Текущее состояние (до задачи)

Шапка Главной уже содержит `<Avatar size={35} onPress={() =>
router.push("/profile")} />` (`app/(tabs)/index.tsx`) — но `Avatar`
(`src/components/Avatar.tsx`) не умеет показывать фото вообще: это чистый
плейсхолдер «инициалы на тёмном круге» (комментарий в файле: "Photo
support comes later"). Фактический маршрут профиля — `/profile`
(`app/(tabs)/profile.tsx`), уже используется этим же `router.push`, не
нужно угадывать.

Источник данных — `profile.profilePhotoUri` (`UserProfile`,
`src/types/index.ts`), уже читается и пишется только через
`StoreContext` (`profile`, `saveProfile`). Второго поля/ключа для Главной
заводить не нужно.

Обработка невалидного фото уже реализована на странице «Профиль»
(`app/(tabs)/profile.tsx`): `ProfileHeroCard` получает `onInvalidPhoto`,
который вызывает `saveProfile({ ...profile, profilePhotoUri: undefined
})`. `ProfileHeroCard.tsx` инкапсулирует показ фото/плейсхолдера и
обработку ошибки загрузки (`Image.onError` → `photoFailed` состояние →
плейсхолдер `Avatar`) — эта же логика нужна и на Главной, поэтому она
выносится в общий компонент.

## Реализация

1. Новый `src/components/profile/ProfileAvatar.tsx` — общий компонент:
   принимает `photoUri`, `size`, `initials`, `onInvalidPhoto` (фото/
   плейсхолдер/обработка ошибки — логика, перенесённая из
   `ProfileHeroCard`), и опционально `onPress` + `accessibilityLabel` +
   `hitSlop` для превращения в `Pressable` без второго вложенного
   `Pressable` там, где не нужно (карточка профиля сама целиком
   `Pressable`).
2. `ProfileHeroCard.tsx` переключается на `ProfileAvatar` вместо
   собственных `Image`/`useState(photoFailed)` — без визуальных
   изменений (те же размеры, `accessibilityLabel`, форма круга).
3. `app/(tabs)/index.tsx` — `Avatar` в шапке заменяется на
   `ProfileAvatar` с `photoUri={profile.profilePhotoUri}`,
   `size=40` (диапазон 40–44px), `hitSlop=2` (итоговая область нажатия
   44×44), `onPress` → `router.push("/profile")`, `accessibilityLabel="Открыть
   профиль"`, `onInvalidPhoto` → тот же паттерн очистки через
   `saveProfile`, что и на `/profile`.

## Не делается

- Не создаётся отдельное поле/ключ хранения фото для Главной.
- Не трогается визуально уже утверждённая карточка `ProfileHeroCard`
  (TASK_042) — только внутренний рефакторинг.
- Не открывается редактор профиля напрямую с Главной — только переход на
  вкладку «Профиль».
- `AGENTS.md` не трогается.

## Тесты

- `src/components/profile/__tests__/ProfileAvatar.test.tsx` (новый):
  плейсхолдер без фото, `Image` с фото, ошибка загрузки → плейсхолдер +
  `onInvalidPhoto`, `onPress`/`accessibilityLabel`/`accessibilityRole`
  когда заданы.
- `app/(tabs)/__tests__/index.test.tsx` (новый, первое покрытие экрана):
  плейсхолдер без фото, `Image` с `profile.profilePhotoUri`, нажатие →
  `router.push("/profile")`, смена/удаление URI обновляет отображение,
  ошибка загрузки возвращает плейсхолдер и очищает невалидный URI через
  `saveProfile`, `accessibilityLabel="Открыть профиль"` присутствует.
- Существующие тесты `ProfileHeroCard.test.tsx`/`Avatar.test.tsx` не
  должны требовать изменений (поведение и структура дерева сохраняются).

## Проверки после реализации

`npx tsc --noEmit`; относящиеся тесты; полный `npx jest --runInBand`;
`expo export --platform web`; `git diff --check`; `git status --short`;
визуальная проверка в браузере на 320/375/428px.

До отдельного разрешения — без commit/push/deploy.
