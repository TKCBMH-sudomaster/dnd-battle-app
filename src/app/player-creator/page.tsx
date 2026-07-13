'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function PlayerCreator() {
  const router = useRouter();
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [characterClass, setCharacterClass] = useState('');
  const [hpMax, setHpMax] = useState<number | ''>('');
  const [ac, setAc] = useState<number | ''>('');
  const [initiativeBonus, setInitiativeBonus] = useState<number | ''>('');
  const [imageUrl, setImageUrl] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const target = localStorage.getItem('edit_player_target');
    if (target) {
      try {
        const player = JSON.parse(target);
        setEditingPlayerId(player.id);
        setName(player.name || '');
        setCharacterClass(player.character_class || '');
        setHpMax(player.hp_max ?? '');
        setAc(player.ac ?? '');
        setInitiativeBonus(player.initiative_bonus ?? '');
        setImageUrl(player.image_url || '');
      } catch (err) {
        console.error('Failed to parse staging player update payload:', err);
      }
    }
  }, []);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    try {
      setUploading(true);
      setMessage(null);
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `tokens/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('player-tokens')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('player-tokens')
        .getPublicUrl(filePath);

      if (data?.publicUrl) {
        setImageUrl(data.publicUrl);
        setMessage({ type: 'success', text: 'Image uploaded successfully to database!' });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: `Upload failed: ${err.message}` });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!name.trim() || !characterClass.trim()) {
      setMessage({ type: 'error', text: 'Name and Character Class are required.' });
      setLoading(false);
      return;
    }

    const payload = {
      name: name.trim(),
      character_class: characterClass.trim(),
      hp_max: Number(hpMax) || 1,
      ac: Number(ac) || 0,
      initiative_bonus: Number(initiativeBonus) || 0,
      image_url: imageUrl.trim() || null,
    };

    try {
      if (editingPlayerId) {
        const { error } = await supabase
          .schema('dnd')
          .from('players')
          .update(payload)
          .eq('id', editingPlayerId);

        if (error) throw error;
        localStorage.removeItem('edit_player_target');
        setMessage({ type: 'success', text: `Character "${name}" evolved successfully!` });
      } else {
        const { error } = await supabase
          .schema('dnd')
          .from('players')
          .insert([payload]);

        if (error) throw error;
        setMessage({ type: 'success', text: `Character "${name}" forged successfully!` });
      }

      setTimeout(() => {
        router.push('/encounter-setup');
      }, 800);

    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to save character to database.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    localStorage.removeItem('edit_player_target');
    router.push('/encounter-setup');
  };

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 p-6 md:p-8 font-sans select-none selection:bg-amber-500/20">
      <div className="max-w-xl mx-auto space-y-6">
        
        <div className="border-b border-stone-900 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black font-mono uppercase tracking-widest text-amber-500">
              {editingPlayerId ? 'MODIFY CHARACTER NODE' : 'PLAYER CHARACTER TERMINAL'}
            </h1>
            <p className="text-[10px] text-stone-500 font-mono tracking-wider mt-0.5">
              {editingPlayerId ? 'ALTER CORE METRICS OR TRIGGER CHARACTER TIER UPDATES' : 'REGISTER PARTY MEMBERS TO THE PERMANENT BLUEPRINT LOG'}
            </p>
          </div>
          <button 
            type="button"
            onClick={handleCancel}
            className="text-[10px] font-mono border border-stone-850 hover:border-amber-500 px-3 py-1.5 rounded-xl text-stone-400 hover:text-stone-100 uppercase tracking-wider transition"
          >
            Cancel & Return
          </button>
        </div>

        {message && (
          <div className={`p-3 rounded-xl font-mono text-xs uppercase border ${
            message.type === 'success' 
              ? 'bg-stone-900/40 border-emerald-900 text-emerald-400' 
              : 'bg-stone-900/40 border-red-900 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-stone-900/40 border border-stone-900 p-6 rounded-2xl space-y-5 shadow-xl">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">Character Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Gimli"
                className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500 rounded-xl p-2.5 text-sm text-stone-200 outline-none transition"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">Character Class</label>
              <input
                type="text"
                value={characterClass}
                onChange={(e) => setCharacterClass(e.target.value)}
                placeholder="e.g., Fighter, Cleric"
                className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500 rounded-xl p-2.5 text-sm text-stone-200 outline-none transition"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">Max HP</label>
              <input
                type="number"
                value={hpMax}
                onChange={handleNumberChange(setHpMax)}
                placeholder="e.g. 10"
                className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500 rounded-xl p-2.5 text-sm text-stone-200 font-mono outline-none transition"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">Armor Class (AC)</label>
              <input
                type="number"
                value={ac}
                onChange={handleNumberChange(setAc)}
                placeholder="e.g. 10"
                className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500 rounded-xl p-2.5 text-sm text-stone-200 font-mono outline-none transition"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">Init Modifier</label>
              <input
                type="number"
                value={initiativeBonus}
                onChange={handleNumberChange(setInitiativeBonus)}
                placeholder="e.g. 2"
                className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500 rounded-xl p-2.5 text-sm text-stone-200 font-mono outline-none transition"
                required
              />
            </div>
          </div>

          <div className="space-y-2 border-t border-stone-900 pt-4">
            <label className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">Token Image Asset</label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <label className="flex-1 flex flex-col justify-center items-center px-4 py-3 bg-stone-950 border border-stone-850 hover:border-amber-500 rounded-xl cursor-pointer transition font-mono text-xs text-stone-400 text-center">
                <span>{uploading ? 'TRANSFUSING FILE VIA STORAGE...' : '📂 Choose Token File'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {imageUrl && (
                <div className="flex items-center gap-2 bg-stone-950 border border-stone-850 p-2 rounded-xl max-w-xs truncate">
                  <div className="h-6 w-6 bg-cover bg-center rounded-lg border border-stone-850 shrink-0" style={{ backgroundImage: `url(${imageUrl})` }} />
                  <span className="text-[9px] font-mono text-stone-400 truncate">{imageUrl}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || uploading}
              className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-mono font-black text-xs py-3 rounded-xl uppercase tracking-widest transition disabled:opacity-50"
            >
              {loading ? 'Transmitting Data...' : editingPlayerId ? '💾 Save Character Changes' : '💾 Save Character Blueprint'}
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}