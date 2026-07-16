# AI_INFRASTRUCTURE — Ministry

Документация инфраструктуры AI-разработки для проекта Ministry.
Составлена по результатам инженерного аудита среды разработки (июль 2026).

> Этот документ описывает **инструменты и маршрутизацию**, а не архитектуру
> самого приложения (для этого — `docs/ARCHITECTURE.md`).

---

## 1. Общая архитектура

Принцип: **один слой трансляции, никакого middleware, переписывающего
конфиги**. Каждый инструмент ходит к своему провайдеру напрямую; единственное
исключение — Nemotron, которому нужен локальный шлюз-переводчик
(Hermes Gateway), потому что OpenRouter говорит только на OpenAI-протоколе,
а Claude Code — только на Anthropic Messages API.

| Инструмент | Роль | Маршрут |
|---|---|---|
| ChatGPT (desktop) | Архитектор | напрямую в OpenAI (без локальной маршрутизации) |
| Codex (desktop) | Основная реализация | нативный вход ChatGPT (`gpt-5.5`) |
| Claude Code — `claude` | Ревью / вторая реализация | напрямую `api.anthropic.com` |
| Claude Code — `claude nm` | Дешёвый анализ (Nemotron) | Hermes Gateway `127.0.0.1:8787` → OpenRouter |
| Claude Code — DeepSeek | Альтернативная модель | `https://api.deepseek.com/anthropic` — **нативный** Anthropic-совместимый endpoint, прокси не нужен |
| CCR (claude-code-router) | **Выведен из эксплуатации** | см. §10 (история) |

---

## 2. Роли инструментов

### ChatGPT — архитектор
- Проектирование, спецификации TASK, ревью архитектурных решений.
- Не участвует в локальной маршрутизации; отдельное desktop-приложение.

### Codex — основной инженер реализации
- Реализует TASK по спецификации архитектора.
- Работает через **нативную** авторизацию ChatGPT (модель `gpt-5.5`).
- Конфиг: `~/.codex/config.toml`.
- ⚠️ В конфиге могут оставаться «managed»-блоки CCR
  (`model_provider = "claude-code-router"`, `base_url = http://127.0.0.1:3456/v1`).
  Пока они там — выбор модели `DeepSeek/deepseek-v4-flash` в Codex
  приводит к попытке соединения с мёртвым портом 3456. Не выбирать этот
  провайдер; при плановой чистке — удалить блоки (оригинал сохранён в
  `~/.codex/config.toml.ccr-original`).

### Claude Code — ревью и вторая реализация
- Версия: native install, `~/.local/bin/claude`.
- Обычный запуск `claude` **всегда** идёт напрямую в Anthropic: shell-функция
  `claude()` в `~/.zshrc` явно снимает (`unset`) все переменные
  перенаправления перед запуском.
- Сессии привязаны к **пути папки проекта** (см. §9 Troubleshooting).

### Hermes Gateway — единственный слой трансляции
- Расположение: `~/Projects/Hermes-Gateway` (Python, только stdlib + requests).
- Назначение: переводит Anthropic Messages API ↔ OpenAI chat-completions
  (включая streaming и tool-use), чтобы Claude Code мог работать с Nemotron
  через OpenRouter.
- Слушает `127.0.0.1:8787`, запускается идемпотентно скриптом
  `scripts/start.sh` (вызывается автоматически из `claude nm`).
- Ключ OpenRouter читает из `~/.config/openrouter/.env`
  (`OPENROUTER_API_KEY=...`).
- Документация шлюза: `~/Projects/Hermes-Gateway/README.md` и
  `docs/architecture.md` (там же — post-mortem CCR).

### DeepSeek V4 Flash
- Провайдер: `api.deepseek.com`.
- Для Claude Code прокси **не требуется**: у DeepSeek есть нативный
  Anthropic-совместимый endpoint `https://api.deepseek.com/anthropic`.
- Подключение — переменными окружения (см. §6), по образцу ветки `nm`
  в `claude()`.

### Nemotron 3 Ultra
- Модель: `nvidia/nemotron-3-ultra-550b-a55b:free` (бесплатный тир).
- Доступна только через OpenRouter (OpenAI-протокол) → нужен Hermes Gateway.
- Запуск: `claude nm "..."`.
- Ограничение: **не поручать** Nemotron/DeepSeek запись кода с кириллицей,
  пока конкретный маршрут не проверен на сохранность UTF-8 (см. §9.4).

### OpenRouter
- Агрегатор моделей, endpoint `https://openrouter.ai/api/v1/chat/completions`.
- Используется только Hermes Gateway'ем для Nemotron.
- Ключ: `~/.config/openrouter/.env` — единственное каноничное место.

---

## 3. Локальная маршрутизация

Точка входа — shell-функция `claude()` в `~/.zshrc`:

```
claude ...        →  unset ANTHROPIC_BASE_URL / ANTHROPIC_MODEL / ...
                     →  api.anthropic.com            (всегда напрямую)

claude nm ...     →  scripts/start.sh (поднимает Hermes, идемпотентно)
                     →  ANTHROPIC_BASE_URL=http://127.0.0.1:8787
                     →  Hermes Gateway → OpenRouter → Nemotron
```

Гарантия изоляции: ветка по умолчанию снимает переменные окружения, поэтому
никакой ранее запущенный шлюз не может «незаметно» перехватить обычный
`claude`.

---

## 4. Порты

| Порт | Сервис | Статус |
|---|---|---|
| `8787` | Hermes Gateway (`127.0.0.1`) | Активен по требованию (`claude nm`) |
| `3456` | CCR — front router | **Legacy, не используется.** Остатки в конфигах могут указывать сюда |
| `3457` | CCR — core gateway | **Legacy, не используется** |
| — | `api.anthropic.com` (443) | Прямой маршрут `claude` |
| — | `api.deepseek.com` (443) | Нативный Anthropic-endpoint `/anthropic` |
| — | `openrouter.ai` (443) | Upstream Hermes Gateway |

CCR — двухуровневая система: клиенты ходили на 3456, а 3456 проксировал на
3457. Поэтому при отладке «порт менялся» — на самом деле это были два яруса
одного продукта.

---

## 5. Переменные окружения

| Переменная | Назначение | Где ставится |
|---|---|---|
| `ANTHROPIC_BASE_URL` | Перенаправление Claude Code на шлюз | только внутри ветки `nm` функции `claude()` |
| `ANTHROPIC_API_KEY` | Для Hermes — заглушка `nemotron-local-proxy` (шлюз её игнорирует) | ветка `nm` |
| `ANTHROPIC_MODEL` | Имя модели для шлюза (`nemotron`) | ветка `nm` |
| `OPENROUTER_API_KEY` | Ключ OpenRouter | `~/.config/openrouter/.env` (читает только Hermes) |
| `CLAUDE_CONFIG_DIR` | Каталог конфига Claude Code | не переопределять; по умолчанию `~/.claude` |

Правила:
- Ключи API — только в `~/.config/openrouter/.env` (и аналогичных файлах вне
  репозиториев). Никогда — в коде, в репо, в shell-истории.
- Глобально (в `~/.zshrc` вне функции) переменные `ANTHROPIC_*`
  **не экспортировать** — иначе перенаправление станет постоянным и незаметным.

---

## 6. Типовые рабочие процессы

### 6.1 Обычный цикл разработки (основной)
1. **ChatGPT** — обсуждение и спецификация TASK (`docs/TASKS/TASK_XXX.md`).
2. **Codex** (нативно, `gpt-5.5`) — реализация по TASK.
3. **Claude Code** (`claude`) — ревью, тесты, Architecture Review Checklist
   (ADR-007).
4. Commit → Checklist → Deploy → Git Tag (порядок из `docs/DECISIONS.md`).

### 6.2 Дешёвый анализ через Nemotron
```sh
claude nm "проанализируй docs/STATUS.md и предложи план"
```
Hermes поднимется сам. Подходит для чернового анализа; не для записи
исходников с русским текстом.

### 6.3 DeepSeek в Claude Code (без прокси)
Запуск с нативным endpoint'ом (пример; ключ — из защищённого файла, не из
истории shell):
```sh
ANTHROPIC_BASE_URL="https://api.deepseek.com/anthropic" \
ANTHROPIC_API_KEY="$(cat ~/.config/deepseek/key)" \
ANTHROPIC_MODEL="deepseek-v4-flash" \
command claude
```
При регулярном использовании — оформить как ветку `claude ds` в `~/.zshrc`
по образцу `nm`.

---

## 7. Диаграмма маршрутизации

```
                         ┌──────────────────┐
                         │  ChatGPT (desk)  │  архитектор
                         └────────┬─────────┘
                                  │ спецификации TASK
                                  ▼
┌──────────────────┐     нативный вход ChatGPT      ┌─────────────────┐
│  Codex (desktop) ├───────────────────────────────►│  OpenAI (cloud) │
└──────────────────┘        gpt-5.5                 └─────────────────┘

Terminal
  │
  ├── claude ────────────── unset ANTHROPIC_* ────► api.anthropic.com
  │                                                  (Claude / Opus)
  │
  ├── claude nm ──► scripts/start.sh
  │                     │
  │                     ▼
  │              Hermes Gateway ── translate ────► openrouter.ai
  │              127.0.0.1:8787   Anthropic⇄OpenAI   └─ nvidia/nemotron-3-ultra
  │
  └── claude ds (план) ───────────────────────────► api.deepseek.com/anthropic
                                                     └─ deepseek-v4-flash

        ✗ CCR (127.0.0.1:3456 → 3457) — выведен из эксплуатации
```

---

## 8. Проверка UTF-8 перед записью кириллицы (важно)

Инцидент июля 2026: при реализации TASK_005D в исходники попал mojibake
(двойная UTF-8 перекодировка русских строк, коммит `b8d1a4d`; частичная
замена — `5be3bda`). Правило до отдельного ADR — **модель-агностичное**:
важна не конкретная модель, а весь маршрут (модель + прокси + слой
трансляции), через который она подключена.

- Любой маршрут, которому поручается запись исходников с **не-ASCII текстом**
  (кириллица UI, комментарии), должен быть предварительно **проверен на
  сохранность UTF-8**: попросить через этот маршрут записать тестовый файл
  с русским текстом и убедиться, что round-trip не искажает байты
  (`grep -rlE 'ÃÂ|Ð[Â°-Ñ]'` по результату — совпадений быть не должно).
- Непроверенные маршруты — только для анализа, черновиков и кода без
  не-ASCII строк.
- После первой записи кириллицы новым маршрутом — проверить diff перед
  коммитом (см. §9.4).

---

## 9. Troubleshooting

### 9.1 Codex пытается соединиться с `localhost:3456`
**Причина:** в `~/.codex/config.toml` остались managed-блоки CCR
(`model_provider = "claude-code-router"`), а CCR не запущен.
**Решение:** не выбирать провайдер/модель CCR в Codex; при чистке — удалить
блоки `# BEGIN CCR managed ... # END CCR managed`.

### 9.2 «Пропали» сессии Claude Code
**Причина:** сессии хранятся в `~/.claude/projects/<слаг-пути-проекта>/` и
привязаны к **пути рабочей папки**. После переноса папки проекта
`claude --resume` в новом месте показывает пустой список.
**Решение:** сессии не потеряны — они лежат под старым слагом
(например, `-Users-AlexT-Documents-Projects-Ministry`). Не переносить папки
проектов без необходимости; после переноса старые сессии можно открыть,
временно зайдя в старый путь, либо просто начать новую.

### 9.3 `claude nm` не запускается / `return 1`
**Проверить:**
1. Путь к `start.sh` в `~/.zshrc` — должен быть
   `~/Projects/Hermes-Gateway/scripts/start.sh` (после переноса репозитория
   с Desktop путь в zshrc мог остаться старым).
2. Жив ли шлюз: `curl -s http://127.0.0.1:8787/health`.
3. Лог: `~/Projects/Hermes-Gateway/.runtime/proxy.log`
   (записи `ConnectionResetError: [Errno 54]` — безобидны: клиент закрыл
   соединение посреди стрима).
4. Ключ: `OPENROUTER_API_KEY` в `~/.config/openrouter/.env`.

### 9.4 Кракозябры (`Ð£Ð´Ð°Ð»...`, `ÃÂ...`) в исходниках
**Причина:** UTF-8 прочитан как Latin-1 и перекодирован повторно — риск
альтернативных маршрутов моделей.
**Решение:** восстановление round-trip'ом `latin-1 → utf-8` (техника из
`fix_utf8.py`); впредь соблюдать §8. Проверка репозитория:
`grep -rlE 'ÃÂ' app src`.

### 9.5 Обычный `claude` внезапно отвечает «не той» моделью
**Причина:** где-то экспортирован `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL`
глобально.
**Проверка:** `env | grep ANTHROPIC` — в чистой сессии переменных быть не
должно (ветка по умолчанию `claude()` их снимает).

---

## 10. История: почему отказались от CCR (кратко)

CCR (claude-code-router) использовался в июле 2026 и выведен из
эксплуатации: баг диспетчеризации делал Nemotron недостижимым при любой
конфигурации, а автоматическое переписывание `~/.claude/settings.json` и
`~/.codex/config.toml` вызвало каскад проблем с подключениями. Остатки
(`/usr/local/bin/ccr`, `~/.claude-code-router/`, managed-блоки и
`.ccr-backup-*` файлы) подлежат плановой чистке. Подробный post-mortem:
`~/Projects/Hermes-Gateway/docs/architecture.md`, раздел «Background: why
not claude-code-router».

---

## 11. Что никогда не менять

- Ветку `unset ...` в функции `claude()` — это гарантия, что обычный
  `claude` не будет незаметно перенаправлен.
- Не позволять никакому инструменту автоматически переписывать
  `~/.claude/settings.json` и `~/.codex/config.toml`.
- Ключи API не переносить в репозитории (репозиторий Ministry — публичный).
- `src/data/seed.js`, ключи `mj_*_v1`, единственность `StoreContext`,
  процесс ADR-007 — см. `CLAUDE.md` и `docs/DECISIONS.md`.
