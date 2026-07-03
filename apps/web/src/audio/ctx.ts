let ctx: AudioContext | null = null;

/** Shared AudioContext, resumed on first user gesture. */
export function getAudioContext(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}
