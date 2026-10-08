/** Optional soft key tick. Created lazily on first use; silent if audio is unavailable. */
let ctx: AudioContext | null = null;

export function playTick(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    osc.frequency.value = 900;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  } catch {
    /* audio is a nicety, never an error */
  }
}
