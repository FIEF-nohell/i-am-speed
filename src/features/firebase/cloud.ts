import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  writeBatch,
  type CollectionReference,
} from "firebase/firestore/lite";
import { MAX_ATTEMPTS, type Attempt } from "@/features/storage/schema";
import {
  attemptToDoc,
  contribToDoc,
  docToAttempt,
  docToContrib,
  docToProfile,
  profileToDoc,
} from "@/features/sync/serialize";
import {
  CloudError,
  type CloudAdapter,
  type CloudErrorCode,
  type CloudSnapshot,
  type CloudWrite,
  type Contribution,
} from "@/features/sync/types";
import type { FirebaseHandles } from "./client";

/** Firestore allows 500 operations per batch; stay below it. */
const BATCH_OPS = 450;
const DELETE_PAGE = 400;

function codeOf(e: unknown): string {
  if (typeof e === "object" && e !== null && "code" in e)
    return String((e as { code: unknown }).code);
  return "";
}

/** Maps SDK failures onto the few cases the sync engine reacts to. */
function toCloudError(e: unknown): CloudError {
  if (e instanceof CloudError) return e;
  const code = codeOf(e).replace(/^firestore\//, "");
  const message = e instanceof Error ? e.message : "cloud request failed";
  const offline =
    code === "unavailable" ||
    code === "failed-precondition" ||
    code === "deadline-exceeded" ||
    code === "resource-exhausted" ||
    (code === "" && e instanceof TypeError) ||
    (typeof navigator !== "undefined" && navigator.onLine === false);
  const mapped: CloudErrorCode =
    code === "permission-denied" || code === "unauthenticated"
      ? "permission-denied"
      : offline
        ? "offline"
        : "unknown";
  return new CloudError(mapped, message);
}

async function guarded<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    throw toCloudError(e);
  }
}

interface Op {
  path: [string, ...string[]];
  data: Record<string, unknown>;
}

export function createFirestoreCloud({ db }: Pick<FirebaseHandles, "db">): CloudAdapter {
  const profileRef = (uid: string) => doc(db, "users", uid);
  const sub = (uid: string, name: "contribs" | "attempts"): CollectionReference =>
    collection(db, "users", uid, name);

  async function commitOps(ops: Op[]): Promise<void> {
    for (let i = 0; i < ops.length; i += BATCH_OPS) {
      const batch = writeBatch(db);
      for (const op of ops.slice(i, i + BATCH_OPS)) {
        batch.set(doc(db, ...op.path), op.data);
      }
      await batch.commit();
    }
  }

  async function deleteCollection(ref: CollectionReference): Promise<void> {
    for (;;) {
      const page = await getDocs(query(ref, limit(DELETE_PAGE)));
      if (page.empty) return;
      const batch = writeBatch(db);
      page.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  return {
    pull: (uid) =>
      guarded(async (): Promise<CloudSnapshot> => {
        const [profile, contribDocs, attemptDocs] = await Promise.all([
          getDoc(profileRef(uid)),
          getDocs(sub(uid, "contribs")),
          getDocs(query(sub(uid, "attempts"), orderBy("at", "desc"), limit(MAX_ATTEMPTS))),
        ]);
        const contribs: Contribution[] = contribDocs.docs.flatMap(
          (d) => docToContrib(d.id, d.data()) ?? [],
        );
        const attempts: Attempt[] = attemptDocs.docs.flatMap(
          (d) => docToAttempt(d.id, d.data()) ?? [],
        );
        return {
          profile: profile.exists() ? docToProfile(profile.data()) : null,
          contribs,
          attempts,
        };
      }),

    push: (uid, write: CloudWrite) =>
      guarded(async () => {
        if (write.profile) {
          // Written alone: a rules rejection (older settings) must not fail the rest.
          try {
            await setDoc(profileRef(uid), profileToDoc(write.profile, Date.now()));
          } catch (e) {
            const err = toCloudError(e);
            throw err.code === "permission-denied"
              ? new CloudError("stale-profile", err.message)
              : err;
          }
        }
        const ops: Op[] = [
          ...write.contribs.map((c): Op => ({
            path: ["users", uid, "contribs", c.id],
            data: contribToDoc(c),
          })),
          ...write.attempts.map((a): Op => ({
            path: ["users", uid, "attempts", a.id],
            data: attemptToDoc(a),
          })),
        ];
        await commitOps(ops);
      }),

    deleteAll: (uid) =>
      guarded(async () => {
        await deleteCollection(sub(uid, "attempts"));
        await deleteCollection(sub(uid, "contribs"));
        const batch = writeBatch(db);
        batch.delete(profileRef(uid));
        await batch.commit();
      }),
  };
}
