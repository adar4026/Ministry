# TASK_009 — Public Seed Privacy Remediation

**Status:** APPROVED (design) — implementation not started; this document
precedes any code, backup, or deletion (ADR-004). Design corrected per
owner review of the initial privacy assessment (see §1).
**Priority:** P0
**Type:** Privacy remediation (data removal from the current tracked tree),
not a feature or a Hours/Home change.

## Architecture Status

TASK_005 Architecture (Hours 2.0): unaffected. This task does not touch
`StoreContext`, storage keys, persisted schemas, or the aggregation layer.
The single architectural change is to the **content** of `src/data/seed.js`
(empty arrays instead of personal data) and the **removal** of
`prototype/App.jsx` — both are data/tree changes, not domain-model changes.

---

## 1. Context

Following TASK_008's push to `origin/main` and the release-readiness review
that preceded it, an owner-directed privacy assessment (this session)
established that `src/data/seed.js` — imported into the app through
`src/data/seed.ts` and bundled by every production web export — contains
22+ years of the owner's personal ministry history: monthly hour records
with free-text notes, a full cross-country relocation history, the
owner's spouse's first name and wedding date, religious appointment dates,
and public-talk records. Empirical inspection of a real `expo export
--platform web` output (performed during TASK_008's safe-export
verification) confirmed this data is bundled into the shipped JavaScript,
serialized as `\uXXXX`-escaped Cyrillic strings — trivially decodable, not
meaningfully obfuscated.

The initial remediation proposal (redirect `src/data/seed.ts` to empty
arrays, leaving `src/data/seed.js` untouched) was reviewed by the owner and
found **insufficient**: it would stop the data from reaching *future*
production bundles, but would leave the same personal dataset sitting in
plain, readable form in the current tracked `main` branch — satisfying
layer 3 (bundle exposure) while leaving layer 1 (current-tree exposure)
unaddressed. This document supersedes that proposal with a corrected design
that remediates both layers, gated behind a mandatory private backup.

---

## 2. Threat Model

**Who can see what, today, without any credentials:**
- Anyone who clones or browses `github.com/adar4026/Ministry` (public repo)
  can read `src/data/seed.js` and `prototype/App.jsx` directly.
- Anyone who visits `https://adar4026.github.io/Ministry/` can extract the
  same data from the shipped JS bundle via "View Page Source," browser dev
  tools, or a plain `curl` of the bundle URL — no rendering or interaction
  with the app is required.
- Anyone who has *already* cloned the repo, forked it, indexed it via a
  search engine, or archived the live site (e.g. via the Wayback Machine)
  may hold a copy independent of anything this task does going forward.

**What this task changes:** what a *new* clone of `main` or a *new*
production export contains, starting from the commit(s) this task produces.

**What this task cannot change:** anything already observed, cloned,
cached, or archived before this task's commit lands — see §16.

---

## 3. Exposure Layers

| Layer | Description | In scope for TASK_009? |
|---|---|---|
| **1. Current main branch** | `src/data/seed.js` and `prototype/App.jsx` as checked out from `HEAD` today | **Yes — remediated** |
| **2. Historical Git commits** | Every prior commit that ever contained this data, reachable via `git log`/`git show`/a full clone | **No — explicitly out of scope.** Requires a separate, owner-approved history-rewrite task (`git filter-repo` or equivalent) later. Prior commits are left byte-for-byte unchanged by this task. |
| **3. Deployed JavaScript bundle** | What `expo export --platform web` currently embeds and what GitHub Pages currently serves | **Yes — remediated for future exports.** The *currently live* GitHub Pages deployment (stale since 2026-07-14, per TASK_008's prior finding) is not retroactively changed by this task alone — a new deploy is required afterward, which is a release decision outside TASK_009's implementation, tracked as a release implication (§17). |

---

## 4. Private-Backup Prerequisite (mandatory gate)

**No destructive edit to `src/data/seed.js` or deletion of
`prototype/App.jsx` may occur before this stage completes and the owner
explicitly confirms the backup location in chat.**

### 4.1 What gets backed up
A single JSON file capturing every personal seed collection:
```json
{
  "meta": {
    "exportedAt": "<ISO timestamp>",
    "sourceCommit": "<git rev-parse HEAD at backup time>",
    "recordCount": 260,
    "eventCount": 25,
    "talkCount": 6
  },
  "records": [ /* verbatim SEED_RECORDS from src/data/seed.js */ ],
  "events": [ /* verbatim SEED_EVENTS */ ],
  "talks": [ /* verbatim SEED_TALKS */ ]
}
```
`SEED_SESSIONS` is not included — it is already `[]` in `StoreContext.tsx`
today (TASK_005A: 0 live user Sessions), nothing to preserve there.

**Optional, owner's choice:** a verbatim copy of `prototype/App.jsx` may be
included alongside the JSON (e.g. in the same backup directory) if the
owner wants to retain the archived prototype file itself, independent of
its removal from the tracked tree in §9.

### 4.2 Where it must live
**Outside the Git repository and outside any tracked project path** — not
`/Users/AlexT/Projects/Ministry/` or any subdirectory of it, even a
gitignored one, to eliminate any risk of a future `git add -A` or similar
broad-add command accidentally picking it up. A location such as
`~/Private/ministry-seed-backup/` (or any path the owner chooses outside
the repo root) is appropriate. **The exact path is the owner's decision,
confirmed in chat before proceeding — not assumed or chosen by this
document.**

### 4.3 Required verification before proceeding
1. The backup file parses as valid JSON (no syntax errors).
2. `records.length === 260`, `events.length === 25`, `talks.length === 6`
   — matching the source counts confirmed by direct inspection of
   `src/data/seed.js` at the time this document was written.
3. Key-field spot check: at least one known record (e.g. `r1`:
   `{year:2003, month:9, hours:1, note:"Начало служения"}`), one known
   event, and one known talk match the source exactly, field for field.
4. The backup path is confirmed **not** to resolve under
   `git rev-parse --show-toplevel`'s output.
5. `git status --porcelain` shows the backup file nowhere in the working
   tree (because it isn't inside the repo at all).
6. **The owner explicitly confirms the backup location in chat.** This is
   a hard gate — implementation does not proceed on an assumed or
   unconfirmed backup.

**This document does not create the backup.** Creating it is a future,
separate, owner-approved step.

---

## 5. In-Scope Files

- `src/data/seed.js` — content change only (empty arrays), module interface
  preserved (§8).
- `prototype/App.jsx` — deletion from the tracked tree (§9).
- `src/store/__tests__/StoreContext.test.tsx` — new regression tests (§12).
- `docs/ARCHITECTURE.md` — seed.js/seed.ts distinction, prototype removal
  note.
- `docs/STATUS.md` — record the remediation, the git-history limitation,
  the TASK_010 renumbering.
- `CLAUDE.md` — **identified during this planning, not in the original
  request list, but directly affected:** its current line `**Данные:**
  \`src/data/seed.js\` — история с 2003 года, не изменять.` and `Данные
  пользователя неприкосновенны (seed.js не трогать)` become factually
  inaccurate once `seed.js` is emptied — the file will no longer contain
  personal history, and this task's own owner-approved design *requires*
  editing it (with a backup safeguard) rather than leaving it frozen.
  Flagging this explicitly rather than silently leaving stale documentation
  behind.

## 6. Out-of-Scope Items

- Git history rewrite (layer 2) — separate future task, explicit owner
  approval required.
- `src/data/seed.ts` — **no change needed** under the chosen design (§8);
  it continues to import from `./seed.js` exactly as today, which will now
  simply resolve to empty arrays.
- `StoreContext.tsx`, `useStorage.ts`, any storage key, any persisted
  schema.
- Backend, authentication, AWS, or sync architecture of any kind.
- Hours or Home screen redesign (that is TASK_010, see §18).
- `AGENTS.md` — untouched.
- Deploy, push, tag, or version bump — these are release decisions that
  follow TASK_009, not part of it (§17).
- An encrypted or user-controlled Export/Import feature — recommended as a
  **future** follow-up (§10.3), explicitly not implemented here.

## 7. Frozen Constraints

- `StoreContext.tsx`'s public interface (`useStore()`, `saveRecord`,
  `saveEvent`, `saveTalk`, `saveSession`, and their delete counterparts)
  must not change.
- AsyncStorage keys (`mj_records_v1`, `mj_events_v1`, `mj_talks_v1`,
  `mj_sessions_v1`) must not change.
- No persisted-schema change of any kind.
- `AGENTS.md` remains untouched and untracked.
- No commit, push, deploy, tag, or version bump happens as part of this
  task's *design* stage (this document) — those require separate approval
  at implementation time, following the same stage-by-stage discipline
  used in TASK_008.

---

## 8. Chosen Design for `src/data/seed.js`

**Chosen: Option A — replace the exported collections with empty arrays,
preserving the module's interface exactly.**

```js
// src/data/seed.js (after remediation)
export const SEED_RECORDS = [];
export const SEED_EVENTS = [];
export const SEED_TALKS = [];
```

**Rejected: Option B (delete `seed.js`, make `seed.ts` canonical).**

**Evidence for choosing A over B:**
- **Fewer files touched, fewer things that can break.** Under A, `seed.ts`
  requires **zero changes** — it already does
  `import { SEED_RECORDS as RAW_RECORDS, ... } from "./seed.js"`, and that
  import continues to resolve correctly to (now-empty) arrays with no
  edit needed. Under B, both `seed.ts` (remove the import, define the
  arrays directly) and the deletion of `seed.js` itself would need to
  happen together — a two-file structural change versus a one-file content
  change.
- **File-path stability.** `CLAUDE.md`, `docs/ARCHITECTURE.md`, and this
  project's own established convention refer to `src/data/seed.js` by
  path repeatedly. Option A keeps that path valid (with updated,
  accurate documentation, §17); Option B would require finding and
  correcting every reference to a file that no longer exists — more
  surface area, more risk of a stale reference surviving somewhere.
- **Export names and behavior remain identical either way** (`SEED_RECORDS`
  / `SEED_EVENTS` / `SEED_TALKS`, same shapes, same consumer), so
  compatibility is not a differentiator — but *risk of accidentally
  breaking something while achieving that compatibility* clearly favors A.
- Confirmed by direct repository inspection: **no test file imports
  `SEED_RECORDS`/`SEED_EVENTS`/`SEED_TALKS`/`@/data/seed` directly** — only
  `src/store/StoreContext.tsx` does, through `seed.ts`. Emptying the
  arrays cannot break any existing test's assumptions about seed content,
  under either option.

---

## 9. Chosen Design for `prototype/App.jsx`

**Chosen: Option A — delete the archived prototype from the tracked tree.**

**Evidence:**
- `docs/ARCHITECTURE.md` already labels it, in the project's own words:
  *"Исходный прототип | React + localStorage (\`prototype/\`) | Архив"* —
  i.e. the project's own documentation already classifies it as having no
  active value, independent of this privacy task.
- **Zero build/runtime dependency**, confirmed by direct inspection: not
  imported anywhere in `app/` or `src/`.
- **Zero test dependency**, confirmed: `package.json`'s Jest config
  explicitly excludes it (`modulePathIgnorePatterns:
  ["<rootDir>/prototype/"]`) — the test suite never touches it.
- **No documentation-generation or recovery-workflow dependency** found —
  nothing in the repository treats it as a live reference or fallback data
  source.
- It duplicates (not supplements) the same personal markers already
  present in `seed.js` — deleting it loses no information not already
  captured by the mandatory backup (§4), and the backup explicitly offers
  to include a verbatim copy of this file if the owner wants to retain it
  for historical/sentimental reasons independent of its functional
  irrelevance.

**Rejected: Option B (replace with neutral prototype data)** — would
require inventing a second neutral dataset for a file nobody uses, pure
added effort with no offsetting value.

**Rejected: Option C (move out of the public repo rather than delete)** —
functionally equivalent to "backup, then delete" once the mandatory
backup (§4) already covers the option to retain a copy privately; a
separate "moved" location would just be a second, redundant backup
mechanism to maintain.

---

## 10. Existing-Data Preservation Proof

### 10.1 Mechanism (verified by direct code reading, not assumed)

`src/hooks/useStorage.ts`'s `usePersistentState<T>(key, seed)`:
```ts
const [value, setValue] = useState<T>(seed);      // in-memory only
useEffect(() => {                                   // mount: async read
  const raw = await AsyncStorage.getItem(key);
  if (raw != null) setValue(JSON.parse(raw));       // existing data wins
  setLoaded(true);
}, [key]);
useEffect(() => {                                    // write-back
  if (!loaded) return;                                // never fires early
  AsyncStorage.setItem(key, JSON.stringify(value));
}, [key, value, loaded]);
```
The write-back effect is gated on `loaded`, which only becomes `true`
*inside* the read's completion callback — the read always resolves before
any write is possible. For a device with existing `mj_records_v1` /
`mj_events_v1` / `mj_talks_v1` / `mj_sessions_v1` entries, `raw != null`,
so `value` is replaced by the stored data *before* the write-back effect
can run. The (now-empty) seed is never written over existing data.

### 10.2 Explicit guarantees this task preserves

- Existing AsyncStorage data loads before any first-run empty seed is
  persisted — proven above, unchanged by this task (no edit to
  `useStorage.ts` or `StoreContext.tsx`).
- Existing records, events, talks, sessions, and profile state remain
  unchanged — same mechanism covers all four collections identically;
  "profile state" has no separate persisted entity (Profile screen reads
  from the same `records`/`events` via `useStore()`, per
  `docs/ARCHITECTURE.md`).
- No automatic reset occurs — nothing in this task adds a reset path.
- No storage key changes (§7).
- No persisted-schema change (§7).
- No migration deletes or replaces user data — this task adds no
  migration at all; it only changes what a *fresh* install's seed equals.
- **Residual risk, explicitly documented, not hidden:** clearing Safari
  site data or reinstalling the app remains a data-loss scenario, because
  there is currently no export/import or backup mechanism for the *user's
  own* AsyncStorage data (distinct from the developer-side seed backup in
  §4). This is inherent to client-only storage and predates this task.

### 10.3 Recommended future follow-up (explicitly out of TASK_009 scope)

An encrypted or user-controlled Export/Import feature (e.g. a "Export my
data" button producing a downloadable JSON, with a matching "Import"
path) would close the residual risk in §10.2. This is recommended as a
candidate for a future task — **not** implemented, designed in detail, or
scoped further here.

---

## 11. Implementation Stages

**Stage 0 (this document):** create this TASK document. No code, backup,
or deletion. *(Current stage — completed by this commit-to-be.)*

**Stage 1 (gate, owner-performed or Claude-performed only after explicit
go-ahead):** create and verify the private backup per §4. Implementation
does not proceed past this point without the owner's explicit
confirmation of the backup location in chat.

**Stage 2:** empty `src/data/seed.js`'s three exported arrays (§8). No
change to `seed.ts`, `StoreContext.tsx`, or any storage key.

**Stage 3:** delete `prototype/App.jsx` (§9).

**Stage 4:** add the regression tests (§12) to
`src/store/__tests__/StoreContext.test.tsx`. Per the precedent set in
TASK_008 (Stage 1–3 combined into one atomic commit because separating
them would have left the repository temporarily incorrect/untested),
Stages 2–4 may land as a single atomic commit — the reasoning will be
stated explicitly before that commit, at implementation time, exactly as
was done in TASK_008.

**Stage 5:** documentation — `docs/ARCHITECTURE.md`, `docs/STATUS.md`,
`CLAUDE.md` (§5, §17), as a separate commit following the TASK_008
Stage-5 precedent.

**Stage 6:** verification — full test suite, `tsc --noEmit`, repository-wide
marker search (excluding `.git`), safe production export, compiled-bundle
inspection, `git diff --check`, `git status`. Detailed in §13–§14.

No stage pushes, deploys, tags, or bumps the version. Each stage is shown
to the owner (diff, verification results, proposed commit message) before
being committed, exactly as in TASK_008.

---

## 12. Required Tests

1. **Existing stored data survives the new empty seed** *(new — currently
   untested for records/events/talks; only proven implicitly for
   sessions, which has always had an empty seed)*: pre-populate
   `AsyncStorage` with a fake record/event/talk before mounting
   `StoreProvider`; assert the loaded state equals exactly the
   pre-populated data, not `[]`.
2. **First run initializes to empty arrays**: clear `AsyncStorage`, mount,
   assert `records`/`events`/`talks` all equal `[]` — mirroring the
   existing session test's pattern
   (`"starts with an empty sessions array (no seed data for Session)"`).
3. **Second launch does not duplicate or reset data**: mount once (first
   run writes the empty seed), unmount, remount against the *same*
   (uncleared) storage, assert the array length/content is unchanged —
   not duplicated, not reset back to a seed value.
4. **Repository-wide personal-marker search, correctly scoped**: search
   tracked files only (`git grep`, which inherently excludes `.git`
   internals and anything gitignored) for known unique personal markers
   (e.g. "Снежан", "Каневская", "Хихон", "Бенидорм", "Малага", "Саранск",
   "Сочи", "G-8") — must return **zero matches** anywhere in the tracked
   tree after Stages 2–3 (unlike the prior proposal, this is no longer
   scoped to exclude `seed.js`, because `seed.js` itself will no longer
   contain this text).
5. **Confirmation of clean tracked files**: same search, run as a final
   check immediately before the Stage 2–4 commit, confirming no personal
   marker survives anywhere `git ls-files` would show.
6. **No regression**: full suite (`npm test -- --runInBand`) — expect the
   existing 117 tests, with the two new/updated `SEED_*`-related seed
   assumptions adjusted, plus the new tests above, all passing.
   `tsc --noEmit` clean.

---

## 13. Bundle-Verification Procedure

Source-tree grep alone is insufficient — the JS bundler escapes non-ASCII
text as `\uXXXX` sequences, which a naive literal-Cyrillic grep against the
compiled output would miss (discovered and proven during TASK_008's
investigation). Procedure:

1. Run `npx expo export --platform web` (the safe, non-deploying half of
   `npm run deploy` — established precedent from TASK_008; `gh-pages -d
   dist --nojekyll` is not run).
2. Search the compiled bundle (`dist/_expo/static/js/web/*.js`) for the
   **Unicode-escaped** form of each known marker (e.g. Python:
   `''.join('\\u%04x' % ord(c) for c in 'Снежан')`), not the literal
   Cyrillic string — this is the check that actually matters, since it
   proves the shipped bytes, not just the source.
3. Expect **zero matches** for every marker checked.
4. `git status --porcelain` before and after export must be identical —
   confirms the export modified no tracked file; `dist/` remains
   gitignored and unstaged.

---

## 14. Acceptance Criteria

**None of the following may be marked complete until implemented and
verified — mirroring TASK_008's discipline of not claiming completion in
advance.**

- [ ] Private backup created, verified (§4.3), and its location explicitly
      confirmed by the owner in chat.
- [ ] `src/data/seed.js` exports `SEED_RECORDS = []`, `SEED_EVENTS = []`,
      `SEED_TALKS = []`, with its module interface otherwise unchanged.
- [ ] `prototype/App.jsx` removed from the tracked tree.
- [ ] `src/data/seed.ts`, `StoreContext.tsx`, `useStorage.ts` unchanged
      (zero diff).
- [ ] No AsyncStorage key or persisted schema changed.
- [ ] New regression tests (§12, items 1–3) exist and pass.
- [ ] `git grep` for all known personal markers across tracked files
      returns zero matches.
- [ ] Safe production export succeeds; compiled-bundle search (§13) for
      Unicode-escaped markers returns zero matches.
- [ ] Full test suite passes (`npm test -- --runInBand`).
- [ ] `tsc --noEmit` clean.
- [ ] `git diff --check` clean.
- [ ] `docs/ARCHITECTURE.md`, `docs/STATUS.md`, `CLAUDE.md` updated
      truthfully (§17), including the git-history limitation and the
      TASK_010 renumbering note.
- [ ] No claim anywhere that Git history has been cleaned, that the live
      GitHub Pages deployment has been refreshed, or that any release
      action (deploy/tag/push beyond this task's own commits) has
      occurred.

---

## 15. Rollback Strategy

Every stage lands as an isolated, reviewed commit with no push, deploy, or
tag (same discipline as TASK_008) — rollback for any stage is a plain
`git revert` of that stage's commit. Because no persisted format or
storage key changes at any stage, and because `usePersistentState` never
lets a seed value overwrite existing device data, reverting the seed.js
content change has **no effect on any device that already has real stored
data** — only on what a brand-new install's first run would show. If the
owner ever wants the original personal seed restored to the tracked tree
(e.g. to revert this task entirely), the private backup from §4 is the
correct source, or `git show <pre-remediation-commit>:src/data/seed.js`
against local history, independent of what remote/public state shows.

---

## 16. Git-History Limitation

Stated plainly, as required:
- Removing/emptying data in the current source tree does **not** remove
  it from any prior commit — `git log`, `git show`, and a full clone of
  the repository will always be able to reconstruct the original
  `seed.js` and `prototype/App.jsx` content from history, indefinitely,
  unless a separate history-rewrite operation is performed.
- Layer 2 (historical Git exposure) is **explicitly out of scope for
  TASK_009** and requires its own, separately-approved task — rewriting
  history (`git filter-repo`/BFG or equivalent) is a high-risk operation
  (force-push required, breaks any existing clones/forks, rewrites commit
  hashes) that must not be undertaken as a side effect of this task.
- Even a full history rewrite would not guarantee removal from third-party
  copies: anyone who already cloned the repo, forked it, or whose crawler
  indexed it before the rewrite may retain an independent copy outside
  this project's control.
- Nothing in `seed.js` is a credential or secret that can be "rotated" —
  it is historical personal data, which can only be stopped from being
  served *going forward*, never retroactively un-published.

---

## 17. Release Implications

- This task produces commits on `main` but does **not** deploy, push,
  tag, or bump the version — those remain separate, owner-approved
  actions, exactly as established for TASK_008.
- The currently-live GitHub Pages deployment (stale since 2026-07-14,
  confirmed in the prior session) is **not** changed by this task alone —
  it still serves whatever was last deployed until a fresh `npm run
  deploy` runs, which is part of the *already-proposed* v0.4.5 release
  sequence, not this task.
- This task is a **prerequisite** for that v0.4.5 release sequence's
  privacy-decision step, not a replacement for it — once TASK_009 lands,
  the release sequence proposed in the prior session (privacy decision →
  version bump → tests → tsc → export → commit → push → deploy → remote
  verification → tag → tag push → iPhone verification → STATUS update)
  can proceed with its privacy-decision step satisfied.
- `docs/STATUS.md` must not claim the live site has been refreshed until
  an actual deploy is run and verified, per the same honesty discipline
  established in TASK_008's documentation reconciliation.

---

## 18. TASK_010 Renumbering Note

Per owner instruction: this document is **TASK_009**. The previously
informally-referenced future "Hours UX redesign" (mentioned without a
number in `docs/STATUS.md`'s next-steps list, and in TASK_008's
documentation as deferred work involving `MonthlyHoursCard.tsx`'s
disposition) is reserved as **TASK_010** and must be labeled as such the
next time `docs/STATUS.md` or a new task document references it. No
content of that future task is defined here — only its number is
reserved, to keep task numbering unambiguous across sessions.
