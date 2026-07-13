'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AVAILABLE_CONDITIONS = [
  { id: 'concentrating', label: 'CONCENTRATING', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-900/50' },
  { id: 'blessed', label: 'BLESSED', color: 'text-amber-300 bg-amber-950/40 border-amber-900/50' },

  { id: 'poisoned', label: 'POISONED', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50' },
  { id: 'charmed', label: 'CHARMED', color: 'text-pink-400 bg-pink-950/40 border-pink-900/50' },
  { id: 'confused', label: 'CONFUSED', color: 'text-indigo-400 bg-indigo-950/40 border-indigo-900/50' },
  { id: 'possessed', label: 'POSSESSED', color: 'text-violet-400 bg-violet-950/40 border-violet-900/50' },

  { id: 'burning', label: 'BURNING', color: 'text-orange-400 bg-orange-950/40 border-orange-900/50' },
  { id: 'shocked', label: 'SHOCKED', color: 'text-yellow-300 bg-yellow-950/40 border-yellow-900/50' },
  { id: 'frightened', label: 'FRIGHTENED', color: 'text-fuchsia-400 bg-fuchsia-950/40 border-fuchsia-900/50' },

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
  description?: string | null;
  creature_type?: string | null;
  traits?: string | null;
  actions?: string | null;
}

interface CompendiumAsset {
  id: number;
  name: string;
  hp_max: number;
  ac: number;
  initiative_bonus: number;
  image_url?: string | null;
  description?: string | null;
  creature_type?: string | null;
  traits?: string | null;
  actions?: string | null;
}

export default function DmDashboard() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [statuses, setStatuses] = useState<Record<number, string[]>>({});
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  const [hpAdjustInputs, setHpAdjustInputs] = useState<Record<number, string>>({});

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addTab, setAddTab] = useState<'player' | 'monster'>('player');
  const [compendiumPlayers, setCompendiumPlayers] = useState<CompendiumAsset[]>([]);
  const [compendiumMonsters, setCompendiumMonsters] = useState<CompendiumAsset[]>([]);

  const [initiativeOverrides, setInitiativeOverrides] = useState<Record<string, string>>({});

  const [removingId, setRemovingId] = useState<number | null>(null);

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
    if (error) {
      console.error('Failed to fetch encounter_queue:', error);
    }
    setLoading(false);
  };

  const fetchCompendium = async () => {
    const { data: pData } = await supabase.schema('dnd').from('players').select('*').order('name');
    const { data: mData } = await supabase.schema('dnd').from('monsters').select('*').order('name');
    setCompendiumPlayers(pData || []);
    setCompendiumMonsters(mData || []);
  };

  useEffect(() => {
    fetchActiveQueue();
    fetchCompendium();

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
    setRemovingId(itemToRemove.id);
    try {
      if (itemToRemove.is_active && queueItems.length > 1) {
        const remainingCombatants = queueItems.filter(item => item.id !== itemToRemove.id);
        const nextInLine = remainingCombatants.find(item => item.initiative <= itemToRemove.initiative);
        const targetToCrown = nextInLine || remainingCombatants[0];

        if (targetToCrown) {
          const { error: crownError } = await supabase
            .schema('dnd')
            .from('encounter_queue')
            .update({ is_active: true })
            .eq('id', targetToCrown.id);

          if (crownError) {
            console.error('Failed to hand off active turn before removal:', crownError);
            alert(`Could not remove ${itemToRemove.name}: failed to hand off the active turn first.\n\n${crownError.message}`);
            setRemovingId(null);
            return;
          }
        }
      }

      const { error: deleteError, count } = await supabase
        .schema('dnd')
        .from('encounter_queue')
        .delete({ count: 'exact' })
        .eq('id', itemToRemove.id);

      if (deleteError) {
        console.error('Delete failed:', deleteError);
        alert(`Could not remove ${itemToRemove.name} from the encounter:\n\n${deleteError.message}\n\nIf this keeps happening, check that Row Level Security on encounter_queue allows DELETE for your logged-in role in Supabase.`);
        setRemovingId(null);
        return;
      }

      if (count === 0) {
        console.warn('Delete request succeeded but removed 0 rows — likely blocked by Row Level Security.');
        alert(`${itemToRemove.name} could not be removed. The database accepted the request but deleted 0 rows — this usually means Row Level Security on encounter_queue is blocking DELETE for your account. Check Supabase → Authentication → Policies for the encounter_queue table.`);
        setRemovingId(null);
        return;
      }

      setStatuses(prev => {
        const updated = { ...prev };
        delete updated[itemToRemove.id];
        return updated;
      });

      setHpAdjustInputs(prev => {
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
      console.error("Failed to remove combatant from dashboard:", err);
      alert(`Unexpected error removing ${itemToRemove.name}: ${err.message || err}`);
    } finally {
      setRemovingId(null);
    }
  };

  // Copies description/creature_type/traits/actions from the compendium record onto the
  // live queue row itself, so the DM reference card is self-contained and never depends
  // on a live lookup back to the monsters table.
  const handleAddToLiveEncounter = async (asset: CompendiumAsset, type: 'player' | 'monster') => {
    try {
      const overrideKey = `${type}-${asset.id}`;
      const overrideRaw = initiativeOverrides[overrideKey];
      const overrideParsed = overrideRaw !== undefined && overrideRaw !== '' ? parseInt(overrideRaw, 10) : NaN;
      const initiativeValue = !isNaN(overrideParsed)
        ? overrideParsed
        : asset.initiative_bonus + Math.floor(Math.random() * 20) + 1;

      const queueWasEmpty = queueItems.length === 0;

      const { error } = await supabase
        .schema('dnd')
        .from('encounter_queue')
        .insert([{
          name: asset.name,
          hp_max: asset.hp_max,
          hp_current: asset.hp_max,
          ac: asset.ac,
          initiative: initiativeValue,
          image_url: asset.image_url || null,
          turn_order: queueItems.length,
          is_active: queueWasEmpty,
          is_player: type === 'player',
          monster_reference_id: type === 'monster' ? asset.id : null,
          status_condition: null,
          description: type === 'monster' ? (asset.description || null) : null,
          creature_type: type === 'monster' ? (asset.creature_type || null) : null,
          traits: type === 'monster' ? (asset.traits || null) : null,
          actions: type === 'monster' ? (asset.actions || null) : null,
        }]);

      if (error) throw error;

      setInitiativeOverrides(prev => {
        const updated = { ...prev };
        delete updated[overrideKey];
        return updated;
      });

      fetchActiveQueue();
    } catch (err: any) {
      console.error('Failed to add combatant to live encounter:', err.message);
      alert(`Failed to add combatant: ${err.message}`);
    }
  };

  const handleApplyHp = async (item: QueueItem, mode: 'heal' | 'damage') => {
    const rawValue = hpAdjustInputs[item.id];
    const amount = parseInt(rawValue || '', 10);
    if (isNaN(amount) || amount <= 0) return;

    const delta = mode === 'heal' ? amount : -amount;
    const targetHp = Math.max(0, Math.min(item.hp_max, item.hp_current + delta));

    setQueueItems(prev => prev.map(q => q.id === item.id ? { ...q, hp_current: targetHp } : q));
    setHpAdjustInputs(prev => ({ ...prev, [item.id]: '' }));

    const { error } = await supabase
      .schema('dnd')
      .from('encounter_queue')
      .update({ hp_current: targetHp })
      .eq('id', item.id);

    if (error) {
      console.error('Failed to update HP:', error);
      alert(`Failed to update HP for ${item.name}: ${error.message}`);
    }
  };

  const toggleStatus = async (combatantId: number, conditionId: string) => {
    const currentActive = statuses[combatantId] || [];
    const isApplied = currentActive.includes(conditionId);
    const newValue = isApplied ? null : conditionId;

    setStatuses(prev => ({
      ...prev,
      [combatantId]: newValue ? [newValue] : []
    }));

    const { error } = await supabase
      .schema('dnd')
      .from('encounter_queue')
      .update({ status_condition: newValue })
      .eq('id', combatantId);

    if (error) {
      console.error('Failed to update status condition:', error);
    }
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddPanel(prev => !prev)}
                className="bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-orange-500 text-stone-300 font-mono font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all"
              >
                {showAddPanel ? '✕ Close' : '+ Add Combatant'}
              </button>
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
        </div>

        <div className="space-y-3">
          {queueItems.map((item) => {
            const isPlayer = item.is_player;
            const currentItemStatuses = statuses[item.id] || [];

            // Reads directly off the queue row now — works for compendium-sourced AND
            // quick-created/ad-hoc monsters, and stays correct even if the source
            // monster record is later edited or deleted.
            const hasMonsterReference = !isPlayer && item.is_active && (
              item.description || item.traits || item.actions || item.creature_type
            );

            return (
              <div
                key={item.id}
                className={`flex flex-col gap-3 p-4 bg-stone-900 rounded-xl border transition-all ${
                  item.is_active
                    ? 'border-orange-500 ring-2 ring-orange-950 shadow-md shadow-orange-950/40'
                    : isPlayer
                      ? 'border-white/40'
                      : 'border-stone-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={hpAdjustInputs[item.id] ?? ''}
                        onChange={(e) => setHpAdjustInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                        onFocus={(e) => e.target.select()}
                        className="w-16 bg-stone-950 border border-stone-800 rounded-lg px-2 py-1.5 text-xs font-mono text-center text-white outline-none focus:border-orange-500"
                      />
                      <button
                        onClick={() => handleApplyHp(item, 'heal')}
                        className="px-3 py-1.5 bg-stone-950 border border-emerald-900/50 hover:bg-emerald-950/30 text-emerald-400 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wide transition-colors"
                      >
                        Heal
                      </button>
                      <button
                        onClick={() => handleApplyHp(item, 'damage')}
                        className="px-3 py-1.5 bg-stone-950 border border-rose-900/50 hover:bg-rose-950/30 text-rose-400 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wide transition-colors"
                      >
                        Damage
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
                      disabled={removingId === item.id}
                      className="px-3 py-1 bg-stone-950 hover:bg-rose-950/30 text-stone-400 hover:text-rose-400 border border-stone-800 hover:border-rose-900/50 rounded-lg font-mono text-[10px] font-bold transition-all uppercase disabled:opacity-40"
                    >
                      {removingId === item.id ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </div>

                {/* DM-ONLY MONSTER REFERENCE CARD — reads straight off the queue row now,
                    so it works for compendium monsters AND quick-created ad-hoc ones. */}
                {hasMonsterReference && (
                  <div className="border-t border-orange-900/40 pt-3 mt-1 space-y-2.5 bg-stone-950/40 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-black text-orange-500/80 uppercase tracking-widest">
                        DM Reference
                      </span>
                      {item.creature_type && (
                        <span className="text-[9px] font-mono text-stone-500">· {item.creature_type}</span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-stone-300 italic leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {item.traits && (
                      <div>
                        <span className="text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider block mb-1">Traits</span>
                        <p className="text-xs text-stone-300 leading-relaxed whitespace-pre-wrap">{item.traits}</p>
                      </div>
                    )}

                    {item.actions && (
                      <div>
                        <span className="text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider block mb-1">Actions</span>
                        <p className="text-xs text-stone-300 leading-relaxed whitespace-pre-wrap">{item.actions}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {queueItems.length === 0 && (
            <div className="text-center py-16 border border-dashed border-stone-800 rounded-xl font-mono text-xs text-stone-600 uppercase tracking-wider">
              No combatants currently in the encounter
            </div>
          )}
        </div>

        {showAddPanel && (
          <div className="bg-stone-900/40 border border-stone-800 rounded-2xl p-4 space-y-3">
            <div className="flex border-b border-stone-800">
              <button
                type="button" onClick={() => setAddTab('player')}
                className={`flex-1 pb-2 text-[10px] font-mono uppercase font-black tracking-wider transition ${addTab === 'player' ? 'text-orange-400 border-b border-orange-400' : 'text-stone-600 hover:text-stone-400'}`}
              >
                Players
              </button>
              <button
                type="button" onClick={() => setAddTab('monster')}
                className={`flex-1 pb-2 text-[10px] font-mono uppercase font-black tracking-wider transition ${addTab === 'monster' ? 'text-orange-400 border-b border-orange-400' : 'text-stone-600 hover:text-stone-400'}`}
              >
                Monsters
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(addTab === 'player' ? compendiumPlayers : compendiumMonsters).map(asset => {
                const overrideKey = `${addTab}-${asset.id}`;
                return (
                  <div key={asset.id} className="bg-stone-950/60 border border-stone-800 p-2.5 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 truncate min-w-0">
                      {asset.image_url ? (
                        <img src={asset.image_url} alt="" className="w-7 h-7 rounded-md object-cover border border-stone-800 flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-md bg-stone-900 border border-stone-800 text-[8px] flex items-center justify-center font-mono text-stone-600 flex-shrink-0">
                          {addTab === 'player' ? 'PL' : 'CR'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-bold text-stone-300 truncate uppercase tracking-wide block">{asset.name}</span>
                        <span className="text-[9px] font-mono text-stone-500">HP {asset.hp_max} · AC {asset.ac} · Init Mod {asset.initiative_bonus >= 0 ? '+' : ''}{asset.initiative_bonus}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex flex-col items-center">
                        <label className="text-[7px] font-mono text-stone-600 uppercase tracking-wider mb-0.5">Init</label>
                        <input
                          type="number"
                          value={initiativeOverrides[overrideKey] ?? ''}
                          onChange={(e) => setInitiativeOverrides(prev => ({ ...prev, [overrideKey]: e.target.value }))}
                          onFocus={(e) => e.target.select()}
                          placeholder="Roll"
                          className="w-14 bg-stone-900 border border-stone-800 rounded-md px-1.5 py-1 text-center text-xs font-mono text-amber-400 outline-none focus:border-orange-500"
                        />
                      </div>
                      <button
                        onClick={() => handleAddToLiveEncounter(asset, addTab)}
                        className="bg-stone-900 hover:bg-orange-600 border border-stone-800 hover:border-orange-500 text-[10px] font-mono text-stone-400 hover:text-stone-950 px-3 py-1.5 rounded-md transition font-bold"
                      >
                        + Join Fight
                      </button>
                    </div>
                  </div>
                );
              })}
              {(addTab === 'player' ? compendiumPlayers : compendiumMonsters).length === 0 && (
                <div className="text-center py-6 text-[10px] font-mono text-stone-600 uppercase tracking-wider">
                  No {addTab === 'player' ? 'players' : 'monsters'} found in compendium
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}