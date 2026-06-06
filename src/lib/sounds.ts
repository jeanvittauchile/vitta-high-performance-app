export type TimerSound = 'campana' | 'beep' | 'silbato' | 'silencio';

export const TIMER_SOUND_KEY = 'vitta_timer_sound';

export const SOUND_LABELS: Record<TimerSound, string> = {
  campana:  'Campana',
  beep:     'Beep',
  silbato:  'Silbato',
  silencio: 'Silencio',
};

export function getTimerSound(): TimerSound {
  if (typeof window === 'undefined') return 'campana';
  return (localStorage.getItem(TIMER_SOUND_KEY) as TimerSound) || 'campana';
}

export const BELL_VOLUME_KEY = 'vitta_bell_volume';

export function getBellVolume(): number {
  if (typeof window === 'undefined') return 0.7;
  const v = localStorage.getItem(BELL_VOLUME_KEY);
  return v !== null ? parseFloat(v) : 0.7;
}

// iOS Safari creates new AudioContexts in a 'suspended' state and only lets
// them run if resumed synchronously inside a user-gesture handler. We keep a
// single shared context and (re)resume it whenever we touch it, so the bell
// that fires later — when the rest timer elapses, with no gesture in sight —
// can still produce sound.
let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new AudioCtx();
  return sharedCtx;
}

// Call this from a tap/click handler (a real user gesture) before the rest
// timer is scheduled — it resumes the shared AudioContext and fires a silent
// blip, which is what unlocks audio output on iOS for any later playSound().
export function unlockAudio() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.01);
  } catch (_) {}
}

export function playSound(type: TimerSound) {
  if (type === 'silencio') return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const vol = getBellVolume();

    const schedule = () => {
      if (type === 'campana') {
        ([[880, 0.5, 3.5], [1320, 0.28, 2.8]] as const).forEach(([freq, base, dur]) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine'; osc.frequency.value = freq;
          gain.gain.setValueAtTime(base * vol, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
        });
      } else if (type === 'beep') {
        [0, 0.3, 0.6].forEach(offset => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine'; osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.35 * vol, ctx.currentTime + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.22);
          osc.start(ctx.currentTime + offset); osc.stop(ctx.currentTime + offset + 0.22);
        });
      } else if (type === 'silbato') {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.4 * vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
      }
    };

    if (ctx.state === 'suspended') {
      // Last-ditch resume in case the gesture-time unlock didn't stick.
      ctx.resume().then(schedule).catch(schedule);
    } else {
      schedule();
    }
  } catch (_) {}
}
