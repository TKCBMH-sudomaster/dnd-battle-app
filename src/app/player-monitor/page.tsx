'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Combatant {
  id: number;
  name: string;
  turn_order: number;
  is_active: boolean;
  hp_current: number;
  hp_max: number;
  image_url?: string;
  status_condition?: string | null;
}

const CONDITION_THEME: Record<string, { text: string; glow: string; flash: string; particle: string }> = {
  concentrating: { text: 'text-cyan-300', glow: 'rgba(34,211,238,0.9)', flash: 'rgba(34,211,238,0.25)', particle: '#22d3ee' },
  blessed: { text: 'text-amber-300', glow: 'rgba(251,191,36,0.9)', flash: 'rgba(251,191,36,0.25)', particle: '#fbbf24' },

  poisoned: { text: 'text-emerald-400', glow: 'rgba(16,185,129,0.9)', flash: 'rgba(16,185,129,0.25)', particle: '#10b981' },
  charmed: { text: 'text-pink-400', glow: 'rgba(244,114,182,0.9)', flash: 'rgba(244,114,182,0.25)', particle: '#f472b6' },
  confused: { text: 'text-indigo-400', glow: 'rgba(129,140,248,0.9)', flash: 'rgba(129,140,248,0.25)', particle: '#818cf8' },
  possessed: { text: 'text-violet-400', glow: 'rgba(167,139,250,0.9)', flash: 'rgba(167,139,250,0.25)', particle: '#a78bfa' },

  burning: { text: 'text-orange-400', glow: 'rgba(249,115,22,0.9)', flash: 'rgba(249,115,22,0.3)', particle: '#f97316' },
  shocked: { text: 'text-yellow-300', glow: 'rgba(253,224,71,0.9)', flash: 'rgba(253,224,71,0.3)', particle: '#fde047' },
  frightened: { text: 'text-fuchsia-400', glow: 'rgba(232,121,249,0.9)', flash: 'rgba(232,121,249,0.3)', particle: '#e879f9' },

  stunned: { text: 'text-sky-300', glow: 'rgba(56,189,248,0.9)', flash: 'rgba(56,189,248,0.25)', particle: '#38bdf8' },
  paralyzed: { text: 'text-sky-400', glow: 'rgba(56,189,248,0.9)', flash: 'rgba(56,189,248,0.25)', particle: '#38bdf8' },
  petrified: { text: 'text-stone-300', glow: 'rgba(214,211,209,0.7)', flash: 'rgba(214,211,209,0.18)', particle: '#d6d3d1' },
  incapacitated: { text: 'text-red-400', glow: 'rgba(248,113,113,0.9)', flash: 'rgba(248,113,113,0.25)', particle: '#f87171' },
  unconscious: { text: 'text-rose-400', glow: 'rgba(251,113,133,0.9)', flash: 'rgba(251,113,133,0.25)', particle: '#fb7185' },
  blinded: { text: 'text-zinc-300', glow: 'rgba(212,212,216,0.7)', flash: 'rgba(212,212,216,0.18)', particle: '#d4d4d8' },
  deafened: { text: 'text-slate-300', glow: 'rgba(203,213,225,0.7)', flash: 'rgba(203,213,225,0.18)', particle: '#cbd5e1' },
  frozen: { text: 'text-blue-300', glow: 'rgba(147,197,253,0.9)', flash: 'rgba(147,197,253,0.25)', particle: '#93c5fd' },
  exhaustion: { text: 'text-yellow-500', glow: 'rgba(234,179,8,0.8)', flash: 'rgba(234,179,8,0.2)', particle: '#eab308' },
  restrained: { text: 'text-purple-300', glow: 'rgba(216,180,254,0.9)', flash: 'rgba(216,180,254,0.25)', particle: '#d8b4fe' },
  grappled: { text: 'text-teal-300', glow: 'rgba(94,234,212,0.9)', flash: 'rgba(94,234,212,0.25)', particle: '#5eead4' },
  prone: { text: 'text-stone-300', glow: 'rgba(214,211,209,0.7)', flash: 'rgba(214,211,209,0.18)', particle: '#d6d3d1' },
};

const CONDITION_GROUP: Record<string, 'buff' | 'toxic' | 'violent' | 'locked'> = {
  concentrating: 'buff',
  blessed: 'buff',

  poisoned: 'toxic',
  charmed: 'toxic',
  confused: 'toxic',
  possessed: 'toxic',

  burning: 'violent',
  shocked: 'violent',
  frightened: 'violent',

  stunned: 'locked',
  paralyzed: 'locked',
  petrified: 'locked',
  incapacitated: 'locked',
  unconscious: 'locked',
  blinded: 'locked',
  deafened: 'locked',
  frozen: 'locked',
  exhaustion: 'locked',
  restrained: 'locked',
  grappled: 'locked',
  prone: 'locked',
};

const GROUP_STYLE: Record<'buff' | 'toxic' | 'violent' | 'locked', { animClass: string; borderGlow: string }> = {
  buff: { animClass: 'animate-blessed-float', borderGlow: 'border-amber-400/95 shadow-[0_0_80px_rgba(251,191,36,0.65)]' },
  toxic: { animClass: 'animate-poison-pulse', borderGlow: 'border-emerald-500/90 shadow-[0_0_70px_rgba(16,185,129,0.65)]' },
  violent: { animClass: 'animate-burning-shake', borderGlow: 'border-orange-500/90 shadow-[0_0_70px_rgba(249,115,22,0.7)]' },
  locked: { animClass: 'animate-stunned-static contrast-150', borderGlow: 'border-sky-400/80 shadow-[0_0_65px_rgba(56,189,248,0.6)]' },
};

const CONDITION_STYLE_OVERRIDE: Partial<Record<string, { animClass: string; borderGlow: string }>> = {
  frightened: { animClass: 'animate-frightened-tremble', borderGlow: 'border-fuchsia-400/85 shadow-[0_0_65px_rgba(232,121,249,0.6)]' },
};

const CONDITION_VIDEO_MAP: Record<string, string> = {
  blessed: 'blessed.mp4',
  burning: 'fire.mp4',
  poisoned: 'poisoned.mp4',
  charmed: 'charmed.mp4',
  confused: 'confused.mp4',
  possessed: 'possessed.mp4',
  shocked: 'shocked.mp4',
  stunned: 'stunned.mp4',
};

const AMBIENT_PARTICLES = Array.from({ length: 14 }).map((_, i) => ({
  left: (i * 7.3) % 100,
  delay: (i * 0.37) % 3,
  duration: 2.8 + (i % 5) * 0.4,
}));

export default function PlayerMonitor() {
  const [queue, setQueue] = useState<Combatant[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusBanner, setStatusBanner] = useState<{ name: string; label: string; key: number } | null>(null);
  const [healPulse, setHealPulse] = useState<{ key: number } | null>(null);

  const prevStatusRef = useRef<Record<number, string | null>>({});
  const prevHpRef = useRef<Record<number, number>>({});
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const healTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bloodVideoRef = useRef<HTMLVideoElement | null>(null);
  const statusVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const fetchLiveQueue = async () => {
      const { data } = await supabase
        .schema('dnd')
        .from('encounter_queue')
        .select('*')
        .order('initiative', { ascending: false });

      const newQueue = data || [];

      for (const combatant of newQueue) {
        const prevStatus = prevStatusRef.current[combatant.id] ?? null;
        const currentStatus = combatant.status_condition ?? null;

        if (currentStatus && currentStatus !== prevStatus) {
          if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
          setStatusBanner({ name: combatant.name, label: currentStatus, key: Date.now() });
          bannerTimeoutRef.current = setTimeout(() => setStatusBanner(null), 2800);
          break;
        }
      }

      const activeCombatant = newQueue.find(c => c.is_active);
      if (activeCombatant) {
        const prevHp = prevHpRef.current[activeCombatant.id];
        if (prevHp !== undefined && activeCombatant.hp_current > prevHp) {
          if (healTimeoutRef.current) clearTimeout(healTimeoutRef.current);
          setHealPulse({ key: Date.now() });
          healTimeoutRef.current = setTimeout(() => setHealPulse(null), 1700);
        }
      }

      const nextStatusMap: Record<number, string | null> = {};
      const nextHpMap: Record<number, number> = {};
      newQueue.forEach(c => {
        nextStatusMap[c.id] = c.status_condition ?? null;
        nextHpMap[c.id] = c.hp_current;
      });
      prevStatusRef.current = nextStatusMap;
      prevHpRef.current = nextHpMap;

      setQueue(newQueue);
      setLoading(false);
    };

    fetchLiveQueue();

    const channel = supabase
      .channel('live_combat_changes')
      .on('postgres_changes', { event: '*', schema: 'dnd', table: 'encounter_queue' }, () => {
        fetchLiveQueue();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
      if (healTimeoutRef.current) clearTimeout(healTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const vid = bloodVideoRef.current;
    if (!vid) return;
    vid.muted = true;
    vid.defaultMuted = true;
    const playPromise = vid.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Blood overlay video failed to autoplay:', err);
      });
    }
  }, []);

  const activeIndex = queue.findIndex(c => c.is_active);
  const currentTurn = activeIndex !== -1 ? queue[activeIndex] : null;
  const activeStatusKey = currentTurn?.status_condition?.toLowerCase() || null;
  const activeStatusVideoFile = activeStatusKey ? CONDITION_VIDEO_MAP[activeStatusKey] : null;

  useEffect(() => {
    const vid = statusVideoRef.current;
    if (!vid || !activeStatusVideoFile) return;
    vid.muted = true;
    vid.defaultMuted = true;
    vid.currentTime = 0;
    const playPromise = vid.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn(`Status overlay video failed to autoplay (${activeStatusVideoFile}):`, err);
      });
    }
  }, [activeStatusVideoFile]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-stone-950 text-stone-500 font-mono text-xs flex items-center justify-center overflow-hidden">
        SYNCHRONIZING COMBAT MATRIX...
      </div>
    );
  }

  const upcomingTimeline = (() => {
    if (queue.length <= 1 || activeIndex === -1) return [];
    const upcoming: Combatant[] = [];
    for (let i = 1; i < queue.length; i++) {
      const nextIndex = (activeIndex + i) % queue.length;
      upcoming.push(queue[nextIndex]);
    }
    return upcoming;
  })();

  const getHealthEffects = (current: number, max: number) => {
    if (current <= 0) {
      return {
        splatterOpacity: 0.95,
        showDefeated: true,
        showCrack: true,
        heartbeat: false,
      };
    }

    const pct = max > 0 ? current / max : 1;

    if (pct <= 0.25) {
      return {
        splatterOpacity: 0.85,
        showDefeated: false,
        showCrack: false,
        heartbeat: true,
      };
    }
    if (pct <= 0.5) {
      return {
        splatterOpacity: 0.55,
        showDefeated: false,
        showCrack: false,
        heartbeat: false,
      };
    }
    if (pct <= 0.75) {
      return {
        splatterOpacity: 0.28,
        showDefeated: false,
        showCrack: false,
        heartbeat: false,
      };
    }

    return {
      splatterOpacity: 0,
      showDefeated: false,
      showCrack: false,
      heartbeat: false,
    };
  };

  const getStatusStyle = (condition: string | null | undefined, hasVideo: boolean) => {
    if (!condition) return { animClass: '', borderGlow: 'border-stone-800', theme: null as null | typeof CONDITION_THEME[string] };
    const key = condition.toLowerCase();
    const theme = CONDITION_THEME[key] || null;

    const override = CONDITION_STYLE_OVERRIDE[key];
    if (override) return { animClass: override.animClass, borderGlow: override.borderGlow, theme };

    const group = CONDITION_GROUP[key];
    const groupStyle = group ? GROUP_STYLE[group] : { animClass: '', borderGlow: 'border-stone-800' };

    if (hasVideo) {
      return { animClass: '', borderGlow: groupStyle.borderGlow, theme };
    }

    return { animClass: groupStyle.animClass, borderGlow: groupStyle.borderGlow, theme };
  };

  return (
    <main className="h-screen w-screen max-h-screen bg-stone-950 p-6 md:p-8 overflow-hidden select-none text-stone-100 relative">
      <style jsx global>{`
        @keyframes poisonPulse {
          0%, 100% { transform: scale(1); filter: hue-rotate(0deg) saturate(1); }
          50% { transform: scale(1.015) rotate(0.3deg); filter: hue-rotate(15deg) saturate(1.4); }
        }
        @keyframes burningShake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(-4px, 2px) rotate(-0.8deg); }
          40% { transform: translate(3px, -3px) rotate(0.8deg); }
          60% { transform: translate(-2px, -4px) rotate(0deg); }
          80% { transform: translate(4px, 2px) rotate(0.8deg); }
        }
        @keyframes frightenedTremble {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-1.5px, 0.5px) rotate(-0.3deg); }
          20% { transform: translate(1.5px, -0.5px) rotate(0.3deg); }
          30% { transform: translate(-1px, 1px) rotate(-0.2deg); }
          40% { transform: translate(1px, -1px) rotate(0.2deg); }
          50% { transform: translate(-1.5px, 0.5px) rotate(-0.3deg); }
          60% { transform: translate(1.5px, -0.5px) rotate(0.3deg); }
          70% { transform: translate(-1px, 1px) rotate(-0.2deg); }
          80% { transform: translate(1px, -1px) rotate(0.2deg); }
          90% { transform: translate(-1.5px, 0.5px) rotate(-0.3deg); }
        }
        @keyframes stunnedStatic {
          0%, 100% { transform: scale(1); opacity: 1; filter: brightness(1); }
          50% { transform: scale(0.99); opacity: 0.9; filter: brightness(0.85); }
        }
        @keyframes blessedFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
        @keyframes heartbeatGlow {
          0%, 100% { box-shadow: 0 0 40px rgba(220,38,38,0.35), inset 0 0 60px rgba(220,38,38,0.15); }
          15% { box-shadow: 0 0 90px rgba(220,38,38,0.75), inset 0 0 100px rgba(220,38,38,0.4); }
          30% { box-shadow: 0 0 40px rgba(220,38,38,0.35), inset 0 0 60px rgba(220,38,38,0.15); }
          45% { box-shadow: 0 0 90px rgba(220,38,38,0.75), inset 0 0 100px rgba(220,38,38,0.4); }
          60%, 100% { box-shadow: 0 0 40px rgba(220,38,38,0.35), inset 0 0 60px rgba(220,38,38,0.15); }
        }
        @keyframes healPulseGlow {
          0% { box-shadow: 0 0 0px rgba(34,197,94,0); }
          25% { box-shadow: 0 0 90px rgba(34,197,94,0.85), inset 0 0 70px rgba(34,197,94,0.35); }
          100% { box-shadow: 0 0 0px rgba(34,197,94,0); }
        }
        @keyframes healRadialBurst {
          0% { opacity: 0; transform: scale(0.6); }
          25% { opacity: 0.75; }
          100% { opacity: 0; transform: scale(1.35); }
        }
        @keyframes ambientFloat {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          15% { opacity: 0.9; }
          100% { transform: translateY(-90%) scale(0.4); opacity: 0; }
        }
        @keyframes crackFadeIn {
          0% { opacity: 0; }
          100% { opacity: 0.9; }
        }
        @keyframes screenFlash {
          0% { opacity: 0.9; }
          100% { opacity: 0; }
        }
        @keyframes burstRay {
          0% { transform: scale(0.2) rotate(var(--ray-angle)); opacity: 1; }
          100% { transform: scale(1.6) rotate(var(--ray-angle)); opacity: 0; }
        }
        @keyframes bannerSlamIn {
          0% { transform: scale(2.6) rotate(-4deg); opacity: 0; filter: blur(6px); }
          14% { transform: scale(0.92) rotate(1.5deg); opacity: 1; filter: blur(0); }
          22% { transform: scale(1.05) rotate(-1deg); opacity: 1; }
          32% { transform: scale(1) rotate(0deg); opacity: 1; }
          82% { transform: scale(1) rotate(0deg); opacity: 1; }
          100% { transform: scale(1.08) rotate(0deg); opacity: 0; filter: blur(3px); }
        }
        @keyframes glitchShift {
          0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0,0); }
          20% { clip-path: inset(10% 0 60% 0); transform: translate(-3px, 0); }
          40% { clip-path: inset(60% 0 5% 0); transform: translate(3px, 0); }
          60% { clip-path: inset(30% 0 40% 0); transform: translate(-2px, 0); }
          80% { clip-path: inset(5% 0 70% 0); transform: translate(2px, 0); }
        }
        .animate-poison-pulse { animation: poisonPulse 2.2s ease-in-out infinite !important; }
        .animate-burning-shake { animation: burningShake 0.15s linear infinite !important; }
        .animate-frightened-tremble { animation: frightenedTremble 0.35s ease-in-out infinite !important; }
        .animate-stunned-static { animation: stunnedStatic 2.6s ease-in-out infinite !important; }
        .animate-blessed-float { animation: blessedFloat 3.2s ease-in-out infinite !important; }
        .animate-heartbeat { animation: heartbeatGlow 1.1s ease-in-out infinite !important; }
        .animate-heal-pulse { animation: healPulseGlow 1.6s ease-out forwards !important; }
        .animate-heal-radial { animation: healRadialBurst 1.6s ease-out forwards; }
        .animate-banner-slam { animation: bannerSlamIn 2.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .animate-screen-flash { animation: screenFlash 0.5s ease-out forwards; }
        .animate-crack-in { animation: crackFadeIn 0.4s ease-out forwards; }
        .glitch-echo { animation: glitchShift 1.6s steps(2) infinite; }
      `}</style>

      {statusBanner && (() => {
        const theme = CONDITION_THEME[statusBanner.label.toLowerCase()];
        const rays = Array.from({ length: 12 }).map((_, i) => i * 30);
        return (
          <div key={statusBanner.key} className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
            <div
              className="absolute inset-0 animate-screen-flash"
              style={{ backgroundColor: theme?.flash || 'rgba(255,255,255,0.15)' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {rays.map((angle) => (
                <div
                  key={angle}
                  className="absolute w-1 h-[45vh] origin-bottom"
                  style={{
                    background: `linear-gradient(to top, ${theme?.particle || '#fff'}, transparent)`,
                    ['--ray-angle' as any]: `${angle}deg`,
                    animation: 'burstRay 1.4s ease-out forwards',
                    opacity: 0.55,
                  }}
                />
              ))}
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center animate-banner-slam relative">
                <p className="text-sm md:text-base font-mono font-bold text-stone-300 uppercase tracking-[0.35em] mb-2 drop-shadow-lg">
                  {statusBanner.name}
                </p>
                <div className="relative">
                  <p className={`text-7xl md:text-9xl font-black font-serif uppercase tracking-widest ${theme?.text || 'text-stone-200'}`}
                     style={{ textShadow: `0 0 40px ${theme?.glow || 'rgba(255,255,255,0.6)'}, 0 0 90px ${theme?.glow || 'rgba(255,255,255,0.4)'}` }}
                  >
                    {statusBanner.label}
                  </p>
                  <p className="text-7xl md:text-9xl font-black font-serif uppercase tracking-widest absolute inset-0 text-red-500/50 glitch-echo" style={{ transform: 'translate(3px,0)' }}>
                    {statusBanner.label}
                  </p>
                  <p className="text-7xl md:text-9xl font-black font-serif uppercase tracking-widest absolute inset-0 text-cyan-400/50 glitch-echo" style={{ transform: 'translate(-3px,0)', animationDelay: '0.1s' }}>
                    {statusBanner.label}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {currentTurn ? (
        <div className="h-full w-full flex gap-6 md:gap-8 overflow-hidden">
          <div className="w-[70%] h-full flex flex-col justify-between overflow-hidden">
            <div className="pb-4 flex-shrink-0 flex justify-between items-end">
              <div>
                <span className="text-[10px] font-mono font-black text-amber-500/70 uppercase tracking-[0.4em] block mb-1">
                  CURRENTLY ACTING
                </span>
                <h1 className="text-4xl md:text-6xl font-black font-serif text-stone-100 tracking-wider uppercase drop-shadow-2xl truncate">
                  {currentTurn.name}
                </h1>
              </div>

              {currentTurn.status_condition && currentTurn.hp_current > 0 && (
                <span className="text-xs font-mono font-black border border-stone-800 bg-stone-900 px-4 py-2 rounded-xl tracking-widest uppercase shadow-lg">
                  ⚡ STATUS: {currentTurn.status_condition}
                </span>
              )}
            </div>

            <div className="flex-1 min-h-0 w-full flex items-center justify-center py-2">
              {(() => {
                const fx = getHealthEffects(currentTurn.hp_current, currentTurn.hp_max);
                const style = getStatusStyle(currentTurn.status_condition, !!activeStatusVideoFile);

                return (
                  <div className={`w-full h-full bg-stone-900 border rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] relative transition-all duration-500 ${style.borderGlow} ${style.animClass} ${fx.heartbeat ? 'animate-heartbeat' : ''} ${healPulse ? 'animate-heal-pulse' : ''}`}>

                    {/* Base portrait — object-contain shows the entire image (letterboxed if needed)
                        instead of cropping in with object-cover */}
                    {currentTurn.image_url ? (
                      <img
                        src={currentTurn.image_url}
                        alt={currentTurn.name}
                        className="absolute inset-0 w-full h-full object-contain z-0"
                      />
                    ) : (
                      <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-stone-900 text-stone-700">
                        <span className="text-[10px] font-mono tracking-widest uppercase opacity-40">No Portrait Transmitted</span>
                      </div>
                    )}

                    {healPulse && (
                      <div
                        key={healPulse.key}
                        className="absolute inset-0 z-[5] pointer-events-none animate-heal-radial"
                        style={{
                          background: 'radial-gradient(circle, rgba(34,197,94,0.9) 0%, rgba(34,197,94,0.25) 45%, transparent 75%)',
                          mixBlendMode: 'screen',
                        }}
                      />
                    )}

                    <video
                      ref={bloodVideoRef}
                      src="/effects/blood-splatter.mp4"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                      onError={(e) => console.error('Blood overlay video failed to load — check /public/effects/blood-splatter.mp4 exists', e)}
                      className="absolute inset-0 w-full h-full object-cover z-10 mix-blend-screen pointer-events-none transition-opacity duration-700"
                      style={{ opacity: fx.splatterOpacity }}
                    />

                    {activeStatusVideoFile && currentTurn.hp_current > 0 && (
                      <video
                        key={activeStatusVideoFile}
                        ref={statusVideoRef}
                        src={`/effects/${activeStatusVideoFile}`}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        onError={(e) => console.error(`Status overlay video failed to load — check /public/effects/${activeStatusVideoFile} exists`, e)}
                        className="absolute inset-0 w-full h-full object-cover z-[15] mix-blend-screen pointer-events-none"
                      />
                    )}

                    {style.theme && !activeStatusVideoFile && currentTurn.hp_current > 0 && (
                      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                        {AMBIENT_PARTICLES.map((p, i) => (
                          <div
                            key={i}
                            className="absolute bottom-0 rounded-full"
                            style={{
                              left: `${p.left}%`,
                              width: '6px',
                              height: '6px',
                              backgroundColor: style.theme!.particle,
                              boxShadow: `0 0 8px ${style.theme!.particle}`,
                              animation: `ambientFloat ${p.duration}s ease-out infinite`,
                              animationDelay: `${p.delay}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}

                    <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                    {fx.showCrack && (
                      <svg className="absolute inset-0 z-30 w-full h-full pointer-events-none animate-crack-in" viewBox="0 0 400 400" preserveAspectRatio="none">
                        <g stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" fill="none">
                          <path d="M200,0 L180,90 L230,150 L190,220 L240,290 L200,400" />
                          <path d="M180,90 L100,60 M180,90 L110,140 M230,150 L320,120 M230,150 L300,190 M190,220 L110,240 M190,220 L90,310 M240,290 L330,300 M240,290 L280,370" />
                        </g>
                      </svg>
                    )}

                    {fx.showDefeated && (
                      <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-[3px]">
                        <span className="text-red-600/80 font-serif font-black text-5xl md:text-7xl tracking-widest uppercase border-[6px] border-red-700/50 px-10 py-3 rounded-2xl rotate-[-12deg] animate-pulse"
                              style={{ textShadow: '0 0 30px rgba(220,38,38,0.7)' }}>
                          DEFEATED
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="w-[30%] h-full bg-stone-900/30 border border-stone-900 p-4 rounded-3xl flex flex-col justify-between overflow-hidden">
            <div className="border-b border-stone-800 pb-3 mb-4 flex-shrink-0">
              <span className="text-[10px] font-mono font-black text-stone-500 uppercase tracking-[0.2em] block">
                TURN TIMELINE
              </span>
            </div>

            <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
              {upcomingTimeline.length > 0 ? (
                upcomingTimeline.map((combatant, idx) => (
                  <div key={combatant.id} className="bg-stone-900/60 border border-stone-800/80 p-3 rounded-xl flex items-center justify-between min-h-[50px]">
                    <div className="min-w-0 flex flex-col">
                      <span className="text-[9px] font-mono font-bold text-amber-500/50 uppercase tracking-tighter">
                        NEXT IN LINE {idx + 1}
                      </span>
                      <span className="text-sm font-sans font-bold text-stone-300 uppercase tracking-wide truncate">
                        {combatant.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {combatant.status_condition && combatant.hp_current > 0 && (
                        <span className="text-[8px] font-mono font-bold bg-stone-950 text-amber-500/70 border border-stone-800 px-1.5 py-0.5 rounded uppercase">
                          {combatant.status_condition}
                        </span>
                      )}
                      {combatant.hp_current <= 0 && (
                        <span className="text-[9px] font-mono font-bold text-red-500 border border-red-950 bg-red-950/20 px-2 py-0.5 rounded uppercase">
                          Down
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-600">No Combatants On Deck</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full w-full flex items-center justify-center">
          <div className="text-center py-16 text-stone-700 font-mono text-xs tracking-wider uppercase border border-dashed border-stone-900 rounded-3xl w-full max-w-xl bg-stone-950/40">
            Awaiting combat arena sequence initialization...
          </div>
        </div>
      )}
    </main>
  );
}