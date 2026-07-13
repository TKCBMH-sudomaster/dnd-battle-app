'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function CreatorFactory() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [hpMax, setHpMax] = useState<number | ''>('');
  const [ac, setAc] = useState<number | ''>('');
  const [initBonus, setInitBonus] = useState<number | ''>('');
  const [imageUrl, setImageUrl] = useState('');
  
  const [creatureType, setCreatureType] = useState('');
  const [alignment, setAlignment] = useState('');
  const [speed, setSpeed] = useState('');
  
  const [str, setStr] = useState<number | ''>('');
  const [dex, setDex] = useState<number | ''>('');
  const [con, setCon] = useState<number | ''>('');
  const [int, setUsingInt] = useState<number | ''>('');
  const [wis, setWis] = useState<number | ''>('');
  const [cha, setCha] = useState<number | ''>('');

  const [savingThrows, setSavingThrows] = useState('');
  const [skills, setSkills] = useState('');
  const [vulnerabilities, setVulnerabilities] = useState('');
  const [resistances, setResistances] = useState('');
  const [immunities, setImmunities] = useState('');
  const [senses, setSenses] = useState('');
  const [languages, setLanguages] = useState('');

  const [traits, setTraits] = useState('');
  const [actions, setActions] = useState('');

  const getModifierValueString = (score: number | '') => {
    const numeric = typeof score === 'number' ? score : 10;
    const mod = Math.floor((numeric - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  // Field simply reflects whatever is typed, or stays empty — no default value ever gets forced back in.
  const handleNumberChange = (setter: (v: number | '') => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setter('');
      return;
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) setter(parsed);
  };

  useEffect(() => {
    const savedTarget = localStorage.getItem('edit_monster_target');
    if (savedTarget) {
      const m = JSON.parse(savedTarget);
      setEditingId(m.id);
      setName(m.name || '');
      setShortDesc(m.description || m.short_desc || m.short_description || '');
      setHpMax(m.hp_max ?? m.max_hp ?? m.hp ?? '');
      setAc(m.ac ?? '');
      setInitBonus(m.initiative_bonus ?? m.init_bonus ?? m.initiative ?? '');
      setImageUrl(m.image_url || '');
      setCreatureType(m.creature_type || '');
      setAlignment(m.alignment || '');
      setSpeed(m.speed || '');
      setStr(m.str ?? '');
      setDex(m.dex ?? '');
      setCon(m.con ?? '');
      setUsingInt(m.int ?? '');
      setWis(m.wis ?? '');
      setCha(m.cha ?? '');
      setSavingThrows(m.saving_throws || '');
      setSkills(m.skills || '');
      setVulnerabilities(m.vulnerabilities || '');
      setResistances(m.resistances || '');
      setImmunities(m.immunities || '');
      setSenses(m.senses || '');
      setLanguages(m.languages || '');
      setTraits(m.traits || '');
      setActions(m.actions || '');
      
      localStorage.removeItem('edit_monster_target');
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
        setStatusMessage('IMAGE READY: Photo attached successfully.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMonster = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage('');

    const payload = {
      name: name.trim(),
      description: shortDesc.trim(),
      hp_max: Number(hpMax) || 1,
      ac: Number(ac) || 0,
      initiative_bonus: Number(initBonus) || 0,
      image_url: imageUrl.trim() || null,
      creature_type: creatureType,
      alignment,
      speed,
      str: Number(str) || 10,
      dex: Number(dex) || 10,
      con: Number(con) || 10,
      int: Number(int) || 10,
      wis: Number(wis) || 10,
      cha: Number(cha) || 10,
      saving_throws: savingThrows,
      skills,
      vulnerabilities,
      resistances,
      immunities,
      senses,
      languages,
      traits,
      actions
    };

    try {
      const TABLE_TARGET = 'monsters'; 

      if (editingId) {
        let { error } = await supabase.schema('dnd').from(TABLE_TARGET).update(payload).eq('id', editingId);
        if (error) throw error;
        setStatusMessage('BLUEPRINT UPDATE COMPLETED.');
        setTimeout(() => router.push('/encounter-setup'), 800);
      } else {
        let { error } = await supabase.schema('dnd').from(TABLE_TARGET).insert([payload]);
        if (error) throw error;
        setStatusMessage('BLUEPRINT SAVED.');
        router.push('/encounter-setup');
      }
    } catch (err: any) {
      console.error("--- DATABASE TRANSACTION EXCEPTION ---");
      console.error("Raw Error Object:", err);
      console.error("Extracted Message:", err?.message || "No message attribute found");
      console.error("Postgres Error Code:", err?.code || "No PostgREST code found");
      console.error("Database Hint:", err?.hint || "None provided by engine");
      console.error("Detailed Context:", err?.details || "None provided by engine");
      
      const UI_Error_Msg = err?.message || JSON.stringify(err) || 'Unknown constraint violation';
      setStatusMessage(`DATABASE EXCEPTION: ${UI_Error_Msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 p-4 md:p-8 font-sans">
      <form onSubmit={handleSaveMonster} className="max-w-4xl mx-auto bg-stone-900 border border-stone-800 p-6 md:p-8 rounded-2xl shadow-xl space-y-6">
        
        <div>
          <h1 className="text-xl font-black font-serif uppercase tracking-wide text-amber-500">
            {editingId ? 'Modify Engine Blueprints' : 'Creature Foundry Forge'}
          </h1>
          <p className="text-xs text-stone-500 font-mono mt-0.5">Configure monster statistics and matrix details</p>
        </div>

        {statusMessage && (
          <div className="bg-stone-950 border border-stone-800/80 text-amber-400 font-mono text-[11px] p-3 rounded-lg text-center shadow-inner whitespace-pre-wrap break-all">
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1">Creature Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ancient Red Dragon" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-white bg-transparent outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1">Type / Size Block</label>
            <input type="text" value={creatureType} onChange={e => setCreatureType(e.target.value)} placeholder="e.g. Gargantuan Dragon" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-white bg-transparent outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1">Alignment</label>
            <input type="text" value={alignment} onChange={e => setAlignment(e.target.value)} placeholder="e.g. Chaotic Evil" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-white bg-transparent outline-none focus:border-amber-500" />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1">Short Narrative Summary / Description</label>
          <input type="text" value={shortDesc} onChange={e => setShortDesc(e.target.value)} placeholder="e.g. A terrifying legendary beast clad in magma-forged scales who rules the molten crags." className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-white bg-transparent outline-none focus:border-amber-500" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-stone-950/40 p-4 rounded-xl border border-stone-800/80">
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1">Max HP</label>
            <input type="number" required value={hpMax} onChange={handleNumberChange(setHpMax)} placeholder="e.g. 45" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-center text-white font-mono" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1">Armor Class</label>
            <input type="number" required value={ac} onChange={handleNumberChange(setAc)} placeholder="e.g. 15" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-center text-white font-mono" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1">Init Modifier</label>
            <input type="number" required value={initBonus} onChange={handleNumberChange(setInitBonus)} placeholder="e.g. 2" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-center text-white font-mono" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1">Movement Speed</label>
            <input type="text" value={speed} onChange={e => setSpeed(e.target.value)} placeholder="e.g. 40 ft., fly 80 ft." className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-white font-mono bg-transparent" />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-2 tracking-wider">Ability Score Allocations</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              ['STR', str, setStr], ['DEX', dex, setDex], ['CON', con, setCon],
              ['INT', int, setUsingInt], ['WIS', wis, setWis], ['CHA', cha, setCha]
            ].map(([lbl, val, setFn]: any) => (
              <div key={lbl} className="bg-stone-950 border border-stone-800 p-2.5 rounded-xl text-center relative">
                <span className="text-[10px] font-mono font-bold text-stone-500 block mb-0.5">{lbl}</span>
                <input
                  type="number"
                  value={val}
                  onChange={handleNumberChange(setFn)}
                  placeholder="10"
                  className="w-full bg-stone-900 border border-stone-800 rounded-lg py-1.5 text-center text-sm font-mono font-bold text-amber-400 outline-none"
                />
                <span className="text-[11px] font-mono block mt-1 font-bold text-stone-400 bg-stone-900/60 rounded py-0.5 border border-stone-800/40">
                  {getModifierValueString(val)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1">Saving Throws</label>
            <input type="text" value={savingThrows} onChange={e => setSavingThrows(e.target.value)} placeholder="e.g. Dex +6, Con +10" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-white bg-transparent" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1">Skill Proficiencies</label>
            <input type="text" value={skills} onChange={e => setSkills(e.target.value)} placeholder="e.g. Perception +12, Stealth +6" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-white bg-transparent" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1">Damage Vulnerabilities</label>
            <input type="text" value={vulnerabilities} onChange={e => setVulnerabilities(e.target.value)} placeholder="e.g. Cold" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-white bg-transparent" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1">Damage Resistances / Immunities</label>
            <input type="text" value={resistances} onChange={e => setResistances(e.target.value)} placeholder="e.g. Fire Immunity" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-white bg-transparent" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1">Senses Matrix</label>
            <input type="text" value={senses} onChange={e => setSenses(e.target.value)} placeholder="e.g. Blindsight 60 ft., Darkvision 120 ft." className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-white bg-transparent" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1">Languages Spoken</label>
            <input type="text" value={languages} onChange={e => setLanguages(e.target.value)} placeholder="e.g. Common, Draconic" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-white bg-transparent" />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1">Special Traits & Passive Abilities</label>
            <textarea value={traits} onChange={e => setTraits(e.target.value)} rows={3} placeholder="e.g. Magic Resistance. The creature has advantage on saving throws..." className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500 font-sans bg-transparent" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1">Combat Actions & Attacks</label>
            <textarea value={actions} onChange={e => setActions(e.target.value)} rows={4} placeholder="e.g. Multiattack. The dragon makes three attacks: one with its bite and two with its claws..." className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500 font-sans bg-transparent" />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-stone-400 font-mono block mb-1.5">Creature Portrait Graphic File</label>
          <div className="flex gap-3 items-center">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-sans text-xs font-black px-6 py-3 rounded-xl uppercase transition-all shadow-md tracking-wider">
              Add Photo
            </button>
            <span className="text-xs font-mono text-stone-500">
              {imageUrl ? '✅ Photo Asset Linked' : 'No local image file attached'}
            </span>
          </div>
          
          {imageUrl && (
            <div className="mt-3 flex items-center justify-between bg-stone-950/60 p-2 rounded-lg border border-stone-800/40 max-w-xs">
              <div className="w-14 h-14 rounded border border-stone-800 overflow-hidden bg-stone-900">
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <button type="button" onClick={() => setImageUrl('')} className="text-[10px] font-mono text-rose-400 hover:underline px-2 font-bold uppercase tracking-wider">
                Remove Photo
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2 border-t border-stone-800/60">
          {editingId && (
            <button type="button" onClick={() => router.push('/encounter-setup')} className="flex-1 bg-stone-950 hover:bg-stone-800 text-stone-400 border border-stone-800 py-3.5 rounded-xl text-xs uppercase font-bold transition-colors">
              Cancel
            </button>
          )}
          <button type="submit" disabled={saving} className="flex-[2] bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-black tracking-widest text-xs py-3.5 rounded-xl uppercase transition-all shadow-md">
            {saving ? 'FORGING SCHEMA ROW...' : editingId ? 'Update Blueprint Sheet' : 'Forge Compendium Card'}
          </button>
        </div>

      </form>
    </main>
  );
}