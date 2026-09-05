import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { UPGRADE_CONFIGS, INITIAL_WEAPONS, INITIAL_FINISHERS } from '../data/arsenal';
import { WeaponId, UpgradeId, FinisherId } from '../types';
import { Swords, ShieldAlert, Sparkles, X, Check, Lock, Zap, Award, Coins } from 'lucide-react';

export const ShopModal: React.FC = () => {
  const isShopOpen = useGameStore((s) => s.isShopOpen);
  const setShopOpen = useGameStore((s) => s.setShopOpen);
  const credits = useGameStore((s) => s.credits);
  const wave = useGameStore((s) => s.wave);
  const maxCombo = useGameStore((s) => s.maxCombo);

  const weapons = useGameStore((s) => s.weapons);
  const equippedWeapon = useGameStore((s) => s.equippedWeapon);
  const buyWeapon = useGameStore((s) => s.buyWeapon);
  const equipWeapon = useGameStore((s) => s.equipWeapon);

  const upgrades = useGameStore((s) => s.upgrades);
  const buyUpgrade = useGameStore((s) => s.buyUpgrade);

  const finishers = useGameStore((s) => s.finishers);
  const equippedFinisher = useGameStore((s) => s.equippedFinisher);
  const equipFinisher = useGameStore((s) => s.equipFinisher);

  const [activeTab, setActiveTab] = useState<'weapons' | 'upgrades' | 'finishers'>('weapons');

  // Handle ESC or B key to close shop
  React.useEffect(() => {
    if (!isShopOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyB') {
        e.preventDefault();
        setShopOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShopOpen, setShopOpen]);

  if (!isShopOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none font-['Rajdhani']">
      <div className="relative w-full max-w-4xl bg-slate-900/95 border border-cyan-500/40 rounded-lg shadow-[0_0_40px_rgba(6,182,212,0.25)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Swords size={22} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-wider text-white font-['Chakra_Petch']">
                ARSENAL & CYBER-FORGE
              </h2>
              <p className="text-xs text-slate-400 tracking-wide">
                EQUIP WEAPONS, UPGRADE CYBERNETICS & UNLOCK LETHAL FINISHERS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Currency Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/40 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Coins size={18} className="text-amber-400" />
              <span className="font-mono font-bold text-amber-300 text-sm md:text-base">
                {credits.toLocaleString()} CR
              </span>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShopOpen(false)}
              className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Close Arsenal (Esc / B)"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('weapons')}
            className={`flex items-center gap-2 px-5 py-2.5 font-['Chakra_Petch'] font-bold text-sm tracking-wider border-b-2 transition ${
              activeTab === 'weapons'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Swords size={16} />
            WEAPONS
          </button>

          <button
            onClick={() => setActiveTab('upgrades')}
            className={`flex items-center gap-2 px-5 py-2.5 font-['Chakra_Petch'] font-bold text-sm tracking-wider border-b-2 transition ${
              activeTab === 'upgrades'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap size={16} />
            UPGRADES
          </button>

          <button
            onClick={() => setActiveTab('finishers')}
            className={`flex items-center gap-2 px-5 py-2.5 font-['Chakra_Petch'] font-bold text-sm tracking-wider border-b-2 transition ${
              activeTab === 'finishers'
                ? 'border-red-400 text-red-300 bg-red-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award size={16} />
            FINISHERS ({Object.values(finishers).filter((f) => f.unlocked).length}/4)
          </button>
        </div>

        {/* TAB BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: WEAPONS */}
          {activeTab === 'weapons' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(INITIAL_WEAPONS) as WeaponId[]).map((wid) => {
                const w = weapons[wid] || INITIAL_WEAPONS[wid];
                const isEquipped = equippedWeapon === wid;
                const canAfford = credits >= w.cost;

                return (
                  <div
                    key={wid}
                    className={`p-4 rounded-lg border transition-all flex flex-col justify-between ${
                      isEquipped
                        ? 'bg-cyan-950/30 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                        : w.unlocked
                        ? 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                        : 'bg-slate-900/40 border-slate-800 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: w.bladeColor, boxShadow: `0 0 8px ${w.bladeColor}` }}
                            />
                            <h3 className="font-['Chakra_Petch'] font-black text-lg text-white tracking-wider">
                              {w.name}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{w.desc}</p>
                        </div>

                        {isEquipped ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider bg-cyan-500 text-slate-950 font-['Chakra_Petch']">
                            EQUIPPED
                          </span>
                        ) : w.unlocked ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 font-['Chakra_Petch']">
                            OWNED
                          </span>
                        ) : (
                          <span className="font-mono text-xs font-bold text-amber-400 flex items-center gap-1">
                            <Coins size={14} /> {w.cost} CR
                          </span>
                        )}
                      </div>

                      {/* Stat Bars */}
                      <div className="space-y-1.5 my-3 text-xs">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Damage Scale</span>
                          <span className="font-mono text-white">{w.damageMultiplier}x</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{ width: `${Math.min(100, (w.damageMultiplier / 1.8) * 100)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-slate-400">
                          <span>Poise Break / Stagger</span>
                          <span className="font-mono text-white">{w.poiseMultiplier}x</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${Math.min(100, (w.poiseMultiplier / 2.0) * 100)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-slate-400">
                          <span>Reach / Sweep Radius</span>
                          <span className="font-mono text-white">{w.rangeMultiplier}x</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 rounded-full"
                            style={{ width: `${Math.min(100, (w.rangeMultiplier / 1.6) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-3 border-t border-slate-800/80">
                      {isEquipped ? (
                        <button
                          disabled
                          className="w-full py-2 rounded text-xs font-bold font-['Chakra_Petch'] tracking-wider bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 opacity-80 cursor-default flex items-center justify-center gap-1.5"
                        >
                          <Check size={14} /> ACTIVE WEAPON
                        </button>
                      ) : w.unlocked ? (
                        <button
                          onClick={() => equipWeapon(wid)}
                          className="w-full py-2 rounded text-xs font-bold font-['Chakra_Petch'] tracking-wider bg-slate-700 hover:bg-cyan-600 text-white transition flex items-center justify-center gap-1.5 shadow"
                        >
                          <Swords size={14} /> EQUIP BLADE
                        </button>
                      ) : (
                        <button
                          onClick={() => buyWeapon(wid)}
                          disabled={!canAfford}
                          className={`w-full py-2 rounded text-xs font-bold font-['Chakra_Petch'] tracking-wider transition flex items-center justify-center gap-1.5 ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          <Coins size={14} /> UNLOCK FOR {w.cost} CR
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: UPGRADES */}
          {activeTab === 'upgrades' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(UPGRADE_CONFIGS) as UpgradeId[]).map((uid) => {
                const config = UPGRADE_CONFIGS[uid];
                const currentTier = upgrades[uid] || 0;
                const isMax = currentTier >= 5;
                const cost = Math.round(config.baseCost * Math.pow(config.costMultiplier, currentTier));
                const canAfford = credits >= cost;

                return (
                  <div
                    key={uid}
                    className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <h3 className="font-['Chakra_Petch'] font-bold text-base text-white tracking-wider">
                            {config.name}
                          </h3>
                          <p className="text-xs text-slate-400">{config.desc}</p>
                        </div>
                        <span className="font-mono text-xs text-cyan-400 font-bold">
                          TIER {currentTier} / 5
                        </span>
                      </div>

                      {/* Tier Pips */}
                      <div className="flex gap-1.5 my-3">
                        {[1, 2, 3, 4, 5].map((tier) => (
                          <div
                            key={tier}
                            className={`h-2 flex-1 rounded-sm transition-all ${
                              tier <= currentTier
                                ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                                : 'bg-slate-950 border border-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      {isMax ? (
                        <button
                          disabled
                          className="w-full py-2 rounded text-xs font-bold font-['Chakra_Petch'] tracking-wider bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 cursor-default flex items-center justify-center gap-1.5"
                        >
                          <Check size={14} /> MAXIMUM TIER REACHED
                        </button>
                      ) : (
                        <button
                          onClick={() => buyUpgrade(uid)}
                          disabled={!canAfford}
                          className={`w-full py-2 rounded text-xs font-bold font-['Chakra_Petch'] tracking-wider transition flex items-center justify-center gap-1.5 ${
                            canAfford
                              ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          <Coins size={14} /> UPGRADE ({cost} CR)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: FINISHERS */}
          {activeTab === 'finishers' && (
            <div className="space-y-3">
              <div className="p-3 rounded bg-red-950/30 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                <Sparkles size={16} className="text-red-400 shrink-0" />
                <span>
                  FINISHERS UNLOCK BY ADVANCING WAVES OR STACKING HUGE COMBOS! Trigger via [E] Execution when an enemy's posture bar fills and flashes red.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(INITIAL_FINISHERS) as FinisherId[]).map((fid) => {
                  const f = finishers[fid] || INITIAL_FINISHERS[fid];
                  const isEquipped = equippedFinisher === fid;
                  const isUnlocked = f.unlocked;

                  return (
                    <div
                      key={fid}
                      className={`p-4 rounded-lg border transition-all flex flex-col justify-between ${
                        isEquipped
                          ? 'bg-red-950/30 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
                          : isUnlocked
                          ? 'bg-slate-800/60 border-slate-700'
                          : 'bg-slate-950/60 border-slate-800 opacity-75'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: f.slashColor, boxShadow: `0 0 10px ${f.slashColor}` }}
                            />
                            <h3 className="font-['Chakra_Petch'] font-black text-lg text-white tracking-wider">
                              {f.name}
                            </h3>
                          </div>

                          {isEquipped ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider bg-red-500 text-white font-['Chakra_Petch']">
                              EQUIPPED
                            </span>
                          ) : isUnlocked ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-['Chakra_Petch']">
                              UNLOCKED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider bg-slate-800 border border-slate-700 text-slate-400 font-['Chakra_Petch'] flex items-center gap-1">
                              <Lock size={12} /> LOCKED
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 mb-3">{f.desc}</p>

                        {/* Unlock Condition / Progress */}
                        {!isUnlocked && (
                          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-xs mb-3 space-y-1">
                            <div className="text-amber-400 font-bold flex items-center gap-1">
                              <Lock size={13} /> REQUIREMENT:
                            </div>
                            <div className="text-slate-300">
                              Reach <span className="text-cyan-400 font-bold">Wave {f.requiredWave}</span> OR achieve a{' '}
                              <span className="text-rose-400 font-bold">{f.requiredCombo}x Combo</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono pt-1">
                              Your Stats: Wave {wave} • Max Combo {maxCombo}x
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      <div className="pt-3 border-t border-slate-800/80">
                        {isEquipped ? (
                          <button
                            disabled
                            className="w-full py-2 rounded text-xs font-bold font-['Chakra_Petch'] tracking-wider bg-red-950/60 border border-red-500/40 text-red-300 opacity-80 cursor-default flex items-center justify-center gap-1.5"
                          >
                            <Check size={14} /> ACTIVE CINEMATIC FINISHER
                          </button>
                        ) : isUnlocked ? (
                          <button
                            onClick={() => equipFinisher(fid)}
                            className="w-full py-2 rounded text-xs font-bold font-['Chakra_Petch'] tracking-wider bg-rose-600 hover:bg-rose-500 text-white transition flex items-center justify-center gap-1.5 shadow"
                          >
                            <Award size={14} /> EQUIP FINISHER
                          </button>
                        ) : (
                          <button
                            disabled
                            className="w-full py-2 rounded text-xs font-bold font-['Chakra_Petch'] tracking-wider bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed flex items-center justify-center gap-1.5"
                          >
                            <Lock size={14} /> LOCKED BY PROGRESSION
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono">[B]</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono">[ESC]</kbd> to close</span>
          <button
            onClick={() => setShopOpen(false)}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-['Chakra_Petch'] font-bold text-xs tracking-wider transition"
          >
            RETURN TO ARENA
          </button>
        </div>
      </div>
    </div>
  );
};
