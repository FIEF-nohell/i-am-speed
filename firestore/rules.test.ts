import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";

const profile = (settingsUpdatedAt = 10) => ({
  schema: 2,
  settings: { theme: "dark" },
  settingsUpdatedAt,
  updatedAt: 1000,
});

const contrib = (id: string, rev = 1) => ({
  id,
  rev,
  updatedAt: 1000,
  keys: { k61: { hits: 3, misses: 0 } },
  fingers: { leftPinky: { hits: 3, misses: 0 } },
  days: { "2026-10-11": { attempts: 1 } },
  lessons: { "home-row-01": { completed: true } },
  totals: { attempts: 1, timeMs: 1000, chars: 10 },
});

const attempt = (id: string) => ({
  id,
  at: 1000,
  source: "lesson:home-row-01",
  lang: "de",
  netWpm: 30,
  rawWpm: 32,
  accuracy: 97,
  consistency: 80,
  errors: 1,
  durationMs: 20000,
  chars: 50,
  passed: true,
});

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-i-am-speed",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

const alice = () => env.authenticatedContext("alice").firestore();
const bob = () => env.authenticatedContext("bob").firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe("owner access", () => {
  it("reads and writes the profile", async () => {
    await assertSucceeds(setDoc(doc(alice(), "users/alice"), profile()));
    await assertSucceeds(getDoc(doc(alice(), "users/alice")));
  });

  it("reads and writes contribs", async () => {
    const ref = doc(alice(), "users/alice/contribs/abcdefgh12345678");
    await assertSucceeds(setDoc(ref, contrib("abcdefgh12345678")));
    await assertSucceeds(getDoc(ref));
  });

  it("reads and writes attempts, including idempotent re-sets", async () => {
    const ref = doc(alice(), "users/alice/attempts/dev1-1");
    await assertSucceeds(setDoc(ref, attempt("dev1-1")));
    await assertSucceeds(setDoc(ref, attempt("dev1-1")));
    await assertSucceeds(getDoc(ref));
  });

  it("deletes all three document types", async () => {
    await assertSucceeds(setDoc(doc(alice(), "users/alice"), profile()));
    await assertSucceeds(
      setDoc(doc(alice(), "users/alice/contribs/abcdefgh"), contrib("abcdefgh")),
    );
    await assertSucceeds(setDoc(doc(alice(), "users/alice/attempts/a-1"), attempt("a-1")));
    await assertSucceeds(deleteDoc(doc(alice(), "users/alice/attempts/a-1")));
    await assertSucceeds(deleteDoc(doc(alice(), "users/alice/contribs/abcdefgh")));
    await assertSucceeds(deleteDoc(doc(alice(), "users/alice")));
  });
});

describe("access control", () => {
  it("denies another user and unauthenticated reads and writes", async () => {
    await assertSucceeds(setDoc(doc(alice(), "users/alice"), profile()));
    await assertFails(getDoc(doc(bob(), "users/alice")));
    await assertFails(setDoc(doc(bob(), "users/alice"), profile()));
    await assertFails(deleteDoc(doc(bob(), "users/alice")));
    await assertFails(getDoc(doc(anon(), "users/alice")));
    await assertFails(setDoc(doc(anon(), "users/alice"), profile()));
    await assertFails(setDoc(doc(bob(), "users/alice/attempts/x-1"), attempt("x-1")));
  });

  it("denies unknown subcollections and top-level collections", async () => {
    await assertFails(setDoc(doc(alice(), "users/alice/other/x"), { a: 1 }));
    await assertFails(setDoc(doc(alice(), "misc/x"), { a: 1 }));
  });
});

describe("shape validation", () => {
  it("rejects attempts with extra fields, wrong lang, id mismatch or long source", async () => {
    const at = (id: string) => doc(alice(), `users/alice/attempts/${id}`);
    await assertFails(setDoc(at("a-1"), { ...attempt("a-1"), extra: 1 }));
    await assertFails(setDoc(at("a-2"), { ...attempt("a-2"), lang: "fr" }));
    await assertFails(setDoc(at("a-3"), attempt("other")));
    await assertFails(setDoc(at("a-4"), { ...attempt("a-4"), source: "x".repeat(65) }));
    await assertFails(setDoc(at("a-5"), { ...attempt("a-5"), accuracy: 101 }));
    await assertFails(setDoc(at("a-6"), { ...attempt("a-6"), netWpm: -1 }));
    await assertFails(setDoc(at("a-7"), { ...attempt("a-7"), passed: "yes" }));
  });

  it("rejects bad profiles and contribs", async () => {
    await assertFails(setDoc(doc(alice(), "users/alice"), { ...profile(), schema: 1 }));
    await assertFails(setDoc(doc(alice(), "users/alice"), { ...profile(), extra: true }));
    const c = doc(alice(), "users/alice/contribs/abcdefgh");
    await assertFails(setDoc(c, contrib("mismatch")));
    await assertFails(setDoc(c, { ...contrib("abcdefgh"), rev: -1 }));
    await assertFails(setDoc(c, { ...contrib("abcdefgh"), fingers: { pinkyToe: {} } }));
    await assertFails(setDoc(c, { ...contrib("abcdefgh"), totals: { attempts: 1 } }));
  });
});

describe("monotonic updates", () => {
  it("rejects a contrib with a lower rev and accepts equal or higher", async () => {
    const ref = doc(alice(), "users/alice/contribs/abcdefgh");
    await assertSucceeds(setDoc(ref, contrib("abcdefgh", 5)));
    await assertFails(setDoc(ref, contrib("abcdefgh", 4)));
    await assertSucceeds(setDoc(ref, contrib("abcdefgh", 5)));
    await assertSucceeds(setDoc(ref, contrib("abcdefgh", 6)));
  });

  it("rejects a profile with an older settingsUpdatedAt", async () => {
    const ref = doc(alice(), "users/alice");
    await assertSucceeds(setDoc(ref, profile(50)));
    await assertFails(setDoc(ref, profile(49)));
    await assertSucceeds(setDoc(ref, profile(50)));
    await assertSucceeds(setDoc(ref, profile(51)));
  });
});
