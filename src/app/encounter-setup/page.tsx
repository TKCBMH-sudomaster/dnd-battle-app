'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface BaseAsset {
  id: number;
  name: string;
  character_class?: string;
  creature_type?: string;
  hp_max: number;
  ac: number;
  initiative_bonus: number;
  image_url?: string | null;
}

interface ActiveQueueItem {
  source_id?: number;
  name: string;
  type: 'player' | 'creature';
  hp_max: number;
  hp_current: number;
  ac: number;
  initiative: number;
  initiative_bonus: number;
  image_url: string | null;
}

export default function EncounterSetup() {
  const router = useRouter();

  const [storedPlayers, setStoredPlayers] = useState<BaseAsset[]>([]);
  const [storedCreatures, setStoredCreatures] = useState<BaseAsset[]>([]);
  const [activeQueue, setActiveQueue] = useState<ActiveQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [creationTab, setCreationTab] = useState<'player' | 'creature'>('player');
  const [formName, setFormName] = useState('');
  const [formClass, setFormClass] = useState('');
  const [formHp, setFormHp] = useState(10);
  const [formAc, setFormAc] = useState(10);
  const [formInitBonus, setFormInitBonus] = useState(0);
  const [formImageUrl, setFormImageUrl] = useState('');

  useEffect(() => {
    const fetchCoreRepositories = async () => {
      setLoading(true);

      const { data: pData } = await supabase.schema('dnd').from('players').select('*').order('name');
      const { data: cData } = await supabase.schema('dnd').from('monsters').select('*').order('name');

      setStoredPlayers(pData || []);
      setStoredCreatures(cData || []);
      setLoading(false);
    };

    fetchCoreRepositories();
  }, []);

  const navigateToDedicatedPlayerCreator = () => {
    localStorage.removeItem('edit_player_target');
    router.push('/player-creator');
  };

  const navigateToDedicatedCreatureCreator = () => {
    localStorage.removeItem('edit_monster_target');
    router.push('/creator-factory');
  };

  const navigateToEditPlayer = (asset: BaseAsset) => {
    localStorage.setItem('edit_player_target', JSON.stringify(asset));
    router.push('/player-creator');
  };

  const navigateToEditCreature = (asset: BaseAsset) => {
    localStorage.setItem('edit_monster_target', JSON.stringify(asset));
    router.push('/creator-factory');
  };

  const addAssetToStagingQueue = (asset: BaseAsset, type: 'player' | 'creature') => {
    const newItem: ActiveQueueItem = {
      source_id: asset.id,
      name: asset.name,
      type: type,
      hp_max: asset.hp_max,
      hp_current: asset.hp_max,
      ac: asset.ac,
      initiative_bonus: asset.initiative_bonus,
      initiative: asset.initiative_bonus + Math.floor(Math.random() * 20) + 1,
      image_url: asset.image_url || null,
    };

    setActiveQueue(prev => [...prev, newItem]);
  };

  const handleQuickCreationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const newItem: ActiveQueueItem = {
      name: formName.trim(),
      type: creationTab,
      hp_max: Number(formHp),
      hp_current: Number(formHp),
      ac: Number(formAc),
      initiative_bonus: Number(formInitBonus),
      initiative: Number(formInitBonus) + Math.floor(Math.random() * 20) + 1,
      image_url: formImageUrl.trim() || null,
    };

    setActiveQueue(prev => [...prev, newItem]);

    setFormName('');
    setFormClass('');
    setFormHp(10);
    setFormAc(10);
    setFormInitBonus(0);
    setFormImageUrl('');
  };

  const updateStagingRoll = (index: number, val: number) => {
    setActiveQueue(prev => {
      const updated = [...prev];
      updated[index].initiative = val;
      return updated;
    });
  };

  const removeStagingItem = (index: number) => {
    setActiveQueue(prev => prev.filter((_, i) => i !== index));
  };

  const handleCommitEncounterToLive = async () => {
    if (activeQueue.length === 0) return;

    const sortedEncounter = [...activeQueue].sort((a, b) => b.initiative - a.initiative);

    await supabase.schema('dnd').from('encounter_queue').delete().neq('id', -1);

    const { error } = await supabase
      .schema('dnd')
      .from('encounter_queue')
      .insert(sortedEncounter.map((item, index) => ({
        name: item.name,
        hp_max: item.hp_max,
        hp_current: item.hp_current,
        ac: item.ac,
        initiative: item.initiative,
        image_url: item.image_url,
        turn_order: index,
        is_active: index === 0,
        is_player: item.type === 'player',
        monster_reference_id: item.type === 'creature' ? (item.source_id ?? null) : null,
        status_condition: null,
      })));

    if (!error) {
      router.push('/dm-dashboard');
    } else {
      alert(`Encounter deployment aborted: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-stone-950 text-amber-500/60 font-mono text-xs flex items-center justify-center tracking-widest">
        LOADING CORE BATTLE DECK SYSTEM REGISTRIES...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-200 p-4 md:p-8 font-sans selection:bg-amber-500/20">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="border-b border-stone-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-black font-mono tracking-widest text-amber-500 uppercase">
              ENCOUNTER STAGING SYSTEM
            </h1>
            <p className="text-[10px] text-stone-500 font-mono tracking-wider mt-0.5">
              STAGE PARTY MEMBERS AND ENEMY SQUADS PRIOR TO ENGAGING COMBAT LOGS
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={navigateToDedicatedPlayerCreator}
              className="text-[10px] font-mono font-bold border border-stone-850 hover:border-amber-500 px-3 py-2 rounded-xl text-stone-300 bg-stone-900/40 hover:text-stone-100 transition uppercase tracking-wider"
            >
              🛡️ Manage Players Page
            </button>
            <button
              onClick={navigateToDedicatedCreatureCreator}
              className="text-[10px] font-mono font-bold border border-stone-850 hover:border-amber-500 px-3 py-2 rounded-xl text-stone-300 bg-stone-900/40 hover:text-stone-100 transition uppercase tracking-wider"
            >
              👾 Manage Creatures Page
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          <div className="lg:col-span-4 space-y-6">

            {/* REGISTERED PARTY ASSETS */}
            <div className="bg-stone-900/20 border border-stone-900 p-4 rounded-2xl space-y-3">
              <span className="text-[10px] font-mono font-black text-amber-500/70 tracking-widest block uppercase">
                Active Player Roster Repository
              </span>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {storedPlayers.map(p => (
                  <div key={p.id} className="bg-stone-950/60 border border-stone-900 p-2.5 rounded-xl text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 truncate min-w-0">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="w-8 h-8 rounded-md object-cover border border-stone-800 flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-stone-900 border border-stone-800 text-[8px] flex items-center justify-center font-mono text-stone-600 flex-shrink-0">PL</div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-stone-300 truncate uppercase tracking-wide block">{p.name}</span>
                          {p.character_class && (
                            <span className="text-[9px] font-mono text-stone-600 truncate block">{p.character_class}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => navigateToEditPlayer(p)}
                          title="Edit player"
                          className="bg-stone-900 hover:bg-stone-700 border border-stone-800 hover:border-stone-600 text-[10px] font-mono text-stone-400 hover:text-stone-100 px-2 py-1 rounded-md transition font-bold"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => addAssetToStagingQueue(p, 'player')}
                          className="bg-stone-900 hover:bg-amber-600 border border-stone-800 hover:border-amber-500 text-[10px] font-mono text-stone-400 hover:text-stone-950 px-2 py-1 rounded-md transition font-bold"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-1.5 pl-10 text-[9px] font-mono text-stone-500">
                      <span>HP: <strong className="text-emerald-500">{p.hp_max}</strong></span>
                      <span>AC: <strong className="text-stone-300">{p.ac}</strong></span>
                      <span>INIT: <strong className="text-amber-500">{p.initiative_bonus >= 0 ? '+' : ''}{p.initiative_bonus}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* REGISTERED BESTIARY CREATURE ASSETS */}
            <div className="bg-stone-900/20 border border-stone-900 p-4 rounded-2xl space-y-3">
              <span className="text-[10px] font-mono font-black text-stone-400 tracking-widest block uppercase">
                Cataloged Bestiary Monster Logs
              </span>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {storedCreatures.map(c => (
                  <div key={c.id} className="bg-stone-950/60 border border-stone-900 p-2.5 rounded-xl text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 truncate min-w-0">
                        {c.image_url ? (
                          <img src={c.image_url} alt="" className="w-8 h-8 rounded-md object-cover border border-stone-800 flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-stone-900 border border-stone-800 text-[8px] flex items-center justify-center font-mono text-stone-600 flex-shrink-0">CR</div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-stone-300 truncate uppercase tracking-wide block">{c.name}</span>
                          {c.creature_type && (
                            <span className="text-[9px] font-mono text-stone-600 truncate block">{c.creature_type}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => navigateToEditCreature(c)}
                          title="Edit creature"
                          className="bg-stone-900 hover:bg-stone-700 border border-stone-800 hover:border-stone-600 text-[10px] font-mono text-stone-400 hover:text-stone-100 px-2 py-1 rounded-md transition font-bold"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => addAssetToStagingQueue(c, 'creature')}
                          className="bg-stone-900 hover:bg-stone-200 border border-stone-800 hover:border-white text-[10px] font-mono text-stone-400 hover:text-stone-950 px-2 py-1 rounded-md transition font-bold"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-1.5 pl-10 text-[9px] font-mono text-stone-500">
                      <span>HP: <strong className="text-emerald-500">{c.hp_max}</strong></span>
                      <span>AC: <strong className="text-stone-300">{c.ac}</strong></span>
                      <span>INIT: <strong className="text-amber-500">{c.initiative_bonus >= 0 ? '+' : ''}{c.initiative_bonus}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* COLUMN 2: ACTIVE ENCOUNTER STAGING TRACKER */}
          <div className="lg:col-span-5 bg-stone-900/40 border border-stone-900 p-4 rounded-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-stone-900 pb-2">
              <span className="text-[10px] font-mono font-black text-stone-300 tracking-widest uppercase">
                Combat Queue Sandbox ({activeQueue.length})
              </span>
              {activeQueue.length > 0 && (
                <button
                  onClick={() => setActiveQueue([])}
                  className="text-[9px] font-mono text-stone-600 hover:text-red-400 uppercase transition"
                >
                  Clear Queue
                </button>
              )}
            </div>

            {activeQueue.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {activeQueue.map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between gap-3 bg-stone-950/40 ${item.type === 'player' ? 'border-amber-950/40' : 'border-stone-900'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-8 h-8 rounded-lg object-cover border border-stone-850" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-[9px] font-mono text-stone-600">N/A</div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-xs font-black uppercase tracking-wide truncate text-stone-200">{item.name}</h4>
                        <p className="text-[9px] font-mono text-stone-500">MAX POOL: {item.hp_max}HP | AC: {item.ac}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div>
                        <label className="block text-[8px] font-mono text-stone-600 uppercase text-right">Init Turn</label>
                        <input
                          type="number"
                          value={item.initiative}
                          onChange={(e) => updateStagingRoll(idx, parseInt(e.target.value) || 0)}
                          className="w-12 bg-stone-950 border border-stone-850 text-center py-1 text-xs font-mono font-bold rounded-md text-amber-500 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => removeStagingItem(idx)}
                        className="text-stone-700 hover:text-red-400 p-2 text-xs transition mt-3"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleCommitEncounterToLive}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-mono font-black text-xs py-3 rounded-xl uppercase tracking-widest transition shadow-lg shadow-amber-600/5 mt-4 block text-center"
                >
                  🚀 Inject & Deploy Live Encounter
                </button>
              </div>
            ) : (
              <div className="text-center py-24 border border-dashed border-stone-900 rounded-xl font-mono text-xs text-stone-600 uppercase tracking-wider">
                Select actors from lists or create tokens to populate combat tracking
              </div>
            )}
          </div>

          {/* COLUMN 3: QUICK INLINE TOKEN CREATOR */}
          <div className="lg:col-span-3 bg-stone-900/20 border border-stone-900 p-4 rounded-2xl space-y-4">
            <div className="flex border-b border-stone-900">
              <button
                type="button" onClick={() => setCreationTab('player')}
                className={`flex-1 pb-2 text-[10px] font-mono uppercase font-black tracking-wider transition ${creationTab === 'player' ? 'text-amber-500 border-b border-amber-500' : 'text-stone-600 hover:text-stone-400'}`}
              >
                + Quick Player
              </button>
              <button
                type="button" onClick={() => setCreationTab('creature')}
                className={`flex-1 pb-2 text-[10px] font-mono uppercase font-black tracking-wider transition ${creationTab === 'creature' ? 'text-stone-300 border-b border-stone-300' : 'text-stone-600 hover:text-stone-400'}`}
              >
                + Quick NPC
              </button>
            </div>

            <form onSubmit={handleQuickCreationSubmit} className="space-y-3">
              <div>
                <label className="block text-[9px] font-mono text-stone-500 uppercase tracking-wider mb-1">Entity Label Name</label>
                <input
                  type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Name..."
                  className="w-full bg-stone-950 border border-stone-850 px-2.5 py-1.5 text-xs rounded-lg text-stone-300 outline-none focus:border-stone-700" required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-mono text-stone-500 uppercase tracking-wider mb-1">Max HP</label>
                  <input
                    type="number" min="1" value={formHp} onChange={e => setFormHp(parseInt(e.target.value) || 1)}
                    className="w-full bg-stone-950 border border-stone-850 px-2.5 py-1.5 text-xs font-mono rounded-lg text-stone-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-stone-500 uppercase tracking-wider mb-1">Armor Class</label>
                  <input
                    type="number" min="0" value={formAc} onChange={e => setFormAc(parseInt(e.target.value) || 0)}
                    className="w-full bg-stone-950 border border-stone-850 px-2.5 py-1.5 text-xs font-mono rounded-lg text-stone-300 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono text-stone-500 uppercase tracking-wider mb-1">Initiative Mod</label>
                <input
                  type="number" value={formInitBonus} onChange={e => setFormInitBonus(parseInt(e.target.value) || 0)}
                  className="w-full bg-stone-950 border border-stone-850 px-2.5 py-1.5 text-xs font-mono rounded-lg text-stone-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono text-stone-500 uppercase tracking-wider mb-1">Visual Token Photo URL</label>
                <input
                  type="text" value={formImageUrl} onChange={e => setFormImageUrl(e.target.value)} placeholder="https://image-link.png"
                  className="w-full bg-stone-950 border border-stone-850 px-2.5 py-1.5 text-xs rounded-lg text-stone-400 outline-none focus:border-stone-700 font-mono text-[10px]"
                />
              </div>

              <button
                type="submit"
                className={`w-full text-[10px] font-mono font-black py-2 rounded-lg transition uppercase tracking-wider mt-2 ${creationTab === 'player' ? 'bg-amber-600 hover:bg-amber-500 text-stone-950' : 'bg-stone-800 hover:bg-stone-700 text-stone-200'}`}
              >
                Dump Direct To Queue
              </button>
            </form>
          </div>

        </div>
      </div>
    </main>
  );
}