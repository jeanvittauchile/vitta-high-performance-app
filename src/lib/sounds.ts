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

export function playSound(type: TimerSound) {
  if (type === 'silencio') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'campana') {
      [[880, 0.5, 1.6], [1320, 0.28, 1.0]].forEach(([freq, vol, dur]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
      });
    } else if (type === 'beep') {
      // triple beep ~0.9s total
      [0, 0.3, 0.6].forEach(offset => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.35, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.22);
        osc.start(ctx.currentTime + offset); osc.stop(ctx.currentTime + offset + 0.22);
      });
    } else if (type === 'silbato') {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
    }
  } catch (_) {}
}
