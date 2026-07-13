'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const inputEmail = username.trim().toLowerCase();
    const inputPass = password.trim();

    const { error } = await supabase.auth.signInWithPassword({
      email: inputEmail,
      password: inputPass,
    });

    if (error) {
      setErrorMessage('ACCESS DENIED: Invalid Operator Credentials or Security Pass Key.');
      setLoading(false);
      return;
    }

    router.push('/encounter-setup');
  };

  return (
    <main className="relative h-screen w-screen flex items-center justify-center p-4 overflow-hidden bg-stone-950">
      
      {/* FULLSCREEN BACKGROUND VIDEO LAYER */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-1/2 left-1/2 min-w-full min-h-full -translate-x-1/2 -translate-y-1/2 object-cover z-0 opacity-40 pointer-events-none"
      >
        <source src="/dndvideo.mp4" type="video/mp4" />
        <source src="dndvideo.mp4" type="video/mp4" />
        Your browser environment does not support HTML5 video layout streams.
      </video>

      {/* CINEMATIC AMBIENT OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/70 to-stone-950 z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.05)_0%,transparent_70%)] z-10 pointer-events-none" />

      {/* CENTRAL LOGIN CARD (Transparent Text-Focused Style) */}
      <div className="w-full max-w-md p-6 md:p-8 z-20 space-y-6">
        
        <div className="text-center space-y-1.5">
          <img
            src="/dmd-logo.png"
            alt="DMD Logo"
            className="mx-auto h-36 md:h-44 w-auto object-contain drop-shadow-lg"
          />
          <p className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">
            DM ENGINE SYSTEM ACCESS v2.0
          </p>
        </div>

        {errorMessage && (
          <div className="bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs font-mono p-3 rounded-xl text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1.5 tracking-wider">
              Operator Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-stone-950/90 border border-stone-800 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500 transition-colors font-medium"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1.5 tracking-wider">
              Security Key Access Pass
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-stone-950/90 border border-stone-800 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500 transition-colors font-mono tracking-widest"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-600 text-stone-950 font-black tracking-widest text-xs py-3.5 rounded-xl uppercase transition-all shadow-lg border border-amber-500/20 mt-2"
          >
            {loading ? 'VERIFYING SYSTEM KEY CODES...' : 'AUTHORIZE ACCESS KEY'}
          </button>
        </form>

      </div>
    </main>
  );
}