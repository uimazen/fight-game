export type CombatState = 
  | 'idle' 
  | 'run' 
  | 'light_1' 
  | 'light_2' 
  | 'light_3' 
  | 'heavy_charge' 
  | 'heavy_strike' 
  | 'dash' 
  | 'parry' 
  | 'execution' 
  | 'stagger' 
  | 'stagger_heavy'
  | 'guard_break_recovery'
  | 'dead';

export type WeaponId = 'katana' | 'dual_blades' | 'greatsword' | 'glaive' | 'laser_scythe';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  tagline: string;
  desc: string;
  cost: number;
  damageMultiplier: number;
  poiseMultiplier: number;
  speedMultiplier: number;
  rangeMultiplier: number;
  bladeColor: string;
  emissiveColor: string;
  unlocked: boolean;
}

export type UpgradeId = 'health' | 'posture' | 'damage' | 'parry_window' | 'dash' | 'credits';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  currentTier: number;
  maxTier: number;
  baseCost: number;
  costMultiplier: number;
  statBonusPerTier: string;
}

export type AddonId = 'laser_drone' | 'plasma_wave' | 'vampiric_core' | 'chrono_dodge' | 'arc_chain' | 'nanite_repair';

export interface AddonDef {
  id: AddonId;
  name: string;
  tagline: string;
  desc: string;
  cost: number;
  unlocked: boolean;
  equipped: boolean;
  color: string;
}

export type FinisherId = 'omni_slash' | 'judgement_guillotine' | 'thunderclap' | 'void_singularity';

export interface FinisherDef {
  id: FinisherId;
  name: string;
  title: string;
  desc: string;
  requiredWave: number;
  requiredCombo: number;
  unlocked: boolean;
  duration: number; // in seconds
  slashColor: string;
}

export interface ExecutionCinematicState {
  active: boolean;
  finisherId: FinisherId;
  progress: number; // 0 to 1
  enemyId: string | null;
  enemyType: EnemyType;
  playerPos: [number, number, number];
  targetPos: [number, number, number];
  climaxTriggered: boolean;
}

export type EnemyType = 'grunt' | 'brute' | 'elite' | 'boss';

export type EnemyAIState = 
  | 'patrol' 
  | 'approach' 
  | 'windup' 
  | 'attack' 
  | 'recovery' 
  | 'staggered' 
  | 'stagger_heavy'
  | 'poise_broken' 
  | 'poise_recovering'
  | 'executed' 
  | 'laser_charge'
  | 'laser_sweep'
  | 'jump_slam'
  | 'dead';

export interface EnemyData {
  id: string;
  type: EnemyType;
  position: [number, number, number];
  rotation: number;
  health: number;
  maxHealth: number;
  posture: number; // 0 to 100
  maxPosture: number;
  state: EnemyAIState;
  stateTimer: number;
  isUnblockable: boolean;
  targetPos?: [number, number, number];
  staggerDuration: number;
  velocity: [number, number, number];
  laserAngle?: number;
  laserProgress?: number;
  bossPhase?: number;
}

export type HitFXType = 'spark' | 'blood' | 'heavy_blast' | 'parry_flash' | 'laser_burn' | 'boss_smash';

export interface HitFXEvent {
  id: string;
  position: [number, number, number];
  type: HitFXType;
  count: number;
  color?: string;
  createdAt: number;
}

export interface LaserBeamData {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  width: number;
  createdAt: number;
  duration: number;
  progress: number;
  isDangerous?: boolean;
}

export interface FloatingText {
  id: string;
  text: string;
  position: [number, number, number];
  color: string;
  scale: number;
  createdAt: number;
  duration: number;
}

export interface ParticleData {
  id: string;
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface ShockwaveData {
  id: string;
  position: [number, number, number];
  color: string;
  maxRadius: number;
  progress: number;
  createdAt: number;
  duration: number;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  posture: number;
  maxPosture: number;
  iFrames: boolean;
  score: number;
  combo: number;
  comboTimer: number;
  maxCombo: number;
}
