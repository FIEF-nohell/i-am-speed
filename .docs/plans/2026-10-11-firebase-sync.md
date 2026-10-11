---
status: in-progress
created: 2026-10-11
updated: 2026-10-11
base: 46831022ac3f4e0e3e54249c5b059e0ea7480b73
goal: Add optional Firebase sign-in (email+password, Google) with lossless cross-device Firestore sync of settings, attempts and aggregates, while anonymous use stays local-only with zero network and zero Firebase bundle cost.
---

# Firebase sync (optional account, cloud sync)

## Goal

Add optional Firebase sign-in (email+password, Google) with lossless cross-device Firestore sync of settings, attempts and aggregates, while anonymous use stays local-only with zero network and zero Firebase bundle cost.

## Inputs

- Rules (all active, universal): `.docs/rules/plan-execution.md` (format), `.docs/rules/verification.md` (`npm run check`, `npm run test:e2e`), `.docs/rules/docs-current-state-only.md` (AGENTS.md edit must be an in-place Stack fact change, no changelog), `.docs/rules/agent-docs-sync.md` (not triggered: no agent files change).
- Learnings: none exist (`.docs/learnings/` holds only README). Decisions folder `.docs/decisions/`: empty. Style guide: empty. Research: empty.
- Retrieval helper `.claude/hooks/retrieve.py` fails (`ModuleNotFoundError: No module named 'yaml'`); retrieval was done by hand over the five rule files and the empty folders. Surface to the user; not fixed by this plan.
- `PROJECT.md` sections 2 (no backend/auth/network: deliberately changed here for signed-in users only), 7 (pure TS, tested, files under about 250 lines, no `any`), 12, 16 (versioned schema, migration, try/catch, SSR-safe `useSyncExternalStore`, history cap with separate aggregates).
- `DECISIONS.md` D1 to D12 (next free id: D13). D11 import semantics (needs numeric `version` and `settings`).
- Code read: `src/features/storage/{schema,migrate,record,persist,store,storage.test}.ts`, `src/features/settings/{settings.ts,SettingsView.tsx}`, `src/features/stats/{aggregate.ts,StatsView.tsx}`, `src/features/results/ResultsView.tsx` (reads only `lastResult`), `src/features/typing/useFinish.ts` (only `commitAttempt` caller), `src/components/{ThemeScript,layout/Header,layout/Footer}.tsx`, `src/app/{layout,about/page,settings/page,sitemap}.tsx`, `src/config/site.ts`, `e2e/smoke.spec.ts` (asserts zero non-localhost requests for the anonymous flow), `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `tsconfig.json`, `package.json`, `ci/github-actions-ci.yml`, `README.md`.
- Environment facts: Node 22.23, `firebase` CLI 15.24 installed, Java NOT installed (Firestore emulator cannot run here), npm `firebase` latest 13.0.0 (exports `./app`, `./auth`, `./firestore`, `./firestore/lite`), `@firebase/rules-unit-testing` latest 6.0.0.

## Architecture summary (read before any workstream)

1. **Local stays the source of truth.** localStorage (`i-am-speed:v1` key, unchanged name) keeps the full `StoredData`; it now carries `sync` metadata. Cloud sync is a background reconcile of that state. Offline tolerance comes from this: pending work is derived from local state (`pendingWrite`), so nothing depends on a Firestore cache surviving.
2. **Firestore Lite** (`firebase/firestore/lite`), not the full SDK: smaller lazy chunk, no IndexedDB cache to keep coherent with localStorage, no listeners. Pull happens on sign-in, on focus/visibility (throttled), on `online`, and on "sync now". If Lite proves insufficient, switching to the full SDK is contained in `src/features/firebase/cloud.ts`.
3. **Aggregates are per-device contributions (a G-counter map).** Lifetime aggregates (`keys`, `fingers`, `days`, `lessons`, `totals`) cannot be recomputed from the 500-attempt history, so each device owns one `Contribution` (`sync.ownId`) that only it increments. Every device holds read-only copies of other contributions. Merge per contribution id keeps the higher `rev`; the displayed views are `combine(contribs)` (sums, OR, max, latest-by-time). This makes merge commutative, associative and idempotent, so repeated or concurrent merges never double count.
4. **Legacy (v1) data becomes a frozen contribution** with a deterministic content-hash id (`legacy-<hash>`), `rev: 0`, never incremented. The same legacy data reaching the account from two devices (for example via JSON export/import) dedupes by id. The device gets a fresh, empty own contribution for new work.
5. **Attempts** are unioned by stable `id`; new ids are `${ownId}-${rev}` (globally unique). Old v1 ids (`${at}-${n}`) are kept as-is.
6. **Settings**: on the first link of a device to an account, the account's settings win if the cloud profile exists, otherwise local settings are uploaded. After that, last-writer-wins by `settingsUpdatedAt`, with a monotonic check in the security rules as a backstop.
7. **Lazy boundary**: only modules under `src/features/firebase/` may import `firebase/*` (enforced by ESLint), and those modules are only reached through dynamic `import()`. The app loads them only when (a) the user starts a sign-in action, or (b) the local auth hint key says this browser was signed in.
8. **Keystroke path untouched**: sync reacts to store commits (attempt finish, settings change), debounced 2 s and run in `requestIdleCallback`; remote merges are deferred while on a typing route (`/lesson/`, `/test/`).

## Shared interfaces (contract between workstreams; M0 lands the type files verbatim)

### `src/features/sync/types.ts` (M0, then owned by B)

```ts
import type { FingerStat, KeyStat } from "@/features/engine/metrics";
import type { Finger } from "@/features/keyboard/layout/types";
import type { Settings } from "@/features/settings/settings";
import type { Attempt, DayTotals, LessonProgress } from "@/features/storage/schema";

/** Own ids: 20 chars [A-Za-z0-9]. Legacy ids: "legacy-" + 16 hex. Rules regex: ^[A-Za-z0-9_-]{8,64}$ */
export type ContribId = string;

export interface Totals {
  attempts: number;
  timeMs: number;
  chars: number;
}

export interface Aggregates {
  keys: Record<string, KeyStat>;
  fingers: Partial<Record<Finger, FingerStat>>;
  /** Keyed by local date YYYY-MM-DD of the device that recorded it. */
  days: Record<string, DayTotals>;
  lessons: Record<string, LessonProgress>;
  totals: Totals;
}

/** One device's lifetime counters. Only the device whose sync.ownId equals id increments it. */
export interface Contribution extends Aggregates {
  id: ContribId;
  /** Monotonic. +1 per recorded attempt. Merge keeps the higher rev per id. Legacy: always 0. */
  rev: number;
  updatedAt: number;
}

export interface SyncMeta {
  /** The one contribution this device increments. Regenerated on import and reset. */
  ownId: ContribId;
  /** Every known contribution including own. StoredData views === combine(contribs). */
  contribs: Record<ContribId, Contribution>;
  /** Account this data was last reconciled with. null = never linked, or unlinked after cloud delete/reset. */
  linkedUid: string | null;
  /** Attempt ids recorded locally and not yet confirmed in the cloud. Always a subset of attempts[].id. */
  unsyncedAttemptIds: string[];
  /** Highest rev per contribution confirmed written to linkedUid's cloud. */
  pushedRevs: Record<ContribId, number>;
  /** settingsUpdatedAt confirmed in the cloud; -1 = never pushed. */
  pushedSettingsAt: number;
}

export interface CloudProfile {
  settings: Settings;
  settingsUpdatedAt: number;
}

/** What a pull returns. profile === null means "no cloud data for this account yet". */
export interface CloudSnapshot {
  profile: CloudProfile | null;
  contribs: Contribution[];
  /** Newest first or any order; at most MAX_ATTEMPTS, newest by `at`. */
  attempts: Attempt[];
}

export interface CloudWrite {
  /** Written alone (not in the batch) so a rules rejection (older settings) cannot fail the rest. */
  profile: CloudProfile | null;
  contribs: Contribution[];
  attempts: Attempt[];
}

export type CloudErrorCode = "offline" | "permission-denied" | "stale-profile" | "unknown";

export class CloudError extends Error {
  constructor(
    readonly code: CloudErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface CloudAdapter {
  pull(uid: string): Promise<CloudSnapshot>;
  /** Idempotent sets. Throws CloudError. "stale-profile" = rules refused an older settingsUpdatedAt. */
  push(uid: string, write: CloudWrite): Promise<void>;
  /** Deletes users/{uid} and its attempts and contribs subcollections (paged, batched). */
  deleteAll(uid: string): Promise<void>;
}

export type LinkKind = "first-link" | "same-account" | "other-account";

export interface MergeContext {
  uid: string;
  now: number;
}

export interface MergeResult {
  data: import("@/features/storage/schema").StoredData;
  /** What must be written so cloud and local converge. */
  push: CloudWrite;
}

export type SyncState =
  | { kind: "local" } // signed out: anonymous, local only
  | { kind: "starting" } // loading Firebase or first pull
  | { kind: "confirm-link"; email: string | null } // device data belongs to another account
  | { kind: "syncing" }
  | { kind: "synced"; at: number }
  | { kind: "offline"; pending: number; retryAt: number | null }
  | { kind: "error"; message: string; retryAt: number | null };

export interface SyncActions {
  syncNow(): Promise<void>;
  resolveLink(choice: "merge" | "cancel"): Promise<void>;
  /** Pauses the engine, deletes the cloud subtree, unlinks local data. Caller re-authenticated first. */
  deleteCloudData(): Promise<{ ok: true } | { ok: false; message: string }>;
}
```

(`MergeResult.data` may use a normal `import type` of `StoredData` instead of the inline import; M0 picks whichever avoids a circular type import with `schema.ts`, which imports `SyncMeta` from here. Type-only cycles are fine in TS.)

### `src/features/auth/types.ts` (M0, then owned by A)

```ts
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  /** e.g. ["password"], ["google.com"]. Drives the re-auth UI before deletion. */
  providerIds: string[];
}

export type AuthStatus = "unknown" | "signed-out" | "signed-in";
export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
}

export type AuthErrorCode =
  | "invalid-credentials"
  | "invalid-email"
  | "email-in-use"
  | "weak-password"
  | "popup-closed"
  | "popup-blocked"
  | "network"
  | "too-many-requests"
  | "requires-recent-login"
  | "unknown";

export type AuthResult = { ok: true } | { ok: false; code: AuthErrorCode; message: string };

export interface AuthAdapter {
  onChange(cb: (user: AuthUser | null) => void): () => void;
  signInEmail(email: string, password: string): Promise<AuthResult>;
  signUpEmail(email: string, password: string): Promise<AuthResult>;
  signInGoogle(): Promise<AuthResult>;
  sendPasswordReset(email: string): Promise<AuthResult>;
  /** password for the "password" provider; Google re-auths via popup when omitted. */
  reauthenticate(input: { password?: string }): Promise<AuthResult>;
  deleteUser(): Promise<AuthResult>;
  signOut(): Promise<void>;
}

/** localStorage key. "1" while this browser has a signed-in Firebase session. Absent = never load Firebase at boot. */
export const AUTH_HINT_KEY = "i-am-speed:auth";
```

### `src/features/sync/state.ts` (M0, complete implementation, then owned by D)

Tiny external store, no Firebase imports:

```ts
export function useSyncState(): SyncState; // useSyncExternalStore; server snapshot { kind: "local" }
export function getSyncState(): SyncState;
export function setSyncState(next: SyncState): void;
export function registerSyncActions(actions: SyncActions | null): void;
export function getSyncActions(): SyncActions | null; // null while sync is not running
```

### Auth session API, `src/features/auth/session.ts` (A; D consumes it in M4)

No static Firebase import. Public surface:

```ts
export function useAuth(): AuthState; // server snapshot { status: "unknown", user: null }
export function subscribeAuth(cb: (user: AuthUser | null) => void): () => void;
/** Called once on the client. Loads the adapter only if AUTH_HINT_KEY === "1"; otherwise sets status "signed-out" without any import. */
export function bootAuth(): void;
/** Lazily imports src/features/firebase/auth.ts, memoised. Also wires adapter.onChange -> store + hint key. */
export function getAuthAdapter(): Promise<AuthAdapter>;
export function signOut(): Promise<void>; // no-op when the adapter was never loaded
```

### Firebase client, `src/features/firebase/client.ts` (A; D's `cloud.ts` consumes it)

```ts
import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore/lite";
export interface FirebaseHandles {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}
/** Memoised. Throws if called on the server. Uses initializeAuth with indexedDB+local persistence and browserPopupRedirectResolver (tree-shakeable, no getAuth()). */
export function loadFirebase(): Promise<FirebaseHandles>;
```

### Pure model API (B; D and A consume)

`src/features/storage/schema.ts` (StoredData v2, `SCHEMA_VERSION = 2`, key name unchanged):

```ts
export interface StoredData {
  version: number;
  settings: Settings;
  /** Epoch ms of the last local settings change. 0 = never changed on this device. */
  settingsUpdatedAt: number;
  attempts: Attempt[]; // newest last, capped at MAX_ATTEMPTS
  // Derived views, always === combine(sync.contribs). Kept materialised so stats/results/lessons UI do not change.
  lessons: Record<string, LessonProgress>;
  keys: Record<string, KeyStat>;
  fingers: Partial<Record<Finger, FingerStat>>;
  days: Record<string, DayTotals>;
  totals: { attempts: number; timeMs: number; chars: number };
  /** Device-local only, never synced. */
  lastResult: LastResult | null;
  sync: SyncMeta;
}
export interface DataEnv {
  newId: () => string;
  now: number;
}
export function createEmptyData(env?: DataEnv): StoredData;
```

`src/features/storage/migrate.ts`: `migrate(raw: unknown, env?: DataEnv): StoredData`, `parseStored(text, env?)` (signatures extended, behaviour for v2 input is a sanitising pass that also repairs the view invariant by recomputing views from contribs).

`src/features/storage/record.ts`: `recordAttempt(data, input)` keeps its signature; additionally folds the delta into `sync.contribs[sync.ownId]` (rev + 1, updatedAt = input.at), uses attempt id `${ownId}-${newRev}`, appends the id to `unsyncedAttemptIds`, and sets views = `combine(contribs)`.

`src/features/sync/ids.ts`: `newContribId(): string` (crypto.getRandomValues, base62, 20 chars), `isContribId(s)`.

`src/features/sync/hash.ts`: `stableHash(value: unknown): string` (canonical JSON with sorted keys, FNV-1a 64-bit as 16 hex), `legacyContribId(aggregates: Aggregates): ContribId`.

`src/features/sync/combine.ts`:

```ts
export const emptyAggregates: () => Aggregates;
export function addAggregates(a: Aggregates, b: Aggregates): Aggregates;
/** keys/fingers/days/totals: field sums. lessons: completed OR, bestWpm max, bestAccuracy max,
 *  last* from the entry with the greatest lastAt (tie: greater lastWpm, then contrib id order), attempts summed. */
export function combine(contribs: Record<ContribId, Contribution>): Aggregates;
export function withViews(data: StoredData): StoredData; // sets views from combine(data.sync.contribs)
```

`src/features/sync/merge.ts`:

```ts
/** Per id keep higher rev; equal rev: higher totals.attempts, then higher updatedAt, then stableHash order. Commutative, associative, idempotent. */
export function mergeContribs(a: Record<ContribId, Contribution>, b: readonly Contribution[]): Record<ContribId, Contribution>;
/** Union by id (first seen wins on equal id), sort by (at, id) ascending, keep the newest `cap`. */
export function mergeAttempts(a: readonly Attempt[], b: readonly Attempt[], cap?: number): Attempt[];
export function linkKind(local: StoredData, uid: string): LinkKind;
/** True when local holds anything worth asking about (attempts or any contribution with totals.attempts > 0). */
export function hasProgress(data: StoredData): boolean;
/** THE merge. Pure. Sets sync.linkedUid = uid. Settings rule: first-link/other-account -> cloud wins if
 *  cloud.profile exists else local is pushed; same-account -> LWW by settingsUpdatedAt. */
export function mergeWithCloud(local: StoredData, cloud: CloudSnapshot, ctx: MergeContext): MergeResult;
/** Everything not yet confirmed: contribs with rev > pushedRevs[id] (missing = -1), attempts in unsyncedAttemptIds, profile if settingsUpdatedAt > pushedSettingsAt. */
export function pendingWrite(data: StoredData): CloudWrite;
export function pendingCount(data: StoredData): number;
/** Records exactly what was written (not the current state): pushedRevs[id] = max(old, written rev), removes written attempt ids, pushedSettingsAt = written value. */
export function markPushed(data: StoredData, written: CloudWrite): StoredData;
export function unlink(data: StoredData): StoredData; // linkedUid null, pushedRevs {}, pushedSettingsAt -1, unsynced = all attempt ids
```

`src/features/sync/dataOps.ts` (pure helpers the store calls):

```ts
export function applySettingsPatch(data: StoredData, patch: Partial<Settings>, now: number): StoredData; // bumps settingsUpdatedAt
/** Import: migrated file contents; every imported contribution becomes read-only (ownId fresh and empty);
 *  keeps current.sync.linkedUid; pushedRevs {}; unsynced = all attempt ids; lastResult from file. */
export function importData(current: StoredData, raw: unknown, env: DataEnv): StoredData;
export function resetData(env: DataEnv): StoredData; // empty, fresh ownId, unlinked
```

`src/features/sync/serialize.ts` (cloud docs are untrusted input; readers sanitise and return null on garbage):

```ts
export function encodeKey(k: string): string; // "k" + code points in hex joined by "_", e.g. " " -> "k20", "@" -> "k40"
export function decodeKey(s: string): string | null;
export function profileToDoc(p: CloudProfile, now: number): Record<string, unknown>;
export function docToProfile(raw: unknown): CloudProfile | null; // uses sanitiseSettings
export function contribToDoc(c: Contribution): Record<string, unknown>; // keys map encoded with encodeKey
export function docToContrib(id: string, raw: unknown): Contribution | null;
export function attemptToDoc(a: Attempt): Record<string, unknown>;
export function docToAttempt(id: string, raw: unknown): Attempt | null;
```

### Store bridge, `src/features/storage/store.ts` (D)

Existing exports keep their names and behaviour for callers. Additions:

```ts
export type CommitCause = "local" | "remote" | "import" | "reset";
export function subscribeCommits(cb: (next: StoredData, cause: CommitCause) => void): () => void;
/** Re-reads localStorage, applies a pure fn, writes, emits with cause "remote". */
export function applyRemote(fn: (current: StoredData) => StoredData): void;
```

`commitAttempt` re-reads localStorage before folding (fixes the existing two-tab lost-update window). `updateSettings` uses `applySettingsPatch(..., Date.now())`. `importJson` uses `importData`. `resetAll` uses `resetData`.

### Firestore document shapes (C validates these; B serialises to them)

| Path | Fields |
|------|--------|
| `users/{uid}` | `schema: 2` (int), `settings: map` (at most 40 entries), `settingsUpdatedAt: number >= 0`, `updatedAt: number` |
| `users/{uid}/contribs/{contribId}` | `id == contribId`, `rev: int >= 0`, `updatedAt: number`, `keys: map` (<= 300 entries, keys match `^k[0-9a-f]{1,6}(_[0-9a-f]{1,6})*$`), `fingers: map` (keys hasOnly the 9 finger names), `days: map` (<= 20000 entries), `lessons: map` (<= 500 entries), `totals: map` hasOnly/hasAll `attempts,timeMs,chars` numbers >= 0 |
| `users/{uid}/attempts/{attemptId}` | exactly `id,at,source,lang,netWpm,rawWpm,accuracy,consistency,errors,durationMs,chars,passed`; `id == attemptId`; `attemptId` matches `^[A-Za-z0-9_.-]{1,96}$`; `source` string <= 64; `lang in ['de','en']`; numbers >= 0; `accuracy <= 100`; `passed is bool` |

Rule semantics: only `request.auth.uid == uid` may read or write `users/{uid}` and the two known subcollections; everything else denied. Contrib update requires `request.resource.data.rev >= resource.data.rev`. Profile update requires `request.resource.data.settingsUpdatedAt >= resource.data.settingsUpdatedAt`. Delete allowed for the owner on all three. Index exemptions for `contribs` map fields (`keys`, `days`, `lessons`, `fingers`) keep the doc far below the index-entry limit.

## Workstreams, file ownership and integration order

| Stream | Milestone | Owns (only this stream edits these files) | Depends on |
|--------|-----------|---------------------------------------------|------------|
| M0 integrator | M0 | `package.json`, `package-lock.json`, `eslint.config.mjs`, `.gitignore`, `src/config/firebase.ts`, `src/features/sync/types.ts`, `src/features/auth/types.ts`, `src/features/sync/state.ts` (created) | nothing |
| A: Firebase client, auth, UI | M1 | `src/features/firebase/client.ts`, `src/features/firebase/auth.ts`, `src/features/auth/session.ts`, `src/features/auth/errors.ts`, `src/features/auth/errors.test.ts`, `src/features/auth/session.test.ts`, `src/features/auth/AccountView.tsx` + `.module.css`, `src/features/auth/AuthForm.tsx`, `src/features/auth/LinkDialog.tsx`, `src/features/auth/DeleteAccount.tsx`, `src/features/auth/SyncBadge.tsx`, `src/app/account/page.tsx`, `src/components/layout/Header.tsx` + `.module.css`, `src/features/settings/SettingsView.tsx`, `src/features/stats/StatsView.tsx` (copy only) | M0 |
| B: data model, merge, serialisation | M2 | `src/features/storage/schema.ts`, `migrate.ts`, `record.ts`, `storage.test.ts`, `src/features/sync/{ids,hash,combine,merge,dataOps,serialize}.ts` and their `*.test.ts`, `src/features/sync/types.ts` (after M0) | M0 |
| C: rules, Firebase config, docs | M3 | `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`, `firestore/rules.test.ts`, `vitest.rules.config.ts`, `tsconfig.json`, `DECISIONS.md`, `README.md`, `PROJECT.md`, `AGENTS.md` (Stack line only), `src/app/about/page.tsx`, `src/components/layout/Footer.tsx`, `src/config/site.ts` | M0 (scripts), shapes table above |
| D: sync engine and store wiring | M4 | `src/features/storage/store.ts`, `src/features/storage/persist.ts`, `src/features/firebase/cloud.ts`, `src/features/sync/engine.ts`, `src/features/sync/engine.test.ts`, `src/features/sync/testing/fakeCloud.ts`, `src/features/sync/controller.ts`, `src/features/sync/SyncProvider.tsx`, `src/features/sync/state.ts` (after M0), `src/app/layout.tsx`, `firestore/cloud.emulator.test.ts` | M2 merged (tasks 4.1 to 4.5); M1 tasks 1.1 to 1.4 merged (tasks 4.6 onwards) |
| Integrator | M5 | `e2e/smoke.spec.ts`, `e2e/account.spec.ts`, this plan | all |

Integration order: **M0 -> {A, B, C} in parallel -> merge B, then A, then C -> D -> M5.** D may start right after B merges; it needs A's `client.ts` and `session.ts` only from task 4.6.

Parallel mechanics: give each stream its own git worktree on its own branch cut from the M0 commit (worktrees under the OS temp dir, never inside the repo; run `npm ci` in each). Each stream runs `npm run lint`, `npm run typecheck`, `npm run test` in its worktree before handing back; the full `npm run check` and e2e run in M5. If streams instead share one working tree, they must not run `npm run format` (it rewrites every file) and must only `prettier --write` their own files.

## Affected files

- `package.json` / `package-lock.json`: add `firebase@^13.0.0` (dependency), `@firebase/rules-unit-testing@^6.0.0` (devDependency); add script `test:rules` = `firebase emulators:exec --only firestore --project demo-i-am-speed "vitest run -c vitest.rules.config.ts"`. `check` script unchanged.
- `eslint.config.mjs`: `@typescript-eslint/no-restricted-imports` forbidding static value imports of `firebase`, `firebase/*`, `@/features/firebase/*` (type imports allowed) everywhere except files under `src/features/firebase/**`.
- `.gitignore`: add `.firebase/`, `firebase-debug.log*`, `firestore-debug.log*` (the `*.log` rule already covers some).
- `src/config/firebase.ts` (new): the public web config object, the only place it appears.
- `src/features/sync/types.ts`, `src/features/auth/types.ts`, `src/features/sync/state.ts` (new): contracts above.
- `src/features/storage/schema.ts`: StoredData v2, `SCHEMA_VERSION = 2`, `DataEnv`, `createEmptyData(env?)`.
- `src/features/storage/migrate.ts`: v1 -> v2 (legacy frozen contribution, fresh empty own contribution, `settingsUpdatedAt: 0`, sync meta defaults), v2 sanitising pass including `sync`, views recomputed from contribs. May need splitting into `migrate.ts` + `sanitise.ts` to stay under about 250 lines.
- `src/features/storage/record.ts`: fold into own contribution, new attempt id format, unsynced id tracking, views from `combine`.
- `src/features/storage/storage.test.ts`: update for v2 (existing assertions keep holding: caps, aggregates, round trip, corrupt recovery).
- `src/features/sync/{ids,hash,combine,merge,dataOps,serialize}.ts` + tests (new): pure model.
- `src/features/firebase/client.ts`, `src/features/firebase/auth.ts` (new): lazy Firebase init and the `AuthAdapter`.
- `src/features/firebase/cloud.ts` (new): `CloudAdapter` on Firestore Lite (`getDoc`, `getDocs` with `orderBy("at","desc")` + `limit(MAX_ATTEMPTS)`, `writeBatch` chunked at 450 ops, profile written separately, paged deletes, error mapping to `CloudError`).
- `src/features/auth/{session,errors}.ts` + tests (new): auth store, hint key, Firebase error code mapping.
- `src/features/auth/{AccountView,AuthForm,LinkDialog,DeleteAccount,SyncBadge}.tsx` + CSS (new): UI.
- `src/app/account/page.tsx` (new): static route, `title: "account"`, `robots: { index: false }`, renders `AccountView`.
- `src/components/layout/Header.tsx` / `.module.css`: add an "account" nav item (lucide `User` or `Cloud` icon) with `SyncBadge` dot; builds on the user's current uncommitted icon-nav edits.
- `src/features/settings/SettingsView.tsx`: "your data" copy, an account row linking to `/account/`, import hint for signed-in users, reset behaviour when signed in.
- `src/features/stats/StatsView.tsx`: copy ("in this browser" -> neutral wording when synced).
- `src/features/storage/store.ts`: commit listeners, `applyRemote`, fresh-read in `commitAttempt`, pure helpers for settings/import/reset.
- `src/features/storage/persist.ts`: only if a raw read helper is needed for the fresh-read; otherwise untouched.
- `src/features/sync/{engine,controller}.ts`, `testing/fakeCloud.ts`, `SyncProvider.tsx` (new): engine, wiring, provider.
- `src/app/layout.tsx`: mount `<SyncProvider />` (client, renders null).
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc` (new): rules, index exemptions, emulator ports, default project `speed-pwa`.
- `firestore/rules.test.ts`, `firestore/cloud.emulator.test.ts`, `vitest.rules.config.ts` (new): emulator-only tests (not in `npm run check`).
- `tsconfig.json`: include `firestore/**/*.ts`.
- `DECISIONS.md`: D13 (optional cloud sync supersedes PROJECT.md section 2 for signed-in users), D14 (sync data model and merge semantics), D15 (Firestore Lite and lazy boundary).
- `README.md`: intro wording, new "Cloud sync (optional)" section, Verify (`npm run test:rules`), Structure lines for `src/features/{auth,sync,firebase}`.
- `PROJECT.md`: short amendment notes in sections 2 and 16 pointing at DECISIONS D13.
- `AGENTS.md`: Stack bullet "No backend; data in localStorage only." becomes the current-state fact (in place, no changelog).
- `src/app/about/page.tsx`: lede fix ("makes no network requests" is now conditional) and a "privacy and accounts" section.
- `src/components/layout/Footer.tsx`: "everything stays in your browser" -> "stays in your browser unless you sign in" (or similar, under one line).
- `src/config/site.ts`: description "no account." -> "no account needed."
- `e2e/smoke.spec.ts`: keep the zero-network assertion; add that no loaded JS contains Firebase markers.
- `e2e/account.spec.ts` (new): account page and failure path without real Firebase.

## Risks / Unknowns

- **Uncommitted user edits** in `src/components/layout/Header.tsx` and `Header.module.css` (icon nav). A must build on them, never revert them. The main agent should ask the user whether to commit them first (preferred) before M1 branches are cut, otherwise worktrees will not contain them.
- **Java is missing**, so the Firestore emulator (and `npm run test:rules`) cannot run on this machine. Rules are then verified by compile at deploy time (`firebase deploy --only firestore:rules --dry-run` if supported by CLI 15, else the real deploy the main agent plans) and by careful review. Unit coverage of sync logic uses the in-memory `FakeCloud`. Guess: the CLI dry-run flag exists for rules; verify.
- **Firestore map key safety**: per-key stats keys are typed characters (`" "`, `"."`, `"@"`, `"\\"`). Field names via `setDoc` objects should allow these, but `encodeKey` sidesteps every edge case (empty, reserved `__x__`, dots in field paths) and lets rules validate keys with a regex. Small cost: one encode/decode per key on push/pull.
- **Google popup on a custom domain**: `signInWithPopup` with `authDomain: speed-pwa.firebaseapp.com` should work on `speed.nohelll.com` (authorized) and `localhost` (authorized by default). Redirect flow is not used because third-party storage partitioning breaks it without a same-origin `/__/auth` proxy, which a static export cannot provide. Popup blocked or closed is mapped to a clear message. Unknown: whether Vercel or the browser sets a COOP header that breaks popup polling; none is configured today.
- **Clock skew** between devices affects settings LWW only (`settingsUpdatedAt`); aggregates and attempts are skew-free by design. Acceptable.
- **Two legacy exports** of different ages imported into one account produce two different legacy hashes and double count their overlap. Rare; documented in D14, not solved.
- **Account switching on a shared computer**: `other-account` link asks to merge or cancel (cancel signs out, nothing changes). There is no "replace this device with the cloud" option in this plan; reset-then-sign-in achieves it.
- **"Delete cloud data" semantics (interpretation)**: implemented as "delete my account and cloud data": re-authenticate, delete the Firestore subtree, delete the Auth user, sign out; the local copy stays and can be reset separately. Deleting cloud data while staying signed in would immediately re-upload local data, so it is not offered. If the user wanted a keep-account variant, it needs a "pause sync" concept; flag in the final report.
- **App Check is not enabled**. The public API key plus owner-only rules prevent cross-user access; quota abuse by a malicious signed-in user is bounded by rules size limits. Enabling App Check is a follow-up decision.
- **Email verification** is not required for sync. Unknown whether the user wants it; easy to add later.
- **Multi-tab**: the engine elects one leader per browser with `navigator.locks.request("i-am-speed-sync", ...)`; other tabs pick up changes via the existing `storage` event. Without Web Locks every tab syncs; writes are idempotent so the only cost is extra requests.
- **Bundle size**: Firebase app + auth + firestore/lite is a large lazy chunk (rough guess 150 to 250 kB min). It must never be in the initial chunks; enforced by ESLint and the e2e check.
- **`verification.md` drift**: `npm run check` is unchanged, so the rule stays accurate. `npm run test:rules` is an extra, optional command; adding it to the rule is a user-owned rule change and is only proposed, not applied.
- **Next 16 static export**: no server code is added; `/account/` is a static page. Firebase packages are ESM and only reached through `import()` inside effects/handlers, so SSR never evaluates them.

## Done criteria

- Anonymous use: no Firebase JS loaded, zero non-localhost requests (existing smoke assertion green), all existing e2e green without an account.
- Signing in (email+password or Google) merges local and cloud data per the merge rules; unit tests prove: attempt union deduped by id, per-lesson best/completed preserved, aggregates summed without double counting across repeated merges, settings precedence, legacy data dedupe, idempotence and commutativity.
- Sync engine tests (FakeCloud) prove: debounced batched pushes, offline queue via `pendingWrite` survives failures and reloads, stale-profile handling, other-account confirmation, typing-route deferral, no Firebase load for anonymous state.
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc` exist and match the shapes table; `firestore/rules.test.ts` covers owner access, cross-user denial, shape violations, rev and settings monotonicity (runs where Java exists).
- Account UI: sign in, sign up, Google, password reset, sign out, sync status (header badge and account page), sync now, delete account and cloud data with re-auth; privacy section on the about page.
- DECISIONS D13 to D15, README "Cloud sync (optional)", PROJECT.md notes, AGENTS.md Stack fact updated.
- `npm run check` green and `npm run test:e2e` green.

## Milestones

### M0. Foundations (sequential, one agent, before fan-out)

Outcome: dependencies, lazy-import guard and the shared contract files exist on one commit that every stream branches from.

- [x] 0.1 Ask the main agent/user to commit or confirm the uncommitted Header edits; record the outcome in the Log.
- [x] 0.2 `npm install firebase@^13.0.0` and `npm install -D @firebase/rules-unit-testing@^6.0.0`; add the `test:rules` script to `package.json`. Do not change `check`.
- [x] 0.3 Create `src/config/firebase.ts` exporting `FIREBASE_CONFIG` (apiKey `AIzaSyDa5a5cIMHmfpD2obQDfPgpMt6wsd3HTpQ`, authDomain `speed-pwa.firebaseapp.com`, projectId `speed-pwa`, storageBucket `speed-pwa.firebasestorage.app`, messagingSenderId `624830547053`, appId `1:624830547053:web:f46a934f3e1503905f6b64`) `as const`, with a one-line comment that the web config is public and access is enforced by `firestore.rules`. No Firebase imports in this file.
- [x] 0.4 Create `src/features/sync/types.ts` and `src/features/auth/types.ts` verbatim from "Shared interfaces" (resolve the `StoredData` import as described; `schema.ts` itself is changed in M2, so `MergeResult.data` may reference the v1 type until then without breaking typecheck).
- [x] 0.5 Create `src/features/sync/state.ts` (`useSyncState`, `getSyncState`, `setSyncState`, `registerSyncActions`, `getSyncActions`), server snapshot `{ kind: "local" }`.
- [x] 0.6 Add the ESLint `no-restricted-imports` guard (static value imports of `firebase`, `firebase/*`, `@/features/firebase/*` banned outside `src/features/firebase/**`; `allowTypeImports: true`). Add `.gitignore` entries.
- [x] 0.7 `npm run lint && npm run typecheck && npm run test` green; commit "Add Firebase dependencies and sync contracts" (no AI co-author trailer, per AGENTS.md). Worktree branches are cut by the main agent.

### M1. Workstream A: Firebase client, auth and account UI (parallel)

Outcome: a user can sign up, sign in (email or Google), reset a password, sign out and delete their account from `/account/`, with the sync status visible; nothing Firebase loads until they act.

- [ ] 1.1 `src/features/firebase/client.ts`: memoised `loadFirebase()` per the interface; dynamic `import("firebase/app")`, `import("firebase/auth")`, `import("firebase/firestore/lite")`; `initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence], popupRedirectResolver: browserPopupRedirectResolver })`; throws a clear error when `typeof window === "undefined"`.
- [ ] 1.2 `src/features/auth/errors.ts` + `errors.test.ts`: `mapAuthError(e: unknown): { code: AuthErrorCode; message: string }` covering `auth/invalid-credential`, `auth/wrong-password`, `auth/user-not-found`, `auth/invalid-email`, `auth/email-already-in-use`, `auth/weak-password`, `auth/popup-closed-by-user`, `auth/cancelled-popup-request`, `auth/popup-blocked`, `auth/network-request-failed`, `auth/too-many-requests`, `auth/requires-recent-login`, unknown. Messages lowercase-calm, English, no codes shown to users.
- [ ] 1.3 `src/features/firebase/auth.ts`: `createFirebaseAuthAdapter(handles): AuthAdapter` implementing every method (Google via `GoogleAuthProvider` + `signInWithPopup`; reauth via `EmailAuthProvider.credential` or `reauthenticateWithPopup`; `deleteUser`); all failures return `AuthResult` via `mapAuthError`, never throw.
- [ ] 1.4 `src/features/auth/session.ts` + `session.test.ts`: implement the session API; `bootAuth()` reads `AUTH_HINT_KEY` in try/catch and only then imports the adapter; adapter `onChange` updates the store and writes/removes the hint key; test with an injected fake adapter loader that anonymous boot never calls the loader and that sign-in/out toggle the hint.
- [ ] 1.5 `SyncBadge.tsx`: small status dot + accessible label from `useSyncState()` and `useAuth()`; renders nothing until `useHydrated()`; colours via existing CSS variables only (accent for synced, muted for local/syncing, error token for error).
- [ ] 1.6 `AuthForm.tsx`: email + password fields (labelled, `autocomplete` set), "sign in", "create account", "continue with Google", "forgot password"; preloads `getAuthAdapter()` on first focus/pointerenter of the form; shows `AuthResult` messages through `Notice`; disables buttons while pending.
- [ ] 1.7 `LinkDialog.tsx`: shown when `SyncState.kind === "confirm-link"`; explains that this device holds progress from another account; "merge into this account" calls `getSyncActions()?.resolveLink("merge")`, "cancel" calls `resolveLink("cancel")`.
- [ ] 1.8 `DeleteAccount.tsx`: two-step confirm; re-auth (password field for `password` provider, Google popup otherwise) -> `getSyncActions()?.deleteCloudData()` -> `adapter.deleteUser()` -> `signOut()`; if `deleteUser` fails after data deletion, still sign out and say the account record remains and can be removed by signing in and repeating (the engine is paused by D so nothing re-uploads in between). Copy states that the local copy stays on this device.
- [ ] 1.9 `AccountView.tsx` + `.module.css` and `src/app/account/page.tsx` (`title: "account"`, `robots: { index: false }`, canonical `/account/`): signed-out shows a one-paragraph explanation (optional, what is synced, local-only otherwise) + `AuthForm`; signed-in shows email, provider, status line, "sync now", "sign out", `DeleteAccount`; `LinkDialog` when needed. Gate on `useHydrated()`. Reuse `Section`, `Row`, `Button`, `Notice`; no new colours.
- [ ] 1.10 `Header.tsx` / `.module.css`: add `{ href: "/account/", label: "account", Icon: User }` to `NAV` on top of the existing icon-nav edits, with `SyncBadge` overlaid on the icon; mobile layout keeps the label hidden as today.
- [ ] 1.11 `SettingsView.tsx`: "your data" description becomes "Stored in this browser. Sign in on the account page to sync across devices." (signed-out) or "Synced to your account." (signed-in); add a row linking to `/account/`; import hint when signed in: "Merged into your account."; reset when signed in: confirm copy says it signs you out and clears this device only, and calls `signOut()` before `resetAll()`.
- [ ] 1.12 `StatsView.tsx`: replace "in this browser only" / "stored in this browser" with wording that is true for both modes (copy only).
- [ ] 1.13 `npm run lint && npm run typecheck && npm run test` green in the A worktree; commit.

### M2. Workstream B: data model, migration, merge and serialisation (parallel, pure TS, no React)

Outcome: schema v2 with per-device contributions, a pure merge that is unit-tested to be lossless and idempotent, and validated Firestore (de)serialisation.

- [ ] 2.1 `src/features/sync/ids.ts` (+ test): `newContribId()` 20-char base62 via `crypto.getRandomValues` (Node 22 and browsers have `globalThis.crypto`), `isContribId()` matching `^[A-Za-z0-9_-]{8,64}$`.
- [ ] 2.2 `src/features/sync/hash.ts` (+ test): canonical JSON (sorted keys, recursive) and FNV-1a 64-bit (BigInt or two 32-bit halves) to 16 hex; `legacyContribId()`; test stability across key order.
- [ ] 2.3 `src/features/sync/combine.ts` (+ test): `emptyAggregates`, `addAggregates`, `combine`, `withViews` per the interface; tests for lessons rules (OR, max, latest by `lastAt`, summed attempts) and sums.
- [ ] 2.4 `schema.ts`: StoredData v2 fields, `SCHEMA_VERSION = 2`, `DataEnv` with a default env (`newContribId`, `Date.now()`), `createEmptyData(env?)` producing an empty own contribution. Keep `STORAGE_KEY = "i-am-speed:v1"` (ThemeScript and existing users depend on it); add a comment that the key name is historical.
- [ ] 2.5 `migrate.ts` (split a `sanitise.ts` out if it passes about 250 lines): v0/v1 -> v2: if the v1 aggregates are non-empty, create a frozen contribution `{ id: legacyContribId(aggs), rev: 0, ...aggs }`; own = fresh empty; `settingsUpdatedAt: 0`; `sync` defaults (`linkedUid: null`, `unsyncedAttemptIds: all attempt ids`, `pushedRevs: {}`, `pushedSettingsAt: -1`). v2: sanitise every `sync` field (drop invalid contribs/ids, clamp unsynced ids to existing attempts, repair a missing own contribution) and set views via `withViews`. Never throws.
- [ ] 2.6 `record.ts`: fold metrics into `contribs[ownId]` (rev + 1, `updatedAt = input.at`), attempt id `${ownId}-${rev}`, push id onto `unsyncedAttemptIds` (trimmed to existing attempts after the cap), views via `withViews`. `lastResult` unchanged.
- [ ] 2.7 Update `storage.test.ts`: all existing assertions still pass (cap keeps aggregates, free tests create no lesson progress, round trip, corrupt recovery); add v1 -> v2 migration test where every stats view (`keys`, `fingers`, `days`, `lessons`, `totals`) is deep-equal before and after, and a determinism test using an injected env.
- [ ] 2.8 `merge.ts`: `mergeContribs`, `mergeAttempts`, `linkKind`, `hasProgress`, `mergeWithCloud`, `pendingWrite`, `pendingCount`, `markPushed`, `unlink` exactly per the interface. `mergeWithCloud` computes `push` as: contribs whose merged rev exceeds the cloud's rev for that id (missing = -1), local attempts not present in `cloud.attempts` plus every id in `unsyncedAttemptIds`, and the profile when local settings win; resulting `sync.pushedRevs` reflect the cloud's revs, `unsyncedAttemptIds` = ids in `push.attempts`.
- [ ] 2.9 `merge.test.ts`, at minimum: (a) empty with empty; (b) first link, empty cloud: all local pushed, local settings uploaded; (c) first link, cloud has data: attempts union deduped by id, cloud settings win, nothing from either side missing; (d) `mergeWithCloud` applied twice equals once (idempotence) and repeated merges never change totals; (e) `mergeContribs` commutative and associative on random inputs (seeded `createRng` from `src/lib/rng.ts`); (f) per-lesson best is the max, completed is OR, last is the latest; (g) same legacy data arriving from two devices is counted once; (h) own contrib newer locally wins, newer in cloud (another tab) wins; (i) attempts cap keeps the newest 500 with deterministic tie order; (j) same-account settings LWW in both directions; (k) other-account merge keeps all local and cloud data; (l) property test: random sequences of `recordAttempt` on simulated devices plus merges in random order always give `views === combine(contribs)` and `totals.attempts` equal to the true number of recorded attempts; (m) `pendingWrite`/`markPushed` with a change recorded between push start and confirm keeps the new change pending.
- [ ] 2.10 `dataOps.ts` (+ test): `applySettingsPatch`, `importData`, `resetData` per the interface; test that importing the same v1 export twice yields the same contribution set, and importing a v2 export makes its own contribution read-only (fresh ownId on the importing device).
- [ ] 2.11 `serialize.ts` (+ test): per the interface and the shapes table; round-trip tests for every doc type; garbage, wrong types, oversize maps, bad ids and undecodable keys return null or are dropped; `docToProfile` runs `sanitiseSettings`.
- [ ] 2.12 `npm run lint && npm run typecheck && npm run test` green in the B worktree; commit.

### M3. Workstream C: security rules, Firebase project files and docs (parallel)

Outcome: deployable, tested owner-only rules with shape validation, Firebase CLI config, and documentation of the deliberate change.

- [ ] 3.1 `firebase.json`: `firestore: { rules: "firestore.rules", indexes: "firestore.indexes.json" }`, `emulators: { firestore: { port: 8080 }, auth: { port: 9099 }, singleProjectMode: true }`; no hosting section (Vercel hosts). `.firebaserc`: `{ "projects": { "default": "speed-pwa" } }`.
- [ ] 3.2 `firestore.rules` (`rules_version = '2'`): helper `isOwner(uid)`; validators `validProfile`, `validContrib(id)`, `validAttempt(id)` per the shapes table; owner read/delete on `users/{uid}`, `contribs/{id}`, `attempts/{id}`; create needs a valid shape; updates add the `rev` and `settingsUpdatedAt` monotonic checks; no other paths allowed.
- [ ] 3.3 `firestore.indexes.json`: `indexes: []`, `fieldOverrides` disabling indexing for `contribs.keys`, `contribs.days`, `contribs.lessons`, `contribs.fingers` (collection-group `contribs`, both scopes as the CLI format requires).
- [ ] 3.4 `vitest.rules.config.ts` (include `firestore/**/*.test.ts`, node env, alias `@`) and `firestore/rules.test.ts` with `@firebase/rules-unit-testing`: owner can read/write each doc type; another uid and unauthenticated are denied; unknown subcollection denied; attempt with extra field, wrong `lang`, `id` mismatch, oversize `source` denied; contrib with lower `rev` denied; profile with older `settingsUpdatedAt` denied; owner delete allowed. Add `firestore/**/*.ts` to `tsconfig.json` `include`.
- [ ] 3.5 Try `npm run test:rules`; if Java is missing, record that in the Log and confirm the rules at least parse (`firebase deploy --only firestore:rules --dry-run --project speed-pwa` if available, otherwise leave for the main agent's deploy step and say so).
- [ ] 3.6 `DECISIONS.md`: D13 optional account and cloud sync (context: PROJECT.md section 2; decision: anonymous stays local-only with zero runtime requests, signing in enables Firebase Auth + Firestore; reason: user request for cross-device data; public web config committed, security via rules). D14 data model and merge (contributions, legacy hash, attempt ids, settings precedence and LWW, lastResult local-only, delete semantics, known legacy-export limitation). D15 Firestore Lite + lazy boundary + ESLint guard + popup-only Google sign-in.
- [ ] 3.7 `README.md`: intro sentence (no account needed; optional sign-in syncs progress); new "Cloud sync (optional)" section (what syncs, where config lives, `firebase deploy --only firestore:rules,firestore:indexes`, emulator test command and the Java requirement, authorized domains `speed.nohelll.com` and `localhost`); Verify section adds `npm run test:rules`; Structure adds `src/features/auth`, `src/features/sync`, `src/features/firebase`.
- [ ] 3.8 `PROJECT.md`: add one short note line under section 2 and under section 16: "Amended 2026-10-11: optional sign-in with Firebase cloud sync, anonymous use unchanged. See DECISIONS.md D13." Do not rewrite the original spec text.
- [ ] 3.9 `AGENTS.md`: edit the Stack bullet in place to "No backend of its own; data in localStorage, with optional Firebase (Auth + Firestore) sync for signed-in users." No other AGENTS.md changes.
- [ ] 3.10 `src/app/about/page.tsx`: lede no longer claims "makes no network requests" unconditionally; add a "privacy and accounts" section: without an account nothing leaves the browser; with an account, settings, attempt history and stats are stored in Google Firebase (Firestore, project region as configured) under your user id and only you can read them; what is not synced (the full detail of your latest result); how to delete (account page). `src/components/layout/Footer.tsx` and `src/config/site.ts` copy per Affected files.
- [ ] 3.11 `npm run lint && npm run format:check && npm run typecheck` green in the C worktree; commit.

### M4. Workstream D: sync engine and storage wiring (after M2; tasks 4.6+ after M1.1 to 1.4)

Outcome: signed-in browsers reconcile with Firestore in the background, offline-tolerant and batched, without touching the keystroke path; anonymous browsers are unaffected.

- [ ] 4.1 `store.ts`: add `CommitCause`, `subscribeCommits`, `applyRemote`; `commit()` takes a cause and notifies commit listeners after `emit()`; `commitAttempt` re-reads storage via `readStored()` before `recordAttempt`; `updateSettings` -> `applySettingsPatch(snapshot, patch, Date.now())`; `importJson` keeps its validation and uses `importData`; `resetAll` uses `resetData`. Existing exports keep names and signatures.
- [ ] 4.2 `src/features/sync/testing/fakeCloud.ts`: in-memory `CloudAdapter` with per-uid docs, switchable `offline` mode, injectable `stale-profile`/`permission-denied` failures and call counters.
- [ ] 4.3 `src/features/sync/engine.ts`: `createSyncEngine(deps: { cloud: CloudAdapter; store: { get(): StoredData; apply(fn): void; subscribe(cb): () => void }; now(): number; setTimer/clearTimer; idle(cb): void; isTypingRoute(): boolean; signOut(): Promise<void> })` returning `{ attach(user: AuthUser): Promise<void>; detach(): void; syncNow(): Promise<void>; resolveLink(choice): Promise<void>; deleteCloudData(): Promise<...>; onRouteChange(): void }`. Behaviour: attach -> `starting` -> pull -> if `linkKind === "other-account"` and `hasProgress` -> `confirm-link` and wait; else `mergeWithCloud` -> apply (deferred and re-merged from the kept snapshot while `isTypingRoute()`) -> push `pendingWrite` -> `markPushed` -> `synced`. Local commits schedule a push after 2000 ms of quiet, run through `idle`. Network failure -> `offline` with backoff 5 s, 15 s, 60 s, then 5 min cap; `stale-profile` -> pull and re-merge (cloud settings win); `permission-denied` -> `error`. `detach` clears all timers and sets `local`. `deleteCloudData` pauses (no further pushes until detach), calls `cloud.deleteAll`, then `apply(unlink)`. File stays under about 250 lines; split scheduling into `schedule.ts` if needed.
- [ ] 4.4 `engine.test.ts` with `FakeCloud` and Vitest fake timers: first link pushes everything and a second device pulls identical stats; three quick local commits produce one push; offline push failure keeps `pendingCount > 0`, a reload (new engine on the same stored data) pushes it later; stale-profile path; other-account confirm then merge, and cancel calls `signOut` and leaves local data untouched; deferral on typing routes then apply on route change; `detach` stops pushes; after `deleteCloudData` no push happens even if a commit arrives.
- [ ] 4.5 Verify no engine code runs on keystrokes: the engine subscribes only to `subscribeCommits`, and `commit` is only called on attempt finish and settings/import/reset (grep the typing feature for store calls and note the result in the Log).
- [ ] 4.6 `src/features/firebase/cloud.ts`: `createFirestoreCloud(handles): CloudAdapter` with Firestore Lite: pull = `getDoc(users/{uid})` + `getDocs(contribs)` + `getDocs(query(attempts, orderBy("at","desc"), limit(MAX_ATTEMPTS)))`, all through B's `docTo*`; push = profile `setDoc` alone (map rules rejection to `stale-profile`), then contribs + attempts via `writeBatch` chunks of 450; deleteAll = paged `getDocs(limit(400))` + batched deletes for both subcollections, then the profile doc; Firebase error codes `unavailable`/`failed-precondition`/fetch failures -> `offline`, `permission-denied` -> `permission-denied`.
- [ ] 4.7 `src/features/sync/controller.ts`: client-only glue. `startSync()` subscribes to `subscribeAuth`; on a user: dynamic `import("@/features/firebase/client")` and `import("@/features/firebase/cloud")`, create the engine with real deps (`requestIdleCallback` fallback to `setTimeout`, `isTypingRoute` from `window.location.pathname`), take the Web Lock `i-am-speed-sync` when `navigator.locks` exists (non-leader tabs show `synced` from the leader via the storage event and do not push), `registerSyncActions(...)`, `attach(user)`; on null: `detach()`, `registerSyncActions(null)`, `setSyncState({ kind: "local" })`. Pull triggers: `visibilitychange` to visible and `focus` (throttled to once per 60 s), `online`.
- [ ] 4.8 `src/features/sync/SyncProvider.tsx` (`"use client"`, renders `null`): in a mount effect call `bootAuth()` then `startSync()`; forwards `usePathname()` changes to `engine.onRouteChange()`. Mount it in `src/app/layout.tsx` next to `ThemeSync`. Confirm that `SyncProvider`'s static import graph contains no `firebase` module (ESLint guard green).
- [ ] 4.9 Optional (needs Java): `firestore/cloud.emulator.test.ts` runs `createFirestoreCloud` against the emulator with `connectFirestoreEmulator` (push, pull, deleteAll, stale-profile). Skip with a Log note if Java is unavailable.
- [ ] 4.10 `npm run lint && npm run typecheck && npm run test` green on the integrated branch (B + A + C + D); commit.

### M5. Integration and verification (sequential, one agent)

Outcome: everything merged on `main`, all checks green, behaviour confirmed end to end where possible.

- [ ] 5.1 Merge branches in order B, A, C, D; resolve only trivial conflicts (ownership should prevent real ones); re-run `npm ci` if the lockfile changed.
- [ ] 5.2 `e2e/smoke.spec.ts`: in the existing anonymous lesson test, also collect every `.js` response body and assert none contains `firestore.googleapis.com` or `identitytoolkit` (no Firebase chunk loaded); keep the zero external request assertion as is.
- [ ] 5.3 `e2e/account.spec.ts`: `/account/` renders the sign-in form with labelled fields; with `page.route("**/*.googleapis.com/**", r => r.abort())` a sign-in attempt shows the network error message and the rest of the app (lesson list) still works; visiting `/account/` without interacting makes no external requests.
- [ ] 5.4 `npm run check` green.
- [ ] 5.5 `npm run build && npm run test:e2e` green (all pre-existing specs unchanged and passing without an account).
- [ ] 5.6 Bundle check: in `out/`, confirm the Firebase code sits in chunks not referenced by `out/index.html` (record chunk names and sizes in the Log).
- [ ] 5.7 Manual check against the real project (main agent after rules deploy): sign up on `localhost` dev, finish a lesson, see the docs in the console, sign in from a second browser profile with different local data, confirm merged stats and no double counting; record results or "not performed" in the Log.
- [ ] 5.8 Write the task evidence record in `.docs/evidence/` (learning disposition `pending`), set this plan to `status: done`, append the final Log entry.

## Log
- 2026-10-11 17:10 M0 done. 0.1: Header edits were committed by the user/main agent before M0 (HEAD 041130e). 0.2 to 0.6 implemented; `MergeResult.data` uses a normal `import type { StoredData }` (type-only cycle with schema.ts, typecheck green). ESLint guard verified to reject a static `firebase/app` import. lint, typecheck, test green (84 tests). Evidence record not created for M0 (no verification-evidence step defined; M5.8 writes it). Worktree branch cutting left to the main agent per instruction.
