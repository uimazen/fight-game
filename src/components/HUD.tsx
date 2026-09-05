import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Volume2, VolumeX, RotateCcw, Shield, Swords, Zap, Crosshair, HelpCircle, Coins, ShoppingBag } from 'lucide-react';

interface HUDProps {
  onVirtualAction?: (action: 'light' | 'heavy' | 'dash' | 'parry' | 'execute') => void;
}

export const HUD: React.FC<HUDProps> = ({ onVirtualAction }) => {
  const health = useGameStore((s) => s.health);
  const maxHealth = useGameStore((s) => s.maxHealth);
  const posture = useGameStore((s) => s.posture);
  const maxPosture = useGameStore((s) => s.maxPosture);
  const combo = useGameStore((s) => s.combo);
  const comboTimer = useGameStore((s) => s.comboTimer);
  const maxCombo = useGameStore((s) => s.maxCombo);
  const styleRank = useGameStore((s) => s.styleRank);
  const score = useGameStore((s) => s.score);
  const kills = useGameStore((s) => s.kills);
  const credits = useGameStore((s) => s.credits);
  const isShopOpen = useGameStore((s) => s.isShopOpen);
  const toggleShop = useGameStore((s) => s.toggleShop);
  const executionCinematic = useGameStore((s) => s.executionCinematic);
  const finishers = useGameStore((s) => s.finishers);
  const wave = useGameStore((s) => s.wave);
  const waveBannerText = useGameStore((s) => s.waveBannerText);
  const waveStatus = useGameStore((s) => s.waveStatus);
  const gameState = useGameStore((s) => s.gameState);
  const isMuted = useGameStore((s) => s.isMuted);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const restartGame = useGameStore((s) => s.restartGame);
  const startTutorial = useGameStore((s) => s.startTutorial);
  const isTutorialActive = useGameStore((s) => s.isTutorialActive);
  const canExecuteTarget = useGameStore((s) => s.canExecuteTarget);
  const activeBoss = useGameStore((s) => s.activeBoss);

  const comboMultiplier = combo <= 0 ? 1.0 : Math.min(3.0, 1.0 + Math.floor(combo / 5) * 0.25);
  const hitsToNextMultiplier = combo > 0 ? (5 - (combo % 5 === 0 ? 5 : combo % 5)) : 5;

  // 'R' key for instant restart
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') {
        restartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [restartGame]);

  const healthPct = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const posturePct = Math.max(0, Math.min(100, (posture / maxPosture) * 100));
  const comboTimerPct = Math.max(0, Math.min(100, (comboTimer / 3.5) * 100));

  const rankColors: { [key: string]: { text: string; bg: string; glow: string } } = {
    D: { text: 'text-slate-300', bg: 'bg-slate-700', glow: 'shadow-slate-500/50' },
    C: { text: 'text-blue-400', bg: 'bg-blue-600', glow: 'shadow-blue-500/50' },
    B: { text: 'text-emerald-400', bg: 'bg-emerald-600', glow: 'shadow-emerald-500/50' },
    A: { text: 'text-amber-400', bg: 'bg-amber-600', glow: 'shadow-amber-500/50' },
    S: { text: 'text-rose-400', bg: 'bg-rose-600', glow: 'shadow-rose-500/50' },
    SSS: { text: 'text-fuchsia-300', bg: 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400', glow: 'shadow-fuchsia-500/80' },
  };

  const rankStyle = rankColors[styleRank] || rankColors.D;

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 md:p-6 overflow-hidden font-['Rajdhani']">
      {/* 1. TOP HEADER BAR: PLAYER BARS, WAVE, SCORE */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Player Status & Posture Gauge */}
        <div className="flex flex-col gap-2 w-72 md:w-88">
          <div className="flex items-center justify-between text-xs tracking-widest font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-400 font-['Chakra_Petch']">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
              PILOT // V-01
            </span>
            <span className="font-mono text-slate-300">{Math.round(health)} / {maxHealth} HP</span>
          </div>

          {/* Health Bar */}
          <div className="relative w-full h-4 bg-slate-950/90 rounded-sm overflow-hidden border border-slate-800 shadow-[0_0_15px_rgba(14,165,233,0.2)]">
            <div
              className={`h-full transition-all duration-100 ${
                health < 30 ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-cyan-500 to-sky-400'
              }`}
              style={{ width: `${healthPct}%` }}
            />
          </div>

          {/* Posture Meter */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 tracking-wider">
              <span>POSTURE</span>
              <span>{Math.round(posture)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-950/80 rounded-sm overflow-hidden border border-slate-800">
              <div
                className="h-full bg-amber-400 transition-all duration-75"
                style={{ width: `${posturePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center: Wave & Score Tracker */}
        <div className="flex flex-col items-center">
          <div className="px-4 py-1 rounded bg-slate-900/80 border border-slate-800 backdrop-blur-sm text-center shadow-lg">
            <div className="text-[11px] font-bold tracking-widest text-slate-400">ARENA SURVIVAL</div>
            <div className="text-xl md:text-2xl font-black tracking-wider text-white font-['Chakra_Petch']">
              WAVE <span className="text-cyan-400">{wave}</span>
            </div>
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs tracking-wider font-semibold text-slate-400">
            <span>SCORE: <span className="text-white font-mono">{score.toLocaleString()}</span></span>
            <span>•</span>
            <span>KILLS: <span className="text-cyan-400 font-mono">{kills}</span></span>
          </div>
        </div>

        {/* Right: Currency, Arsenal Shop, Audio Mute, Tutorial & Restart Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Total Coins / Cyber Credits Badge */}
          <div
            id="hud-credits-display"
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-amber-950/60 border border-amber-500/50 backdrop-blur-sm shadow-[0_0_15px_rgba(245,158,11,0.25)] text-amber-200"
            title="Total Cyber Credits - Earned by kills, combos, and wave completions"
          >
            <Coins size={18} className="text-amber-400 animate-pulse" />
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">CREDITS</span>
              <span className="text-sm md:text-base font-black font-mono tracking-wider text-amber-200">
                {credits.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Arsenal Shop Button */}
          <button
            id="hud-shop-btn"
            onClick={toggleShop}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold font-['Chakra_Petch'] tracking-wider transition shadow active:scale-95 ${
              isShopOpen
                ? 'bg-amber-950/90 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                : 'bg-cyan-950/90 hover:bg-cyan-900 border-cyan-400/80 text-cyan-300 hover:text-white shadow-[0_0_15px_rgba(6,182,212,0.35)]'
            }`}
            title="Open Cybernetic Arsenal & Weapon Forge (Hotkey: B)"
          >
            <ShoppingBag size={15} className="text-cyan-400" />
            <span className="font-bold tracking-widest">SHOP [B]</span>
          </button>

          <button
            id="hud-tutorial-btn"
            onClick={startTutorial}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold font-['Chakra_Petch'] tracking-wider transition shadow ${
              isTutorialActive
                ? 'bg-cyan-950/90 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.5)]'
                : 'bg-slate-900/90 hover:bg-slate-800 border-cyan-700/60 text-cyan-300 hover:text-white'
            }`}
            title="Open Combat Tutorial & Voice Briefing"
          >
            <HelpCircle size={15} />
            <span className="hidden sm:inline">TRAINING BRIEFING</span>
            <span className="sm:hidden">GUIDE</span>
          </button>

          <button
            id="mute-button"
            onClick={toggleMute}
            className="p-2 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition shadow"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            id="restart-button"
            onClick={restartGame}
            className="p-2 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition shadow"
            title="Restart Run (R)"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Boss Encounter HUD Banner */}
      {activeBoss && (
        <div className="w-full max-w-xl mx-auto -mt-2 mb-2 pointer-events-none flex flex-col gap-1 items-center animate-in fade-in slide-in-from-top duration-300">
          <div className="flex justify-between w-full text-xs font-black font-['Chakra_Petch'] tracking-widest text-red-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
              BOSS // {activeBoss.name.toUpperCase()}
            </span>
            <span className="font-mono text-red-300">
              {Math.round(activeBoss.health)} / {activeBoss.maxHealth} HP (PHASE {activeBoss.phase})
            </span>
          </div>

          {/* Health Bar */}
          <div className="w-full h-3.5 bg-slate-950/90 border border-red-800/80 rounded-sm overflow-hidden shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 transition-all duration-75"
              style={{ width: `${Math.max(0, Math.min(100, (activeBoss.health / activeBoss.maxHealth) * 100))}%` }}
            />
          </div>

          {/* Stagger / Posture Gauge */}
          <div className="w-full flex items-center justify-between text-[10px] font-bold text-amber-400/90 tracking-wider">
            <span>STAGGER VULNERABILITY</span>
            <span>{Math.round(Math.min(100, (activeBoss.posture / activeBoss.maxPosture) * 100))}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-950/80 border border-slate-800 rounded-sm overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-75"
              style={{ width: `${Math.min(100, (activeBoss.posture / activeBoss.maxPosture) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Cinematic Anamorphic Letterboxing Overlay during Finisher Execution */}
      {executionCinematic.active && (
        <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between">
          <div className="w-full h-12 md:h-16 bg-black/90 border-b border-cyan-500/30 flex items-center justify-between px-6 transition-all animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-['Chakra_Petch'] font-black tracking-widest text-white text-xs md:text-sm drop-shadow-[0_0_10px_#ef4444]">
                FATAL EXECUTION // {finishers[executionCinematic.finisherId]?.name?.toUpperCase() || 'CINEMATIC FINISHER'}
              </span>
            </div>
            <div className="text-[11px] tracking-widest font-mono text-cyan-400 uppercase hidden sm:block">
              ANAMORPHIC CINEMATIC PROTOCOL
            </div>
          </div>

          <div className="w-full h-12 md:h-16 bg-black/90 border-t border-cyan-500/30 flex items-center justify-between px-6 transition-all animate-in slide-in-from-bottom duration-200">
            <div className="text-[11px] tracking-widest font-mono text-slate-400 uppercase">
              SLOW-MOTION EXECUTION • TIME DILATION 28%
            </div>
            <div className="text-[11px] tracking-widest font-mono text-red-400 font-bold uppercase animate-pulse">
              LETHAL STRIKE
            </div>
          </div>
        </div>
      )}

      {/* 2. CENTER SCREEN BANNER (WAVE CLEARED / INCOMING) */}
      {waveBannerText && (
        <div className="self-center my-auto transition-all animate-in fade-in zoom-in duration-300 text-center pointer-events-auto">
          <div className="text-3xl md:text-5xl font-black tracking-widest text-white font-['Chakra_Petch'] drop-shadow-[0_0_25px_rgba(56,189,248,0.7)]">
            {waveBannerText}
          </div>
          {waveStatus === 'cleared' ? (
            <button
              onClick={toggleShop}
              className="mt-3 px-6 py-2 rounded bg-amber-600/90 hover:bg-amber-500 border border-amber-300 text-white font-black tracking-widest font-['Chakra_Petch'] text-sm shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse active:scale-95"
            >
              PRESS [B] OR CLICK HERE TO UPGRADE ARSENAL!
            </button>
          ) : (
            <div className="text-xs md:text-sm font-semibold tracking-widest text-cyan-300 uppercase mt-1">
              ARCADE COMBAT PROTOCOL ACTIVE
            </div>
          )}
        </div>
      )}

      {/* Execution Prompt in center if target poised broken */}
      {canExecuteTarget && gameState === 'playing' && (
        <div className="self-center my-auto animate-bounce bg-red-600/90 text-white font-black px-6 py-2 rounded-lg border-2 border-red-400 shadow-[0_0_30px_#ef4444] text-lg tracking-widest font-['Chakra_Petch']">
          PRESS [E] FOR FATAL FINISHER!
        </div>
      )}

      {/* 3. BOTTOM SECTION: COMBO DISPLAY & CONTROLS HELPER */}
      <div className="flex items-end justify-between w-full">
        {/* Left: Arcade Combo & Style Gauge */}
        <div className="flex items-end gap-3">
          {combo > 0 ? (
            <div className="flex flex-col">
              {/* Combo Multiplier UI Badge */}
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-xs font-black font-['Chakra_Petch'] tracking-wider shadow-md transition-all ${
                    comboMultiplier >= 3.0
                      ? 'bg-fuchsia-950/90 border-fuchsia-400 text-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.6)] animate-pulse'
                      : comboMultiplier >= 2.0
                      ? 'bg-rose-950/90 border-rose-400 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                      : comboMultiplier >= 1.5
                      ? 'bg-amber-950/90 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                      : 'bg-cyan-950/90 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                  }`}
                >
                  <Zap size={13} className="animate-bounce" />
                  <span>x{comboMultiplier.toFixed(2)} MULTIPLIER</span>
                </div>

                {comboMultiplier < 3.0 && (
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                    {hitsToNextMultiplier} HITS TO NEXT TIER
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-6xl font-black font-['Chakra_Petch'] italic text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                  {combo}
                </span>
                <span className="text-sm md:text-base font-bold tracking-widest text-cyan-400 uppercase">
                  HITS COMBO
                </span>
              </div>

              {/* Combo Decay Bar & Grace Pause Status */}
              <div className="flex flex-col gap-0.5 mt-1">
                <div className="w-44 h-2 bg-slate-950/90 rounded overflow-hidden border border-slate-700/80">
                  <div
                    className={`h-full transition-all duration-75 ${
                      comboTimer < 1.2 ? 'bg-red-500 animate-pulse' : 'bg-cyan-400'
                    }`}
                    style={{ width: `${comboTimerPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono tracking-wider font-bold">
                  {comboTimer < 1.2 ? (
                    <span className="text-red-400 animate-pulse">PAUSE: RESETTING IN {comboTimer.toFixed(1)}s</span>
                  ) : (
                    <span className="text-slate-400">STREAK ACTIVE • {comboTimer.toFixed(1)}s</span>
                  )}
                  <span className="text-amber-400 font-black font-['Chakra_Petch']">MAX {maxCombo}x</span>
                </div>
              </div>

              {/* Style Rank Badge */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 tracking-wider">STYLE:</span>
                <span
                  className={`px-3 py-0.5 rounded text-base md:text-lg font-black font-['Chakra_Petch'] ${rankStyle.text} ${rankStyle.bg} shadow-lg ${rankStyle.glow} border border-white/20`}
                >
                  {styleRank}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/80 text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
                  MUSIC: {combo >= 20 ? 'OVERDRIVE' : combo >= 14 ? 'LEAD GUITAR' : combo >= 7 ? 'SYNTH ARPS' : combo >= 3 ? 'COMBAT BEAT' : 'SUB-BASS'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs tracking-wider text-slate-400 font-semibold">
              COMBAT STANCE // READY
            </div>
          )}
        </div>

        {/* Center / Right: Desktop Key Reference */}
        <div className="hidden md:flex flex-wrap items-center gap-2 bg-slate-950/80 border border-slate-800/80 px-4 py-2 rounded-lg backdrop-blur-sm text-xs text-slate-300">
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[11px] text-cyan-300">WASD</kbd> Move</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[11px] text-cyan-300">LMB</kbd> 3-Hit Combo</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[11px] text-orange-400">RMB</kbd> Guard Breaker</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[11px] text-sky-400">SPACE</kbd> Dash (I-Frames)</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[11px] text-amber-300">F</kbd> Timed Parry</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[11px] text-red-400">E</kbd> Finisher</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[11px] text-amber-400">B</kbd> Arsenal Shop</span>
        </div>

        {/* Mobile / Touch Action Controls */}
        <div className="flex md:hidden items-center gap-2 pointer-events-auto">
          <button
            onClick={() => onVirtualAction?.('light')}
            className="w-12 h-12 rounded-full bg-cyan-600/80 active:bg-cyan-500 border border-cyan-400 text-white flex items-center justify-center font-black shadow-lg"
            title="Light Attack"
          >
            <Swords size={20} />
          </button>
          <button
            onClick={() => onVirtualAction?.('heavy')}
            className="w-12 h-12 rounded-full bg-orange-600/80 active:bg-orange-500 border border-orange-400 text-white flex items-center justify-center font-black shadow-lg"
            title="Guard Breaker"
          >
            <Zap size={20} />
          </button>
          <button
            onClick={() => onVirtualAction?.('parry')}
            className="w-11 h-11 rounded-full bg-amber-600/80 active:bg-amber-500 border border-amber-400 text-white flex items-center justify-center font-black shadow-lg"
            title="Parry"
          >
            <Shield size={18} />
          </button>
          <button
            onClick={() => onVirtualAction?.('execute')}
            className="w-11 h-11 rounded-full bg-red-600/80 active:bg-red-500 border border-red-400 text-white flex items-center justify-center font-black shadow-lg"
            title="Fatal Finisher"
          >
            <Crosshair size={18} />
          </button>
          <button
            onClick={toggleShop}
            className="w-11 h-11 rounded-full bg-amber-600/80 active:bg-amber-500 border border-amber-400 text-white flex items-center justify-center font-black shadow-lg"
            title="Arsenal Shop"
          >
            <ShoppingBag size={18} />
          </button>
        </div>
      </div>

      {/* 4. GAME OVER MODAL */}
      {gameState === 'game_over' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 pointer-events-auto animate-in fade-in duration-300">
          <div className="text-red-500 font-black text-5xl md:text-7xl tracking-widest font-['Chakra_Petch'] drop-shadow-[0_0_30px_#ef4444]">
            DEFEATED
          </div>
          <div className="text-slate-400 text-sm md:text-base font-semibold tracking-wider mt-2">
            YOUR COMBAT PROTOCOL TERMINATED AT WAVE {wave}
          </div>

          {/* Stats Box */}
          <div className="grid grid-cols-3 gap-4 my-6 bg-slate-900/90 border border-slate-800 p-4 rounded-lg w-full max-w-md text-center">
            <div>
              <div className="text-xs text-slate-400 font-bold">TOTAL SCORE</div>
              <div className="text-xl font-bold font-mono text-white">{score.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-bold">KILLS</div>
              <div className="text-xl font-bold font-mono text-cyan-400">{kills}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-bold">MAX COMBO</div>
              <div className="text-xl font-bold font-mono text-amber-400">{maxCombo}x</div>
            </div>
          </div>

          <button
            id="retry-game-button"
            onClick={restartGame}
            className="px-8 py-3 rounded bg-red-600 hover:bg-red-500 text-white font-black tracking-widest font-['Chakra_Petch'] text-lg shadow-[0_0_20px_#ef4444] transition transform hover:scale-105 active:scale-95"
          >
            RESTART MISSION [R]
          </button>
        </div>
      )}
    </div>
  );
};
