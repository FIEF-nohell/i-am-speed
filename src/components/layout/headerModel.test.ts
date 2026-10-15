import { describe, expect, it } from "vitest";
import { currentNav, initialFor, isPath, menuKeyAction, normalisePath } from "./headerModel";

describe("normalisePath", () => {
  it("strips one trailing slash except for the root", () => {
    expect(normalisePath("/")).toBe("/");
    expect(normalisePath("/stats/")).toBe("/stats");
    expect(normalisePath("/stats")).toBe("/stats");
  });
});

describe("isPath", () => {
  it("matches on segment boundaries", () => {
    expect(isPath("/login/", "/login")).toBe(true);
    expect(isPath("/loginx/", "/login")).toBe(false);
    expect(isPath("/account/security", "/account")).toBe(true);
  });
});

describe("currentNav", () => {
  it("maps exact tabs with and without trailing slash", () => {
    expect(currentNav("/")).toEqual({ href: "/", current: "page" });
    expect(currentNav("/test/")).toEqual({ href: "/test/", current: "page" });
    expect(currentNav("/test")).toEqual({ href: "/test/", current: "page" });
    expect(currentNav("/zen/")?.href).toBe("/zen/");
    expect(currentNav("/rain/")?.href).toBe("/rain/");
    expect(currentNav("/stats/")?.href).toBe("/stats/");
    expect(currentNav("/settings/")?.href).toBe("/settings/");
  });
  it("maps lessons as a section", () => {
    expect(currentNav("/lesson/home-01/")).toEqual({ href: "/", current: "true" });
    expect(currentNav("/lesson/home-01")).toEqual({ href: "/", current: "true" });
  });
  it("is null on pages without a tab", () => {
    for (const p of [
      "/results/",
      "/about/",
      "/account/",
      "/login/",
      "/signup/",
      "/forgot-password/",
      "/statsx/",
    ]) {
      expect(currentNav(p)).toBeNull();
    }
  });
});

describe("initialFor", () => {
  it("prefers the name, then the email, lowercased", () => {
    expect(initialFor({ displayName: "Noel", email: "x@y.z" })).toBe("n");
    expect(initialFor({ displayName: null, email: "Zed@y.z" })).toBe("z");
    expect(initialFor({ displayName: "  ", email: "a@b.c" })).toBe("a");
    expect(initialFor({ displayName: null, email: null })).toBeNull();
    expect(initialFor({ displayName: " ", email: " " })).toBeNull();
  });
});

describe("menuKeyAction", () => {
  const none = { ctrl: false, alt: false, meta: false };
  it("handles Escape", () => {
    expect(menuKeyAction("Escape", none, true)).toBe("close-and-focus");
    expect(menuKeyAction("Escape", none, false)).toBe("pass");
  });
  it("stops Tab, Enter and Space", () => {
    for (const k of ["Tab", "Enter", " "]) {
      expect(menuKeyAction(k, none, true)).toBe("stop");
      expect(menuKeyAction(k, none, false)).toBe("stop");
    }
  });
  it("moves with arrows only while open", () => {
    expect(menuKeyAction("ArrowDown", none, true)).toBe("move");
    expect(menuKeyAction("Home", none, true)).toBe("move");
    expect(menuKeyAction("ArrowUp", none, false)).toBe("pass");
  });
  it("closes on printable keys while open and lets them through", () => {
    expect(menuKeyAction("a", none, true)).toBe("close-and-pass");
    expect(menuKeyAction("a", none, false)).toBe("pass");
    expect(menuKeyAction("a", { ...none, ctrl: true }, true)).toBe("pass");
  });
});
