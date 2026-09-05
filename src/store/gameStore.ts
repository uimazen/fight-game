import { create } from 'zustand';
import { soundEngine } from '../audio/soundEngine';
import { 
  FloatingText, 
  ShockwaveData, 
  WeaponId, 
  WeaponDef, 
  UpgradeId, 
  UpgradeDef, 
  FinisherId, 
  FinisherDef, 
  ExecutionCinematicState,
  EnemyType
} from '../types';
import { INITIAL_WEAPONS, UPGRADE_CONFIGS, INITIAL_FINISHERS } from '../data/arsenal';

export type StyleRank = 'D' | 'C' | 'B' | 'A' | 'S' | 'SSS';

export interface CombatFeedback {
  shakeIntensity: number;
  shakeDuration: number;
  fovWarp: number;
  hitstopRemaining: number;
  timeDilation: number;
  chromaticFlash: number;
}

interface GameState {
  // Player Stats
  health: number;
  maxHealth: number;
  posture: number; // 0 (calm) to 100 (broken)
  maxPosture: number;
  iFrames: boolean;
  isParrying: boolean;
  parryWindowActive: boolean;
  score: number;
  kills: number;
  combo: number;
  comboTimer: number;
  maxCombo: number;
  styleRank: StyleRank;

  // Currency & Progression
  credits: number;
  weapons: Record<WeaponId, WeaponDef>;
  equippedWeapon: WeaponId;
  upgrades: Record<UpgradeId, number>; // current tier 0..5
  finishers: Record<FinisherId, FinisherDef>;
  equippedFinisher: FinisherId;
  unlockedFinisherNotification: string | null;
  isShopOpen: boolean;

  // Cinematic Finisher Execution State
  executionCinematic: ExecutionCinematicState;

  // Wave & Progress
  wave: number;
  waveStatus: 'active' | 'cleared' | 'spawning';
  waveBannerText: string | null;
  gameState: 'playing' | 'game_over' | 'victory';

  // Target Lock / Focus
  targetEnemyId: string | null;
  canExecuteTarget: boolean;

  // Screen & Visual Juice
  feedback: CombatFeedback;
  floatingTexts: FloatingText[];
  shockwaves: ShockwaveData[];

  // Sound settings
  isMuted: boolean;

  // Tutorial & Training Mode
  isTutorialActive: boolean;
  tutorialStep: number;
  tutorialSlowMo: boolean;

  // Actions
  takeDamage: (amount: number, poiseDamage: number, isUnblockable?: boolean) => boolean; // returns true if blocked/parried
  parrySuccess: (enemyPos: [number, number, number]) => void;
  registerHitLanded: (
    enemyId: string, 
    damage: number, 
    postureDamage: number, 
    pos: [number, number, number], 
    attackType: 'light_1' | 'light_2' | 'light_3' | 'heavy' | 'execution'
  ) => void;
  triggerExecution: (enemyId: string, pos: [number, number, number]) => void;
  addFloatingText: (text: string, pos: [number, number, number], color?: string, scale?: number) => void;
  addShockwave: (pos: [number, number, number], color?: string, maxRadius?: number, duration?: number) => void;
  triggerShake: (intensity: number, duration?: number) => void;
  triggerFovPunch: (fov?: number) => void;
  triggerHitstop: (durationMs: number) => void;
  setParrying: (parrying: boolean) => void;
  setIFrames: (active: boolean) => void;
  setTargetEnemy: (id: string | null, canExecute?: boolean) => void;
  updateComboTimer: (delta: number) => void;
  updateFeedback: (delta: number) => void;
  enemyKilled: () => void;
  startNextWave: () => void;
  setWaveCleared: () => void;
  restartGame: () => void;
  toggleMute: () => void;

  // Shop & Upgrades actions
  addCredits: (baseAmount: number) => void;
  buyWeapon: (id: WeaponId) => boolean;
  equipWeapon: (id: WeaponId) => void;
  buyUpgrade: (id: UpgradeId) => boolean;
  equipFinisher: (id: FinisherId) => void;
  checkFinisherUnlocks: () => void;
  clearFinisherNotification: () => void;
  toggleShop: () => void;
  setShopOpen: (open: boolean) => void;

  // Cinematic Execution Lifecycle
  startCinematicExecution: (
    enemyId: string, 
    enemyType: EnemyType, 
    playerPos: [number, number, number], 
    targetPos: [number, number, number]
  ) => void;
  updateExecutionCinematic: (delta: number) => void;
  endCinematicExecution: () => void;

  // Tutorial controls
  startTutorial: () => void;
  nextTutorialStep: () => void;
  prevTutorialStep: () => void;
  exitTutorial: () => void;
  setTutorialStep: (step: number) => void;
  toggleTutorialSlowMo: () => void;
}

const getRank = (combo: number): StyleRank => {
  if (combo >= 25) return 'SSS';
  if (combo >= 18) return 'S';
  if (combo >= 12) return 'A';
  if (combo >= 7) return 'B';
  if (combo >= 3) return 'C';
  return 'D';
};

export const useGameStore = create<GameState>((set, get) => ({
  health: 100,
  maxHealth: 100,
  posture: 0,
  maxPosture: 100,
  iFrames: false,
  isParrying: false,
  parryWindowActive: false,
  score: 0,
  kills: 0,
  combo: 0,
  comboTimer: 0,
  maxCombo: 0,
  styleRank: 'D',

  // Currency & Progression
  credits: 400,
  weapons: { ...INITIAL_WEAPONS },
  equippedWeapon: 'katana',
  upgrades: {
    health: 0,
    posture: 0,
    damage: 0,
    parry_window: 0,
    dash: 0,
    credits: 0,
  },
  finishers: { ...INITIAL_FINISHERS },
  equippedFinisher: 'omni_slash',
  unlockedFinisherNotification: null,
  isShopOpen: false,

  // Cinematic Finisher Execution State
  executionCinematic: {
    active: false,
    finisherId: 'omni_slash',
    progress: 0,
    enemyId: null,
    enemyType: 'grunt',
    playerPos: [0, 0, 0],
    targetPos: [0, 0, 0],
    climaxTriggered: false,
  },

  wave: 1,
  waveStatus: 'active',
  waveBannerText: 'WAVE 1 // ENGAGE',
  gameState: 'playing',

  targetEnemyId: null,
  canExecuteTarget: false,

  feedback: {
    shakeIntensity: 0,
    shakeDuration: 0,
    fovWarp: 0,
    hitstopRemaining: 0,
    timeDilation: 1.0,
    chromaticFlash: 0,
  },
  floatingTexts: [],
  shockwaves: [],
  isMuted: false,

  isTutorialActive: false,
  tutorialStep: 0,
  tutorialSlowMo: true,

  takeDamage: (amount: number, poiseDamage: number, isUnblockable = false) => {
    const state = get();
    if (state.gameState !== 'playing') return false;

    // If in I-Frames (dodging), complete evasion!
    if (state.iFrames) {
      get().addFloatingText('EVADED', [0, 1.6, 0], '#38bdf8', 1.1);
      soundEngine.playWhoosh(1.4, true);
      return false;
    }

    // If actively in Parry window and attack is NOT unblockable: PERFECT DEFLECTION!
    if (state.parryWindowActive && !isUnblockable) {
      soundEngine.playParry();
      get().parrySuccess([0, 1.2, 0]);
      return true;
    }

    // Tutorial safety: prevent death during training so player can master moves safely
    const actualDamage = state.isTutorialActive ? Math.round(amount * 0.2) : amount;
    const minHp = state.isTutorialActive ? 30 : 0;
    const newHealth = Math.max(minHp, state.health - actualDamage);
    const newPosture = state.isTutorialActive 
      ? Math.min(60, state.posture + poiseDamage * 0.3)
      : Math.min(state.maxPosture, state.posture + poiseDamage);

    // Drop combo on taking hit
    soundEngine.playHit(isUnblockable ? 'heavy' : 'medium');
    get().triggerShake(isUnblockable ? 0.45 : 0.25, 0.25);
    get().triggerFovPunch(54);

    // Audio tension check
    if (newHealth <= 25 && newHealth > 0) {
      soundEngine.setLowHealth(true);
    }

    set((s) => ({
      health: newHealth,
      posture: newPosture,
      combo: 0,
      comboTimer: 0,
      styleRank: 'D',
      gameState: newHealth <= 0 ? 'game_over' : s.gameState,
      feedback: {
        ...s.feedback,
        chromaticFlash: 0.8,
      },
    }));
    soundEngine.updateMusicCombo(0, 'D');

    if (newHealth <= 0) {
      soundEngine.setLowHealth(false);
      soundEngine.playGuardBreak();
    }

    return false;
  },

  parrySuccess: (enemyPos) => {
    soundEngine.playParry();
    get().triggerShake(0.3, 0.2);
    get().triggerFovPunch(52);
    get().triggerHitstop(120);

    // Time dilation slow-mo matrix effect for 400ms
    set((s) => ({
      feedback: {
        ...s.feedback,
        timeDilation: 0.2,
        chromaticFlash: 0.7,
      },
    }));

    setTimeout(() => {
      set((s) => ({
        feedback: {
          ...s.feedback,
          timeDilation: 1.0,
        },
      }));
    }, 380);

    get().addShockwave(enemyPos, '#38bdf8', 4.5, 0.4);
    get().addFloatingText('PERFECT DEFLECT!', [enemyPos[0], enemyPos[1] + 1.2, enemyPos[2]], '#38bdf8', 1.4);

    set((s) => {
      const nextCombo = s.combo + 1;
      const rank = getRank(nextCombo);
      soundEngine.updateMusicCombo(nextCombo, rank);
      return {
        score: s.score + 250 * (s.combo + 1),
        combo: nextCombo,
        comboTimer: 3.5,
        maxCombo: Math.max(s.maxCombo, nextCombo),
        styleRank: rank,
      };
    });

    get().addCredits(75);
    get().checkFinisherUnlocks();
  },

  registerHitLanded: (_enemyId, damage, _postureDamage, pos, attackType) => {
    const isHeavy = attackType === 'heavy';
    const isFinisher = attackType === 'light_3';

    // Play synthesized sound
    soundEngine.playHit(isHeavy ? 'heavy' : isFinisher ? 'medium' : 'light');

    // Juice & Feedback
    const shakeIntensity = isHeavy ? 0.35 : isFinisher ? 0.25 : 0.12;
    const hitstopDuration = isHeavy ? 100 : isFinisher ? 80 : 50;
    get().triggerShake(shakeIntensity, isHeavy ? 0.2 : 0.14);
    get().triggerHitstop(hitstopDuration);

    if (isHeavy) {
      get().triggerFovPunch(56);
      get().addShockwave(pos, '#f59e0b', 3.0, 0.3);
    }

    // Floating damage & combo text
    const text = isHeavy ? `CRIT ${damage}` : `${damage}`;
    const color = isHeavy ? '#f59e0b' : isFinisher ? '#ec4899' : '#ffffff';
    get().addFloatingText(text, [pos[0], pos[1] + 0.8, pos[2]], color, isHeavy ? 1.3 : 1.0);

    set((s) => {
      const nextCombo = s.combo + 1;
      const pts = (damage * 10) * Math.max(1, Math.floor(nextCombo / 3));
      const rank = getRank(nextCombo);
      soundEngine.updateMusicCombo(nextCombo, rank);
      return {
        score: s.score + pts,
        combo: nextCombo,
        comboTimer: 3.5,
        maxCombo: Math.max(s.maxCombo, nextCombo),
        styleRank: rank,
      };
    });

    get().addCredits(isHeavy ? 20 : isFinisher ? 15 : 6);
    get().checkFinisherUnlocks();
  },

  triggerExecution: (enemyId, pos) => {
    get().startCinematicExecution(enemyId, 'grunt', [0, 0, 0], pos);
  },

  startCinematicExecution: (enemyId, enemyType, playerPos, targetPos) => {
    const finisherId = get().equippedFinisher;
    const finisher = get().finishers[finisherId] || INITIAL_FINISHERS.omni_slash;

    soundEngine.playExecution();
    get().triggerShake(0.45, 0.4);
    get().triggerFovPunch(44);
    get().triggerHitstop(120);
    get().addShockwave(targetPos, finisher.slashColor, 6.0, 0.6);

    const bannerTitle = `EXECUTION // ${finisher.name.toUpperCase()}`;
    get().addFloatingText(bannerTitle, [targetPos[0], targetPos[1] + 1.5, targetPos[2]], finisher.slashColor, 1.6);

    // Enter dramatic cinematic slow-motion
    set((s) => ({
      feedback: {
        ...s.feedback,
        timeDilation: 0.28,
        chromaticFlash: 0.85,
      },
      executionCinematic: {
        active: true,
        finisherId,
        progress: 0,
        enemyId,
        enemyType,
        playerPos,
        targetPos,
        climaxTriggered: false,
      },
    }));
  },

  updateExecutionCinematic: (delta) => {
    const s = get();
    if (!s.executionCinematic.active) return;

    const finisher = s.finishers[s.executionCinematic.finisherId] || INITIAL_FINISHERS.omni_slash;
    const dur = finisher.duration || 2.2;
    const prevP = s.executionCinematic.progress;
    const nextP = Math.min(1.0, prevP + delta / dur);

    // Check intermediate audio & visual milestones
    if (prevP < 0.25 && nextP >= 0.25) {
      soundEngine.playFinisherSlash('light');
      get().triggerShake(0.2, 0.1);
      get().addShockwave(s.executionCinematic.targetPos, finisher.slashColor, 2.5, 0.25);
    } else if (prevP < 0.5 && nextP >= 0.5) {
      soundEngine.playFinisherSlash('heavy');
      get().triggerShake(0.3, 0.15);
      get().addShockwave(s.executionCinematic.targetPos, finisher.slashColor, 3.5, 0.3);
    } else if (prevP < 0.75 && nextP >= 0.75) {
      soundEngine.playFinisherSlash('lethal');
      get().triggerShake(0.4, 0.2);
      get().addShockwave(s.executionCinematic.targetPos, finisher.slashColor, 4.5, 0.35);
    } else if (prevP < 0.88 && nextP >= 0.88 && !s.executionCinematic.climaxTriggered) {
      // Climax detonation / sheath click!
      soundEngine.playSheathClick();
      soundEngine.playFinisherSlash('lethal');
      get().triggerShake(0.65, 0.4);
      get().triggerFovPunch(42);
      get().triggerHitstop(140);
      get().addShockwave(s.executionCinematic.targetPos, '#ef4444', 7.0, 0.6);
      get().addFloatingText('FATAL CLIMAX!', [s.executionCinematic.targetPos[0], s.executionCinematic.targetPos[1] + 1.2, s.executionCinematic.targetPos[2]], '#ef4444', 1.8);
      set((st) => ({
        executionCinematic: { ...st.executionCinematic, climaxTriggered: true },
        feedback: { ...st.feedback, chromaticFlash: 1.0 },
      }));
    }

    if (nextP >= 0.995) {
      get().endCinematicExecution();
    } else {
      set((st) => ({
        executionCinematic: { ...st.executionCinematic, progress: nextP },
      }));
    }
  },

  endCinematicExecution: () => {
    const s = get();
    if (!s.executionCinematic.active) return; // Prevent duplicate termination calls

    set((st) => ({
      feedback: {
        ...st.feedback,
        timeDilation: 1.0,
      },
      executionCinematic: {
        ...st.executionCinematic,
        active: false,
        progress: 1.0,
      },
    }));

    set((st) => {
      const nextCombo = st.combo + 4;
      const rank = getRank(nextCombo);
      soundEngine.updateMusicCombo(nextCombo, rank);
      return {
        score: st.score + 2500 * Math.max(1, nextCombo),
        combo: nextCombo,
        comboTimer: 4.5,
        maxCombo: Math.max(st.maxCombo, nextCombo),
        styleRank: rank,
        kills: st.kills + 1,
      };
    });

    // Massive credit bonus on execution
    get().addCredits(400);
    get().checkFinisherUnlocks();
  },

  addFloatingText: (text, pos, color = '#ffffff', scale = 1.0) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((s) => ({
      floatingTexts: [
        ...s.floatingTexts.slice(-15),
        { id, text, position: pos, color, scale, createdAt: performance.now(), duration: 1000 },
      ],
    }));
  },

  addShockwave: (pos, color = '#38bdf8', maxRadius = 4.0, duration = 0.35) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((s) => ({
      shockwaves: [
        ...s.shockwaves.slice(-10),
        { id, position: pos, color, maxRadius, progress: 0, createdAt: performance.now(), duration },
      ],
    }));
  },

  triggerShake: (intensity, duration = 0.2) => {
    set((s) => ({
      feedback: {
        ...s.feedback,
        shakeIntensity: Math.max(s.feedback.shakeIntensity, intensity),
        shakeDuration: Math.max(s.feedback.shakeDuration, duration),
      },
    }));
  },

  triggerFovPunch: (fov = 54) => {
    set((s) => ({
      feedback: {
        ...s.feedback,
        fovWarp: 60 - fov, // Difference from baseline 60
      },
    }));
  },

  triggerHitstop: (durationMs) => {
    set((s) => ({
      feedback: {
        ...s.feedback,
        hitstopRemaining: Math.max(s.feedback.hitstopRemaining, durationMs),
      },
    }));
  },

  setParrying: (parrying) => {
    set({ isParrying: parrying, parryWindowActive: parrying });
  },

  setIFrames: (active) => {
    set({ iFrames: active });
  },

  setTargetEnemy: (id, canExecute = false) => {
    set({ targetEnemyId: id, canExecuteTarget: canExecute });
  },

  updateComboTimer: (delta) => {
    set((s) => {
      if (s.combo <= 0) return {};
      const newTimer = s.comboTimer - delta;
      if (newTimer <= 0) {
        soundEngine.updateMusicCombo(0, 'D');
        return { combo: 0, comboTimer: 0, styleRank: 'D' };
      }
      return { comboTimer: newTimer };
    });
  },

  updateFeedback: (delta) => {
    const now = performance.now();
    set((s) => {
      const f = s.feedback;
      const newShakeDur = Math.max(0, f.shakeDuration - delta);
      const newIntensity = newShakeDur <= 0 ? 0 : f.shakeIntensity * 0.88;
      const newFov = Math.max(0, f.fovWarp - delta * 45);
      const newHitstop = Math.max(0, f.hitstopRemaining - delta * 1000);
      const newChromatic = Math.max(0, f.chromaticFlash - delta * 2.5);

      // Clean old floating texts & shockwaves
      const validTexts = s.floatingTexts.filter((t) => now - t.createdAt < t.duration);
      const validShockwaves = s.shockwaves
        .map((sw) => {
          const elapsed = (now - sw.createdAt) / 1000;
          return { ...sw, progress: Math.min(1, elapsed / sw.duration) };
        })
        .filter((sw) => sw.progress < 1);

      return {
        feedback: {
          ...f,
          shakeDuration: newShakeDur,
          shakeIntensity: newIntensity,
          fovWarp: newFov,
          hitstopRemaining: newHitstop,
          chromaticFlash: newChromatic,
        },
        floatingTexts: validTexts,
        shockwaves: validShockwaves,
      };
    });
  },

  enemyKilled: () => {
    set((s) => ({
      kills: s.kills + 1,
      score: s.score + 500,
    }));
    get().addCredits(140);
  },

  setWaveCleared: () => {
    soundEngine.playWaveCleared();
    soundEngine.setLowHealth(false);
    const s = get();
    const bonusCredits = 500 + s.wave * 200;
    get().addCredits(bonusCredits);
    get().checkFinisherUnlocks();

    set((state) => ({
      waveStatus: 'cleared',
      waveBannerText: `WAVE ${state.wave} CLEARED // +${bonusCredits} CR`,
      health: Math.min(state.maxHealth, state.health + 30), // health recovery reward
      posture: 0,
    }));

    // Trigger brief slow-mo
    set((state) => ({
      feedback: { ...state.feedback, timeDilation: 0.3 },
    }));

    setTimeout(() => {
      set((state) => ({
        feedback: { ...state.feedback, timeDilation: 1.0 },
      }));
      get().startNextWave();
    }, 2800);
  },

  startNextWave: () => {
    set((s) => {
      const nextW = s.wave + 1;
      return {
        wave: nextW,
        waveStatus: 'active',
        waveBannerText: `WAVE ${nextW} // HOSTILE SQUAD DETECTED`,
      };
    });
    get().checkFinisherUnlocks();
    setTimeout(() => {
      set({ waveBannerText: null });
    }, 2200);
  },

  // Shop & Progression
  addCredits: (baseAmount) => {
    const scavengerTier = get().upgrades.credits || 0;
    const multiplier = 1 + 0.25 * scavengerTier;
    const finalAmount = Math.round(baseAmount * multiplier);
    set((s) => ({ credits: s.credits + finalAmount }));
  },

  buyWeapon: (id) => {
    const s = get();
    const weapon = s.weapons[id];
    if (!weapon || weapon.unlocked) return false;
    if (s.credits < weapon.cost) {
      soundEngine.playGuardBreak();
      return false;
    }

    soundEngine.playPurchase();
    soundEngine.playWeaponEquip();
    set((st) => ({
      credits: st.credits - weapon.cost,
      equippedWeapon: id,
      weapons: {
        ...st.weapons,
        [id]: { ...weapon, unlocked: true },
      },
    }));
    get().addFloatingText(`PURCHASED: ${weapon.name}`, [0, 2.0, 0], weapon.bladeColor, 1.4);
    return true;
  },

  equipWeapon: (id) => {
    const s = get();
    if (!s.weapons[id]?.unlocked) return;
    soundEngine.playWeaponEquip();
    set({ equippedWeapon: id });
    get().addFloatingText(`EQUIPPED: ${s.weapons[id].name}`, [0, 2.0, 0], s.weapons[id].bladeColor, 1.2);
  },

  buyUpgrade: (id) => {
    const s = get();
    const currentTier = s.upgrades[id] || 0;
    if (currentTier >= 5) return false;

    const config = UPGRADE_CONFIGS[id];
    const cost = Math.round(config.baseCost * Math.pow(config.costMultiplier, currentTier));
    if (s.credits < cost) {
      soundEngine.playGuardBreak();
      return false;
    }

    soundEngine.playPurchase();
    const nextTier = currentTier + 1;

    set((st) => {
      const updatedUpgrades = { ...st.upgrades, [id]: nextTier };
      let newMaxHp = st.maxHealth;
      let newHp = st.health;
      let newMaxPosture = st.maxPosture;

      if (id === 'health') {
        newMaxHp += 25;
        newHp = Math.min(newMaxHp, newHp + 25);
      } else if (id === 'posture') {
        newMaxPosture += 20;
      }

      return {
        credits: st.credits - cost,
        upgrades: updatedUpgrades,
        maxHealth: newMaxHp,
        health: newHp,
        maxPosture: newMaxPosture,
      };
    });

    get().addFloatingText(`${config.name} TIER ${nextTier}!`, [0, 2.0, 0], '#38bdf8', 1.3);
    return true;
  },

  equipFinisher: (id) => {
    const s = get();
    if (!s.finishers[id]?.unlocked) return;
    soundEngine.playWeaponEquip();
    set({ equippedFinisher: id });
    get().addFloatingText(`FINISHER: ${s.finishers[id].name}`, [0, 2.0, 0], s.finishers[id].slashColor, 1.3);
  },

  checkFinisherUnlocks: () => {
    const { wave, maxCombo, finishers } = get();
    let unlockedName: string | null = null;
    let unlockedColor = '#38bdf8';
    const updated = { ...finishers };
    let hasChanges = false;

    (Object.keys(updated) as FinisherId[]).forEach((fid) => {
      const f = updated[fid];
      if (!f.unlocked) {
        if (wave >= f.requiredWave || maxCombo >= f.requiredCombo) {
          updated[fid] = { ...f, unlocked: true };
          unlockedName = f.name;
          unlockedColor = f.slashColor;
          hasChanges = true;
        }
      }
    });

    if (hasChanges && unlockedName) {
      soundEngine.playWaveCleared();
      set({
        finishers: updated,
        unlockedFinisherNotification: `NEW FINISHER UNLOCKED: ${unlockedName}!`,
      });
      get().addFloatingText(`FINISHER UNLOCKED: ${unlockedName}!`, [0, 2.2, 0], unlockedColor, 1.8);
      get().triggerFovPunch(48);
    }
  },

  clearFinisherNotification: () => {
    set({ unlockedFinisherNotification: null });
  },

  toggleShop: () => {
    set((s) => ({ isShopOpen: !s.isShopOpen }));
  },

  setShopOpen: (open) => {
    set({ isShopOpen: open });
  },

  restartGame: () => {
    soundEngine.setLowHealth(false);
    set({
      health: 100,
      maxHealth: 100,
      posture: 0,
      score: 0,
      kills: 0,
      combo: 0,
      comboTimer: 0,
      styleRank: 'D',
      wave: 1,
      waveStatus: 'active',
      waveBannerText: 'WAVE 1 // ENGAGE',
      gameState: 'playing',
      targetEnemyId: null,
      canExecuteTarget: false,
      floatingTexts: [],
      shockwaves: [],
      feedback: {
        shakeIntensity: 0,
        shakeDuration: 0,
        fovWarp: 0,
        hitstopRemaining: 0,
        timeDilation: 1.0,
        chromaticFlash: 0,
      },
    });
    setTimeout(() => {
      set({ waveBannerText: null });
    }, 2000);
  },

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    soundEngine.setMuted(nextMuted);
    set({ isMuted: nextMuted });
  },

  startTutorial: () => {
    set((s) => ({
      isTutorialActive: true,
      tutorialStep: 0,
      tutorialSlowMo: true,
      health: 100,
      posture: 0,
      feedback: {
        ...s.feedback,
        timeDilation: 0.35, // Slow-mo active during tutorial for kinetic clarity
      },
    }));
  },

  nextTutorialStep: () => {
    set((s) => ({
      tutorialStep: Math.min(6, s.tutorialStep + 1),
    }));
  },

  prevTutorialStep: () => {
    set((s) => ({
      tutorialStep: Math.max(0, s.tutorialStep - 1),
    }));
  },

  setTutorialStep: (step: number) => {
    set({ tutorialStep: Math.max(0, Math.min(6, step)) });
  },

  exitTutorial: () => {
    set((s) => ({
      isTutorialActive: false,
      feedback: {
        ...s.feedback,
        timeDilation: 1.0, // Restore normal combat speed
      },
    }));
  },

  toggleTutorialSlowMo: () => {
    set((s) => {
      const nextSlowMo = !s.tutorialSlowMo;
      return {
        tutorialSlowMo: nextSlowMo,
        feedback: {
          ...s.feedback,
          timeDilation: nextSlowMo ? 0.35 : 1.0,
        },
      };
    });
  },
}));
