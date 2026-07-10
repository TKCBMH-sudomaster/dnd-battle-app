'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Full condition set: official 5e conditions + homebrew additions. 'invisible' intentionally excluded.
const AVAILABLE_CONDITIONS = [
  // Buffs
  { id: 'concentrating', label: 'CONCENTRATING', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-900/50' },
  { id: 'blessed', label: 'BLESSED', color: 'text-amber-300 bg-amber-950/40 border-amber-900/50' },

  // Toxic / mental
  { id: 'poisoned', label: 'POISONED', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50' },
  { id: 'charmed', label: 'CHARMED', color: 'text-pink-400 bg-pink-950/40 border-pink-900/50' },
  { id: 'confused', label: 'CONFUSED', color: 'text-indigo-400 bg-indigo-950/40 border-indigo-900/50' },
  { id: 'possessed', label: 'POSSESSED', color: 'text-violet-400 bg-violet-950/40 border-violet-900/50' },

  // Violent
  { id: 'burning', label: 'BURNING', color: 'text-orange-400 bg-orange-950/40 border-orange-900/50' },
  { id: 'shocked', label: 'SHOCKED', color: 'text-yellow-300 bg-yellow-950/40 border-yellow-900/50' },
  { id: 'frightened', label: 'FRIGHTENED', color: 'text-fuchsia-400 bg-fuchsia-950/40 border-fuchsia-900/50' },

  // Locked / held
  { id: 'stunned', label: 'STUNNED', color: 'text-sky-300 bg-sky-950/40 border-sky-900/50' },
  { id: 'paralyzed', label: 'PARALYZED', color: 'text-sky-400 bg-sky-950/40 border-sky-900/50' },
  { id: 'petrified', label: 'PETRIFIED', color: 'text-stone-400 bg-stone-950/60 border-stone-800' },
  { id: 'incapacitated', label: 'INCAPACITATED', color: 'text-red-400 bg-red-950/40 border-red-900/50' },
  { id: 'unconscious', label: 'UNCONSCIOUS', color: 'text-rose-400 bg-rose-950/40 border-rose-900/50' },
  { id: 'blinded', label: 'BLINDED', color: 'text-zinc-400 bg-zinc-950/60 border-zinc-800' },
  { id: 'deafened', label: 'DEAFENED', color: 'text-slate-400 bg-slate-950/60 border-slate-800' },
  { id: 'frozen', label: 'FROZEN', color: 'text-blue-300 bg-blue-950/40 border-blue-900/50' },
  { id: 'exhaustion', label: 'EXHAUSTION', color: 'text-yellow-500 bg-yellow-950/30 border-yellow-900/40' },
  { id: 'restrained', label: 'RESTRAINED', color: 'text-purple-400 bg-purple-950/40 border-purple-900/50' },
  { id: 'grappled', label: 'GRAPPLED', color: 'text-teal-400 bg-teal-950/40 border-teal-900/50' },
  { id: 'prone', label: 'PRONE', color: 'text-stone-400 bg-stone-950/60 border-stone-800' },
];

interface QueueItem {
  id: number;
  name: string;
  hp_max: number;
  hp_current: number;
  ac: number;
  initiative: number;
  turn_order: number;
  is_active: boolean;
  is_player: boolean;
  image_url?: string;
  monster_reference_id?: number | null;
  status_condition?: string | null;
}

export default function DmDashboard() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [statuses, setStatuses] = useState<Record<number, string[]>>({});
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  const fetchActiveQueue = async () => {
    const { data, error } = await supabase
      .schema('dnd')
      .from('encounter_queue')
      .select('*')
      .order('initiative', { ascending: false });

    if (!error && data) {
      setQueueItems(data);
      const derivedStatuses: Record<number, string[]> = {};
      data.forEach((item: QueueItem) => {
        derivedStatuses[item.id] = item.status_condition ? [item.status_condition] : [];
      });
      setStatuses(derivedStatuses);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActiveQueue();

    const channel = supabase
      .channel('dm_board_sync')
      .on('postgres_changes', { event: '*', schema: 'dnd', table: 'encounter_queue' }, () => {
        fetchActiveQueue();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleNextTurn = async () => {
    if (queueItems.length === 0) return;

    try {
      const activeIdx = queueItems.findIndex(item => item.is_active);
      let nextIdx = 0;

      if (activeIdx !== -1) {
        nextIdx = (activeIdx + 1) % queueItems.length;
      }

      if (activeIdx !== -1 && queueItems[activeIdx]) {
        await supabase
          .schema('dnd')
          .from('encounter_queue')
          .update({ is_active: false })
          .eq('id', queueItems[activeIdx].id);
      }

      const nextCombatant = queueItems[nextIdx];
      if (nextCombatant) {
        await supabase
          .schema('dnd')
          .from('encounter_queue')
          .update({ is_active: true })
          .eq('id', nextCombatant.id);
      }

      fetchActiveQueue();
    } catch (err: any) {
      console.error("Failed to advance sequence:", err.message);
    }
  };

  const handleRemoveFromQueue = async (itemToRemove: QueueItem) => {
    try {
      if (itemToRemove.is_active && queueItems.length > 1) {
        const remainingCombatants = queueItems.filter(item => item.id !== itemToRemove.id);
        const nextInLine = remainingCombatants.find(item => item.initiative <= itemToRemove.initiative);
        const targetToCrown = nextInLine || remainingCombatants[0];

        if (targetToCrown) {
          await supabase
            .schema('dnd')
            .from('encounter_queue')
            .update({ is_active: true })
            .eq('id', targetToCrown.id);
        }
      }

      const { error: deleteError } = await supabase
        .schema('dnd')
        .from('encounter_queue')
        .delete()
        .eq('id', itemToRemove.id);

      if (deleteError) throw deleteError;

      setStatuses(prev => {
        const updated = { ...prev };
        delete updated[itemToRemove.id];
        return updated;
      });

      const { data: verifiedQueue, error: fetchError } = await supabase
        .schema('dnd')
        .from('encounter_queue')
        .select('*')
        .order('initiative', { ascending: false });

      if (fetchError) throw fetchError;

      if (verifiedQueue && verifiedQueue.length > 0) {
        const activeExists = verifiedQueue.some(item => item.is_active);
        if (!activeExists) {
          await supabase
            .schema('dnd')
            .from('encounter_queue')
            .update({ is_active: true })
            .eq('id', verifiedQueue[0].id);
        }
      }

      setQueueItems(verifiedQueue || []);
    } catch (err: any) {
      console.error("Failed to remove combatant from dashboard:", err.message);
    }
  };

  const handleUpdateHp = async (id: number, currentHp: number, adjustment: number) => {
    const targetHp = Math.max(0, currentHp + adjustment);
    setQueueItems(prev => prev.map(item => item.id === id ? { ...item, hp_current: targetHp } : item));

    await supabase
      .schema('dnd')
      .from('encounter_queue')
      .update({ hp_current: targetHp })
      .eq('id', id);
  };

  const toggleStatus = async (combatantId: number, conditionId: string) => {
    const currentActive = statuses[combatantId] || [];
    const isApplied = currentActive.includes(conditionId);
    const newValue = isApplied ? null : conditionId;

    setStatuses(prev => ({
      ...prev,
      [combatantId]: newValue ? [newValue] : []
    }));

    await supabase
      .schema('dnd')
      .from('encounter_queue')
      .update({ status_condition: newValue })
      .eq('id', combatantId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 text-orange-500 font-mono text-xs flex items-center justify-center">
        LOADING ACTIVE MASTER INTERFACE...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 p-6 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="space-y-4">
          <div className="flex gap-4">
            <a href="/player-creator" className="text-[10px] font-mono text-orange-500 hover:text-white uppercase tracking-wider">
              + Create Player
            </a>
          </div>
          <div className="flex justify-between items-center border-b border-stone-800 pb-4">
            <div>
              <h1 className="text-xl font-black font-serif uppercase tracking-wider text-orange-500">DM Combat Command Panel</h1>
              <p className="text-[10px] text-stone-500 font-mono">Real-time encounter progression controller</p>
            </div>
            {queueItems.length > 0 && (
              <button
                onClick={handleNextTurn}
                className="bg-orange-500 hover:bg-orange-600 text-stone-950 font-mono font-black text-xs px-5 py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-lg"
              >
                Advance Turn
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {queueItems.map((item) => {
            const isPlayer = item.is_player;
            const currentItemStatuses = statuses[item.id] || [];

            return (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-stone-900 rounded-xl border transition-all gap-4 ${
                  item.is_active
                    ? 'border-orange-500 ring-2 ring-orange-950 shadow-md shadow-orange-950/40'
                    : isPlayer
                      ? 'border-white/40'
                      : 'border-stone-800'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-bold uppercase text-sm tracking-wide truncate ${isPlayer ? 'text-white' : 'text-orange-400'}`}>
                      {item.name}
                    </h3>

                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                      isPlayer ? 'bg-white text-stone-950' : 'bg-orange-600 text-stone-950'
                    }`}>
                      {isPlayer ? 'Player' : 'Monster'}
                    </span>

                    {item.is_active && (
                      <span className="text-[9px] font-mono font-bold text-stone-950 bg-amber-500 px-1.5 py-0.5 rounded uppercase">
                        Acting
                      </span>
                    )}
                    {item.hp_current <= 0 && (
                      <span className="text-[9px] font-mono font-bold text-rose-500 bg-rose-950/40 border border-rose-900/40 px-1.5 py-0.5 rounded uppercase">
                        Down
                      </span>
                    )}

                    {currentItemStatuses.map((statusId) => {
                      const details = AVAILABLE_CONDITIONS.find(c => c.id === statusId);
                      if (!details) return null;
                      return (
                        <span
                          key={statusId}
                          onClick={() => toggleStatus(item.id, statusId)}
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase cursor-pointer hover:line-through ${details.color}`}
                        >
                          {details.label}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex gap-4 text-[10px] font-mono text-stone-400 mt-2">
                    <span>INIT: <strong className="text-orange-400">{item.initiative}</strong></span>
                    <span>AC: <strong className="text-white">{item.ac}</strong></span>
                    <span>VITALITY: <strong className="text-emerald-400">{item.hp_current}/{item.hp_max}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleUpdateHp(item.id, item.hp_current, -5)}
                      className="px-2.5 py-1 bg-stone-950 border border-stone-800 hover:border-rose-900 hover:text-rose-400 rounded-lg font-mono text-xs text-stone-400 transition-colors"
                    >
                      -5
                    </button>
                    <button
                      onClick={() => handleUpdateHp(item.id, item.hp_current, -1)}
                      className="px-2.5 py-1 bg-stone-950 border border-stone-800 hover:border-rose-900 hover:text-rose-400 rounded-lg font-mono text-xs text-stone-400 transition-colors"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => handleUpdateHp(item.id, item.hp_current, 1)}
                      className="px-2.5 py-1 bg-stone-950 border border-stone-800 hover:border-emerald-900 hover:text-emerald-400 rounded-lg font-mono text-xs text-stone-400 transition-colors"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => handleUpdateHp(item.id, item.hp_current, 5)}
                      className="px-2.5 py-1 bg-stone-950 border border-stone-800 hover:border-emerald-900 hover:text-emerald-400 rounded-lg font-mono text-xs text-stone-400 transition-colors"
                    >
                      +5
                    </button>
                  </div>

                  <div className="border-l border-stone-800 h-6 mx-1 hidden sm:block"></div>

                  <div className="relative">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === item.id ? null : item.id)}
                      className="px-2.5 py-1 bg-stone-950 border border-stone-800 hover:border-orange-500 text-stone-400 rounded-lg font-mono text-xs transition-all flex items-center gap-1"
                    >
                      Status
                    </button>

                    {activeDropdown === item.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                        <div className="absolute right-0 mt-2 w-52 bg-stone-950 border border-stone-800 rounded-xl shadow-xl z-20 p-2">
                          <p className="text-[9px] font-mono font-bold text-stone-500 px-2 py-1 uppercase tracking-wider sticky top-0 bg-stone-950">
                            Toggle Conditions
                          </p>
                          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                            {AVAILABLE_CONDITIONS.map((cond) => {
                              const active = currentItemStatuses.includes(cond.id);
                              return (
                                <button
                                  key={cond.id}
                                  onClick={() => toggleStatus(item.id, cond.id)}
                                  className={`w-full text-left font-mono text-xs px-2 py-1.5 rounded-lg transition-all ${
                                    active
                                      ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30'
                                      : 'text-stone-400 hover:bg-stone-900 hover:text-white'
                                  }`}
                                >
                                  {cond.label} {active && '✓'}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="border-l border-stone-800 h-6 mx-1 hidden sm:block"></div>

                  <button
                    onClick={() => handleRemoveFromQueue(item)}
                    className="px-3 py-1 bg-stone-950 hover:bg-rose-950/30 text-stone-400 hover:text-rose-400 border border-stone-800 hover:border-rose-900/50 rounded-lg font-mono text-[10px] font-bold transition-all uppercase"
                  >
                    Remove
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}