import { describe, expect, it } from "vitest";
import {
  confirmProblem,
  emailProblem,
  isValidEmail,
  passwordProblem,
  passwordRules,
  validateLogin,
  validatePasswordChange,
  validateSignup,
} from "./validation";

describe("email", () => {
  it("accepts plain addresses and trims", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("  a.b+c@mail.example.org ")).toBe(true);
  });
  it("rejects malformed addresses", () => {
    for (const e of ["", "a", "a@b", "a@b.", "@b.co", "a b@c.de", "a@@b.co"]) {
      expect(isValidEmail(e)).toBe(false);
    }
    expect(emailProblem("")).toMatch(/enter/i);
    expect(emailProblem("nope")).toMatch(/valid/i);
    expect(emailProblem("a@b.co")).toBeNull();
  });
});

describe("password rules", () => {
  it("tracks length", () => {
    expect(passwordRules("short").find((r) => r.id === "length")?.met).toBe(false);
    expect(passwordRules("longenough").find((r) => r.id === "length")?.met).toBe(true);
  });
  it("flags a password equal to the email, ignoring case", () => {
    const rules = passwordRules("A@B.CO1234", "a@b.co1234");
    expect(rules.find((r) => r.id === "not-email")?.met).toBe(false);
  });
  it("describes the first problem", () => {
    expect(passwordProblem("")).toMatch(/enter/i);
    expect(passwordProblem("abc")).toMatch(/at least 8/);
    expect(passwordProblem("a@b.co1234", "a@b.co1234")).toMatch(/different/);
    expect(passwordProblem("long enough pass")).toBeNull();
  });
});

describe("confirm", () => {
  it("detects mismatch and empties", () => {
    expect(confirmProblem("abcdefgh", "")).toMatch(/repeat/i);
    expect(confirmProblem("abcdefgh", "abcdefgx")).toMatch(/do not match/);
    expect(confirmProblem("abcdefgh", "abcdefgh")).toBeNull();
  });
});

describe("form validation", () => {
  it("signup collects every field error", () => {
    expect(validateSignup({ email: "x", password: "abc", confirm: "abd" })).toEqual({
      email: expect.any(String),
      password: expect.any(String),
      confirm: expect.any(String),
    });
    expect(validateSignup({ email: "a@b.co", password: "abcdefgh", confirm: "abcdefgh" })).toEqual(
      {},
    );
  });
  it("login only requires a password to be present", () => {
    expect(validateLogin({ email: "a@b.co", password: "x" })).toEqual({});
    expect(validateLogin({ email: "", password: "" })).toEqual({
      email: expect.any(String),
      password: expect.any(String),
    });
  });
  it("password change rejects reuse and mismatch", () => {
    const base = { current: "oldpassword", next: "newpassword", confirm: "newpassword" };
    expect(validatePasswordChange(base)).toEqual({});
    const reuse = { ...base, next: "oldpassword", confirm: "oldpassword" };
    expect(validatePasswordChange(reuse).next).toBeDefined();
    expect(validatePasswordChange({ ...base, confirm: "other" }).confirm).toBeDefined();
    expect(validatePasswordChange({ ...base, current: "" }).current).toBeDefined();
  });
});
