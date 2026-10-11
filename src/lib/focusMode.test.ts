import { afterEach, describe, expect, it, vi } from "vitest";
import { setFocusMode } from "./focusMode";

afterEach(() => vi.unstubAllGlobals());

describe("setFocusMode", () => {
  it("does nothing on the server", () => {
    expect(typeof document).toBe("undefined");
    expect(() => setFocusMode("zen")).not.toThrow();
  });
  it("sets and removes data-focus on the root element", () => {
    const dataset: Record<string, string> = {};
    vi.stubGlobal("document", { documentElement: { dataset } });
    setFocusMode("zen");
    expect(dataset.focus).toBe("zen");
    setFocusMode(null);
    expect("focus" in dataset).toBe(false);
  });
});
