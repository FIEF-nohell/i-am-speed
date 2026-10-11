import { describe, expect, it, vi } from "vitest";
import { createRng } from "./rng";
import { MAX_VOICES, SoundPlayer, type PlayerDeps } from "./player";
import { previewPhrase } from "./preview";
import { GAIN_JITTER, MAX_GAIN, RATE_JITTER } from "./variation";

interface FakeSource {
  buffer: unknown;
  playbackRate: { value: number };
  gainNode: { gain: { value: number } } | null;
  onended: (() => void) | null;
  started: number;
  stopped: number;
  connect: (node: unknown) => unknown;
  start: () => void;
  stop: () => void;
}

function fakeContext(state: "running" | "suspended" = "running") {
  const sources: FakeSource[] = [];
  const gains: { gain: { value: number } }[] = [];
  const ctx = {
    state,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    suspend: vi.fn(() => Promise.resolve()),
    createDynamicsCompressor: () => ({
      threshold: { value: 0 },
      knee: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 },
      connect: () => undefined,
    }),
    createBuffer: (_c: number, length: number) => ({ length, copyToChannel: () => undefined }),
    createGain: () => {
      const g = { gain: { value: 1 }, connect: () => undefined };
      gains.push(g);
      return g;
    },
    createBufferSource: () => {
      const s: FakeSource = {
        buffer: null,
        playbackRate: { value: 1 },
        gainNode: null,
        onended: null,
        started: 0,
        stopped: 0,
        connect: () => undefined,
        start: () => {
          s.started++;
        },
        stop: () => {
          s.stopped++;
        },
      };
      sources.push(s);
      return s;
    },
  };
  return { ctx, sources, gains };
}

function setup(state: "running" | "suspended" = "running", random = createRng(42)) {
  const fake = fakeContext(state);
  let time = 0;
  const deps: PlayerDeps = {
    createContext: () => fake.ctx as unknown as AudioContext,
    now: () => time,
    random,
    schedule: (task) => task(),
  };
  const player = new SoundPlayer(deps);
  player.configure({ pack: "soft", volume: 60, errors: true });
  player.unlock();
  return { player, ...fake, advance: (ms: number) => (time += ms) };
}

describe("SoundPlayer", () => {
  it("starts one source per press", () => {
    const { player, sources, advance } = setup();
    for (let i = 0; i < 5; i++) {
      advance(200);
      player.play("key");
    }
    expect(sources).toHaveLength(5);
    expect(sources.every((s) => s.started === 1)).toBe(true);
  });

  it("is silent without an AudioContext and never throws", () => {
    const player = new SoundPlayer({
      createContext: () => null,
      now: () => 0,
      random: Math.random,
      schedule: (task) => task(),
    });
    expect(() => {
      player.configure({ pack: "bubble", volume: 80, errors: true });
      player.unlock();
      player.play("key");
      player.playOnce("soft", "error", 50);
    }).not.toThrow();
  });

  it("never throws when the context misbehaves", () => {
    const player = new SoundPlayer({
      createContext: () => {
        throw new Error("blocked");
      },
      now: () => 0,
      random: Math.random,
      schedule: (task) => task(),
    });
    expect(() => {
      player.unlock();
      player.play("space");
    }).not.toThrow();
  });

  it("creates no voices at volume 0", () => {
    const { player, sources } = setup();
    player.configure({ pack: "soft", volume: 0, errors: true });
    player.play("key");
    expect(sources).toHaveLength(0);
  });

  it("skips error sounds when soundErrors is false", () => {
    const { player, sources } = setup();
    player.configure({ pack: "soft", volume: 60, errors: false });
    player.play("error");
    expect(sources).toHaveLength(0);
    player.play("key");
    expect(sources).toHaveLength(1);
  });

  it("does not play while the context is suspended", () => {
    const { player, sources } = setup("suspended");
    player.play("key");
    expect(sources).toHaveLength(0);
  });

  it("caps voices by stopping the oldest", () => {
    const { player, sources, advance } = setup();
    for (let i = 0; i < MAX_VOICES + 4; i++) {
      advance(200);
      player.play("key");
    }
    expect(sources).toHaveLength(MAX_VOICES + 4);
    expect(sources.filter((s) => s.stopped > 0)).toHaveLength(4);
    expect(sources.slice(0, 4).every((s) => s.stopped === 1)).toBe(true);
  });

  it("frees a voice slot when a source ends", () => {
    const { player, sources, advance } = setup();
    for (let i = 0; i < MAX_VOICES; i++) {
      advance(200);
      player.play("key");
    }
    sources[0]!.onended?.();
    advance(200);
    player.play("key");
    expect(sources.every((s) => s.stopped === 0)).toBe(true);
  });

  it("keeps rate and gain inside the jitter bounds and softens bursts", () => {
    const { player, sources, gains, advance } = setup();
    for (let i = 0; i < 200; i++) {
      advance(500);
      player.play("key");
    }
    const maxGain = MAX_GAIN * 0.36;
    for (const s of sources)
      expect(Math.abs(s.playbackRate.value - 1)).toBeLessThanOrEqual(RATE_JITTER);
    for (const g of gains)
      expect(g.gain.value).toBeLessThanOrEqual(maxGain * (1 + GAIN_JITTER) + 1e-9);
    expect(Math.max(...gains.map((g) => g.gain.value))).toBeGreaterThan(maxGain);

    const burst = setup("running", () => 0.5);
    burst.advance(500);
    burst.player.play("key");
    burst.advance(20);
    burst.player.play("key");
    const [slow, fast] = burst.gains;
    expect(fast!.gain.value).toBeCloseTo(slow!.gain.value * 0.85);
  });

  it("previews any pack through playOnce", () => {
    const { player, sources } = setup();
    player.prepareNow("typewriter");
    player.playOnce("typewriter", "space", 100);
    expect(sources).toHaveLength(1);
  });

  it("suspends and resumes with visibility", () => {
    const { player, ctx } = setup();
    player.setHidden(true);
    expect(ctx.suspend).toHaveBeenCalled();
    player.setHidden(false);
    expect(ctx.resume).toHaveBeenCalled();
  });
});

describe("previewPhrase", () => {
  it("is five keys then a space, plus an error on request, in time order", () => {
    const base = previewPhrase();
    expect(base.map((s) => s.kind)).toEqual(["key", "key", "key", "key", "key", "space"]);
    const withError = previewPhrase(true);
    expect(withError.at(-1)?.kind).toBe("error");
    for (let i = 1; i < withError.length; i++) {
      expect(withError[i]!.at).toBeGreaterThan(withError[i - 1]!.at);
    }
  });
});
