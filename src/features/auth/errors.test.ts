import { describe, expect, it } from "vitest";
import { mapAuthError } from "./errors";

describe("mapAuthError", () => {
  it.each([
    ["auth/invalid-credential", "invalid-credentials"],
    ["auth/wrong-password", "invalid-credentials"],
    ["auth/user-not-found", "invalid-credentials"],
    ["auth/invalid-email", "invalid-email"],
    ["auth/email-already-in-use", "email-in-use"],
    ["auth/weak-password", "weak-password"],
    ["auth/popup-closed-by-user", "popup-closed"],
    ["auth/cancelled-popup-request", "popup-closed"],
    ["auth/popup-blocked", "popup-blocked"],
    ["auth/network-request-failed", "network"],
    ["auth/too-many-requests", "too-many-requests"],
    ["auth/requires-recent-login", "requires-recent-login"],
    ["auth/user-disabled", "user-disabled"],
  ])("maps %s to %s", (firebaseCode, code) => {
    expect(mapAuthError({ code: firebaseCode }).code).toBe(code);
  });

  it("falls back to unknown for anything else", () => {
    const inputs = [new Error("x"), null, undefined, "boom", { code: "auth/other" }, { code: 3 }];
    for (const e of inputs) expect(mapAuthError(e).code).toBe("unknown");
  });

  it("never shows raw codes to users", () => {
    for (const code of ["auth/invalid-credential", "auth/popup-blocked", "nope"]) {
      const { message } = mapAuthError({ code });
      expect(message).not.toMatch(/auth\//);
      expect(message.length).toBeGreaterThan(10);
    }
  });
});
