'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // If we are on the root login page, hide all navigation tabs completely
  const isLoginPage = pathname === '/';

  const handleLogout = () => {
    // Clear any active session states safely
    localStorage.removeItem('edit_monster_target');
    router.push('/');
  };

  return (
    <html lang="en">
      <body className="bg-stone-950 text-stone-100 min-h-screen antialiased">
        {!isLoginPage && (
          <nav className="bg-stone-900 border-b border-stone-800 px-6 py-3 flex items-center justify-between text-xs font-mono tracking-wider uppercase shadow-md">
            <div className="flex gap-6">
              <Link href="/encounter-setup" className={`hover:text-amber-400 transition-colors ${pathname === '/encounter-setup' ? 'text-amber-500 font-bold' : 'text-stone-400'}`}>
                Staging Setup
              </Link>
              <Link href="/dm-dashboard" className={`hover:text-amber-400 transition-colors ${pathname === '/dm-dashboard' ? 'text-amber-500 font-bold' : 'text-stone-400'}`}>
                DM Dashboard
              </Link>
              <Link href="/player-monitor" className={`hover:text-amber-400 transition-colors ${pathname === '/player-monitor' ? 'text-amber-500 font-bold' : 'text-stone-400'}`}>
                Player Monitor
              </Link>
              <Link href="/creator-factory" className={`hover:text-amber-400 transition-colors ${pathname === '/creator-factory' ? 'text-amber-500 font-bold' : 'text-stone-400'}`}>
                Creator Factory
              </Link>
            </div>
            
            <button 
              onClick={handleLogout}
              className="text-stone-500 hover:text-rose-400 font-bold transition-colors tracking-widest bg-stone-950/40 border border-stone-800/60 px-3 py-1 rounded-md"
            >
              Logout
            </button>
          </nav>
        )}
        {children}
      </body>
    </html>
  );
}