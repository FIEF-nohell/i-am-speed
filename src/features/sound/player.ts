import type { SoundPack } from "@/features/settings/settings";
import { KEY_SOUND_KINDS } from "./packs";
import { renderVariants } from "./render";
import { SAMPLE_RATE } from "./synth";
import type { KeySoundKind } from "./types";
import { burstFactor, gainJitter, pickVariant, rateJitter, volumeToGain } from "./variation";

export const MAX_VOICES = 16;

export interface PlayerDeps {
  /** Creates the audio context, or null when audio is unavailable. */
  createContext: () => AudioContext | null;
  now: () => number;
  random: () => number;
  /** Runs low-priority work off the key path (idle callback with a timeout fallback). */
  schedule: (task: () => void) => void;
}

export interface PlayerSettings {
  pack: SoundPack;
  /** 0 to 100. */
  volume: number;
  /** Whether error sounds play. */
  errors: boolean;
}

type Bank = Partial<Record<KeySoundKind, Float32Array[]>>;
type BufferBank = Partial<Record<KeySoundKind, AudioBuffer[]>>;

/**
 * Plays pre-rendered synthesised key sounds. Rendering happens off the key path; the key path
 * itself only picks a buffer and starts one source through one gain node. Never throws.
 */
export class SoundPlayer {
  private ctx: AudioContext | null = null;
  private bus: AudioNode | null = null;
  private samples: Partial<Record<SoundPack, Bank>> = {};
  private buffers: Partial<Record<SoundPack, BufferBank>> = {};
  private voices: AudioBufferSourceNode[] = [];
  private lastVariant: Partial<Record<KeySoundKind, number>> = {};
  private lastPress = Number.NEGATIVE_INFINITY;
  private settings: PlayerSettings = { pack: "soft", volume: 60, errors: true };

  constructor(private readonly deps: PlayerDeps) {}

  /** Applies settings and renders that pack's variants in idle time. */
  configure(settings: PlayerSettings): void {
    this.settings = settings;
    for (const kind of KEY_SOUND_KINDS) {
      this.deps.schedule(() => this.warm(settings.pack, kind));
    }
  }

  /** Creates and resumes the context. Must run inside a user gesture the first time. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const ctx = this.deps.createContext();
        if (!ctx) return;
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -14;
        compressor.knee.value = 12;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.002;
        compressor.release.value = 0.08;
        compressor.connect(ctx.destination);
        this.bus = compressor;
        this.ctx = ctx;
        this.buffers = {};
      }
      for (const kind of KEY_SOUND_KINDS) {
        this.deps.schedule(() => this.warm(this.settings.pack, kind));
      }
      if (this.ctx.state !== "running") void this.ctx.resume().catch(() => undefined);
    } catch {
      /* audio is a nicety, never an error */
    }
  }

  /** Suspends or resumes the context with tab visibility. */
  setHidden(hidden: boolean): void {
    try {
      if (!this.ctx) return;
      if (hidden) void this.ctx.suspend().catch(() => undefined);
      else void this.ctx.resume().catch(() => undefined);
    } catch {
      /* ignore */
    }
  }

  /** Plays a key press sound for the configured pack. Cheap and safe to call per keystroke. */
  play(kind: KeySoundKind): void {
    const { pack, volume, errors } = this.settings;
    if (kind === "error" && !errors) return;
    const now = this.deps.now();
    const gap = now - this.lastPress;
    this.lastPress = now;
    this.trigger(pack, kind, volume, burstFactor(gap));
  }

  /** Plays one sound of any pack at any volume, regardless of the configured settings. */
  playOnce(pack: SoundPack, kind: KeySoundKind, volume: number): void {
    this.trigger(pack, kind, volume, 1);
  }

  /** Renders a pack's variants for every kind right now (used by previews). */
  prepareNow(pack: SoundPack): void {
    for (const kind of KEY_SOUND_KINDS) this.prepare(pack, kind);
  }

  /** Renders samples and, once the context exists, wraps them into AudioBuffers. */
  private warm(pack: SoundPack, kind: KeySoundKind): void {
    try {
      if (this.ctx) this.audioBuffers(pack, kind, this.ctx);
      else this.prepare(pack, kind);
    } catch {
      /* ignore */
    }
  }

  private prepare(pack: SoundPack, kind: KeySoundKind): Float32Array[] {
    const bank = (this.samples[pack] ??= {});
    return (bank[kind] ??= renderVariants(pack, kind));
  }

  private audioBuffers(pack: SoundPack, kind: KeySoundKind, ctx: AudioContext): AudioBuffer[] {
    const bank = (this.buffers[pack] ??= {});
    const cached = bank[kind];
    if (cached) return cached;
    const wrapped = this.prepare(pack, kind).map((data) => {
      const buffer = ctx.createBuffer(1, data.length, SAMPLE_RATE);
      buffer.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
      return buffer;
    });
    bank[kind] = wrapped;
    return wrapped;
  }

  private trigger(pack: SoundPack, kind: KeySoundKind, volume: number, burst: number): void {
    try {
      const ctx = this.ctx;
      const bus = this.bus;
      if (!ctx || !bus || ctx.state !== "running") return;
      const base = volumeToGain(volume);
      if (base <= 0) return;
      const variants = this.audioBuffers(pack, kind, ctx);
      const index = pickVariant(variants.length, this.lastVariant[kind] ?? -1, this.deps.random);
      this.lastVariant[kind] = index;
      const buffer = variants[index];
      if (!buffer) return;

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.playbackRate.value = rateJitter(this.deps.random);
      gain.gain.value = base * gainJitter(this.deps.random) * burst;
      source.connect(gain);
      gain.connect(bus);
      source.onended = () => this.release(source);
      if (this.voices.length >= MAX_VOICES) this.stopOldest();
      this.voices.push(source);
      source.start();
    } catch {
      /* audio is a nicety, never an error */
    }
  }

  private release(source: AudioBufferSourceNode): void {
    const i = this.voices.indexOf(source);
    if (i >= 0) this.voices.splice(i, 1);
  }

  private stopOldest(): void {
    const oldest = this.voices.shift();
    try {
      oldest?.stop();
    } catch {
      /* already stopped */
    }
  }
}
