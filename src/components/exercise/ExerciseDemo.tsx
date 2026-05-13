'use client';
import { useState, useEffect, useRef } from 'react';
import { PlayIcon, PauseIcon, VideoIcon } from '@/components/icons';

interface Props {
  videoUrl?: string;
  gifUrl?: string;
  dark?: boolean;
}

export default function ExerciseDemo({ videoUrl, gifUrl, dark = true }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 100) { setPlaying(false); return 0; }
          return p + (100 / 48);
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing]);

  const elapsed = Math.round(progress * 0.48);
  const mm = String(Math.floor(elapsed / 60)).padStart(1, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  if (videoUrl) {
    return (
      <video
        src={videoUrl}
        controls
        autoPlay
        muted
        playsInline
        loop
        style={{ width: '100%', borderRadius: 12, display: 'block' }}
      />
    );
  }

  if (gifUrl) {
    return (
      <img
        src={gifUrl}
        alt="Demostración"
        style={{ width: '100%', borderRadius: 12, display: 'block', objectFit: 'cover', aspectRatio: '4/3' }}
      />
    );
  }

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', position: 'relative', aspectRatio: '16/10', background: 'linear-gradient(135deg, var(--vitta-navy-deep) 0%, #0a1530 100%)' }}>
      {/* Placeholder scene */}
      <svg viewBox="0 0 320 200" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1B2A57" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#0E1936" stopOpacity="0.8"/>
          </linearGradient>
        </defs>
        <rect x="0" y="140" width="320" height="60" fill="url(#floorGrad)"/>
        <line x1="0" y1="140" x2="320" y2="140" stroke="rgba(74,138,240,0.3)" strokeWidth="1"/>

        {/* Figure */}
        <g transform="translate(160, 100)">
          <circle cy="-42" r="10" fill="#4A8AF0" opacity="0.9"/>
          <rect x="-5" y="-30" width="10" height="28" rx="3" fill="#4A8AF0" opacity="0.8"/>
          <rect x="-20" y="-28" width="15" height="4" rx="2" fill="#4A8AF0" opacity="0.7"/>
          <rect x="5"   y="-28" width="15" height="4" rx="2" fill="#4A8AF0" opacity="0.7"/>
          <rect x="-7" y="-2"  width="6"  height="22" rx="2" fill="#2E6BD6" opacity="0.85"/>
          <rect x="1"  y="-2"  width="6"  height="22" rx="2" fill="#2E6BD6" opacity="0.85"/>
          <circle cx="-4" cy="22" r="4" fill="#1B2A57" opacity="0.7"/>
          <circle cx="4"  cy="22" r="4" fill="#1B2A57" opacity="0.7"/>
          {/* Barbell */}
          <rect x="-36" y="-32" width="72" height="4" rx="2" fill="var(--vitta-cream)" opacity="0.85"/>
          <rect x="-40" y="-38" width="6" height="16" rx="2" fill="var(--vitta-cream)" opacity="0.7"/>
          <rect x="34"  y="-38" width="6" height="16" rx="2" fill="var(--vitta-cream)" opacity="0.7"/>
        </g>

        <text x="160" y="185" fill="rgba(244,239,224,0.25)" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono, monospace">DEMO · VIDEO PLACEHOLDER</text>
      </svg>

      {/* LIVE badge */}
      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
        <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: 3, background: '#D7474B', display: 'inline-block' }}/>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'white', letterSpacing: '0.08em' }}>DEMO · 0:48</span>
      </div>

      {/* Timestamp */}
      <div className="mono" style={{ position: 'absolute', bottom: 16, right: 12, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
        {mm}:{ss} / 0:48
      </div>

      {/* Play button */}
      <button onClick={() => setPlaying(p => !p)} style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 72, height: 72, borderRadius: 36,
        background: 'rgba(244,239,224,0.92)',
        border: 'none', cursor: 'pointer',
        display: 'grid', placeItems: 'center',
        color: 'var(--vitta-navy-ink)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        transition: 'transform 0.15s, background 0.15s',
      }}>
        {playing ? <PauseIcon size={28}/> : <PlayIcon size={28}/>}
      </button>

      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.15)' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--vitta-blue-bright)', transition: 'width 1s linear' }}/>
      </div>

      {/* Caption */}
      <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '4px 8px 8px' }}>
        <VideoIcon size={11} stroke="rgba(255,255,255,0.4)"/>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>Video demostrativo HD · ejecución técnica</span>
      </div>
    </div>
  );
}
