import { MAX_ATTEMPTS, type Attempt } from "@/features/storage/schema";
import {
  attemptToDoc,
  contribToDoc,
  docToAttempt,
  docToContrib,
  docToProfile,
  profileToDoc,
} from "../serialize";
import {
  CloudError,
  type CloudAdapter,
  type CloudErrorCode,
  type CloudSnapshot,
  type CloudWrite,
} from "../types";

interface UserDocs {
  profile: Record<string, unknown> | null;
  contribs: Map<string, Record<string, unknown>>;
  attempts: Map<string, Record<string, unknown>>;
}

type Operation = "pull" | "push" | "deleteAll";

/**
 * In-memory CloudAdapter. Stores documents in their serialised shape and enforces the same monotonic
 * rules as firestore.rules, so engine tests also exercise serialisation.
 */
export class FakeCloud implements CloudAdapter {
  /** While true every operation fails with code "offline". */
  offline = false;
  readonly calls: Record<Operation, number> = { pull: 0, push: 0, deleteAll: 0 };
  /** Every accepted push, in order, for assertions. */
  readonly writes: CloudWrite[] = [];
  /** Optional hook awaited at the start of each push, to interleave local changes with a push. */
  beforePush: (() => void | Promise<void>) | null = null;
  private readonly users = new Map<string, UserDocs>();
  private readonly injected: { op: Operation; code: CloudErrorCode }[] = [];

  /** The next call of `op` fails once with `code`. */
  failNext(op: Operation, code: CloudErrorCode): void {
    this.injected.push({ op, code });
  }

  /** Seed an account's cloud data directly (another device's earlier push). */
  seed(uid: string, write: CloudWrite): void {
    this.apply(uid, write);
  }

  private docs(uid: string): UserDocs {
    let d = this.users.get(uid);
    if (!d) {
      d = { profile: null, contribs: new Map(), attempts: new Map() };
      this.users.set(uid, d);
    }
    return d;
  }

  private gate(op: Operation): void {
    this.calls[op] += 1;
    if (this.offline) throw new CloudError("offline", "fake cloud is offline");
    const i = this.injected.findIndex((f) => f.op === op);
    if (i >= 0) {
      const [f] = this.injected.splice(i, 1);
      throw new CloudError(f.code, `injected ${f.code}`);
    }
  }

  private apply(uid: string, w: CloudWrite): void {
    const d = this.docs(uid);
    if (w.profile) {
      const old = d.profile ? docToProfile(d.profile) : null;
      if (old && w.profile.settingsUpdatedAt < old.settingsUpdatedAt) {
        throw new CloudError("stale-profile", "older settingsUpdatedAt");
      }
      d.profile = profileToDoc(w.profile, 0);
    }
    for (const c of w.contribs) {
      const old = d.contribs.get(c.id);
      if (old && typeof old.rev === "number" && c.rev < old.rev) {
        throw new CloudError("permission-denied", "rev went backwards");
      }
      d.contribs.set(c.id, contribToDoc(c));
    }
    for (const a of w.attempts) d.attempts.set(a.id, attemptToDoc(a));
  }

  async pull(uid: string): Promise<CloudSnapshot> {
    await Promise.resolve();
    this.gate("pull");
    const snap = this.snapshot(uid);
    const attempts: Attempt[] = [...snap.attempts].sort((x, y) => y.at - x.at);
    return { ...snap, attempts: attempts.slice(0, MAX_ATTEMPTS) };
  }

  async push(uid: string, write: CloudWrite): Promise<void> {
    await this.beforePush?.();
    this.gate("push");
    this.apply(uid, write);
    this.writes.push(structuredClone(write));
  }

  async deleteAll(uid: string): Promise<void> {
    await Promise.resolve();
    this.gate("deleteAll");
    this.users.delete(uid);
  }

  /** Test inspection: the decoded cloud state of one account (no failures, no counters). */
  snapshot(uid: string): CloudSnapshot {
    const d = this.docs(uid);
    return {
      profile: d.profile ? docToProfile(d.profile) : null,
      contribs: [...d.contribs].flatMap(([id, raw]) => docToContrib(id, raw) ?? []),
      attempts: [...d.attempts].flatMap(([id, raw]) => docToAttempt(id, raw) ?? []),
    };
  }

  hasUser(uid: string): boolean {
    return this.users.has(uid);
  }
}
