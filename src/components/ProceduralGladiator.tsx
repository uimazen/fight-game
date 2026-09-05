import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CombatState, WeaponId, FinisherId } from '../types';

interface GladiatorProps {
  isPlayer?: boolean;
  enemyType?: 'grunt' | 'brute' | 'elite' | 'boss';
  combatState: CombatState;
  animationProgress: number; // 0 to 1
  isInvulnerable?: boolean;
  isStaggered?: boolean;
  isHeavyStaggered?: boolean;
  isPoiseBroken?: boolean;
  isGuardBreakRecovery?: boolean;
  isTelegraphing?: boolean; // Red danger flash for brute unblockables
  bladeTrailActive?: boolean;
  isParrying?: boolean;
  parryWindowActive?: boolean;
  combo?: number;
  styleRank?: string;
  equippedWeapon?: WeaponId;
  finisherId?: FinisherId;
  isExecuted?: boolean;
}

export const ProceduralGladiator: React.FC<GladiatorProps> = ({
  isPlayer = false,
  enemyType = 'grunt',
  combatState,
  animationProgress,
  isInvulnerable = false,
  isStaggered = false,
  isHeavyStaggered = false,
  isPoiseBroken = false,
  isGuardBreakRecovery = false,
  isTelegraphing = false,
  bladeTrailActive = false,
  isParrying = false,
  parryWindowActive = false,
  combo = 0,
  styleRank = 'D',
  equippedWeapon = 'katana',
  finisherId = 'omni_slash',
  isExecuted = false,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftShinRef = useRef<THREE.Group>(null);
  const rightShinRef = useRef<THREE.Group>(null);
  const weaponRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Mesh>(null);

  // Materials for dynamic emissive updates
  const visorMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const coreMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const bladeEdgeMatRef = useRef<THREE.MeshStandardMaterial>(null);

  // Smoothing interpolation state buffers (prevents animation pops between combat states)
  const currentPose = useRef({
    torsoPos: new THREE.Vector3(0, 0.9, 0),
    torsoRot: new THREE.Euler(0, 0, 0),
    headRot: new THREE.Euler(0, 0, 0),
    leftArmRot: new THREE.Euler(0, 0, 0),
    rightArmRot: new THREE.Euler(0, 0, 0),
    leftForearmRot: new THREE.Euler(0, 0, 0),
    rightForearmRot: new THREE.Euler(0, 0, 0),
    leftLegRot: new THREE.Euler(0, 0, 0),
    rightLegRot: new THREE.Euler(0, 0, 0),
    leftShinRot: new THREE.Euler(0, 0, 0),
    rightShinRot: new THREE.Euler(0, 0, 0),
    weaponRot: new THREE.Euler(Math.PI / 2, 0, 0),
  });

  // Target pose scratch buffers for useFrame
  const targets = useMemo(
    () => ({
      torsoPos: new THREE.Vector3(0, 0.9, 0),
      torsoRot: new THREE.Euler(0, 0, 0),
      headRot: new THREE.Euler(0, 0, 0),
      leftArmRot: new THREE.Euler(0, 0, 0),
      rightArmRot: new THREE.Euler(0, 0, 0),
      leftForearmRot: new THREE.Euler(0, 0, 0),
      rightForearmRot: new THREE.Euler(0, 0, 0),
      leftLegRot: new THREE.Euler(0, 0, 0),
      rightLegRot: new THREE.Euler(0, 0, 0),
      leftShinRot: new THREE.Euler(0, 0, 0),
      rightShinRot: new THREE.Euler(0, 0, 0),
      weaponRot: new THREE.Euler(Math.PI / 2, 0, 0),
    }),
    []
  );

  // Role visual styling
  const isBoss = enemyType === 'boss';
  const isBrute = enemyType === 'brute';
  const isElite = enemyType === 'elite';
  const scale = isBoss ? 1.65 : isBrute ? 1.35 : isPlayer ? 1.05 : isElite ? 1.0 : 0.95;

  const armorColor = isPlayer
    ? '#0f172a'
    : isBoss
    ? '#09090b'
    : isBrute
    ? '#1c1917'
    : isElite
    ? '#18181b'
    : '#1e1c24';

  const accentColor = isPlayer
    ? '#0ea5e9'
    : isBoss
    ? '#ff0033'
    : isBrute
    ? '#ea580c'
    : isElite
    ? '#a855f7'
    : '#ef4444';

  const baseEmissiveColor = isPlayer
    ? '#38bdf8'
    : isTelegraphing
    ? '#ff0033'
    : isBoss
    ? '#ef4444'
    : isBrute
    ? '#fb923c'
    : isElite
    ? '#c084fc'
    : '#f43f5e';

  // Dynamic Emissive Intensity Calculation reacting to combat events:
  // - High combo streaks amplify weapon and core glow
  // - Active parry window flares into radiant electric cyan
  // - Dash invulnerability pulses in spectral cyan
  const dynamicEmissiveIntensity = useMemo(() => {
    let intensity = isPlayer ? 2.2 : 1.8;

    if (isPlayer) {
      // Active parry deflection window flare
      if (parryWindowActive || isParrying || combatState === 'parry') {
        intensity += 3.8;
      }

      // Combo streak amplification
      if (combo >= 25 || styleRank === 'SSS') {
        intensity += 4.5;
      } else if (combo >= 18 || styleRank === 'S') {
        intensity += 3.2;
      } else if (combo >= 12 || styleRank === 'A') {
        intensity += 2.2;
      } else if (combo >= 7 || styleRank === 'B') {
        intensity += 1.4;
      } else if (combo >= 3) {
        intensity += 0.8;
      }

      if (isInvulnerable) {
        intensity += 2.0;
      }
    } else {
      if (isTelegraphing) {
        intensity = 5.0; // Unblockable danger flash
      } else if (isPoiseBroken) {
        intensity = 1.0;
      }
    }

    return intensity;
  }, [isPlayer, parryWindowActive, isParrying, combatState, combo, styleRank, isInvulnerable, isTelegraphing, isPoiseBroken]);

  // Main skeletal animation loop with smooth bone interpolation
  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = clock.getElapsedTime();

    // Default neutral stance values
    targets.torsoPos.set(0, 0.9, 0);
    targets.torsoRot.set(0, 0, 0);
    targets.headRot.set(0, 0, 0);
    targets.leftArmRot.set(0, 0, 0);
    targets.rightArmRot.set(0, 0, 0);
    targets.leftForearmRot.set(0, 0, 0);
    targets.rightForearmRot.set(0, 0, 0);
    targets.leftLegRot.set(0, 0, 0);
    targets.rightLegRot.set(0, 0, 0);
    targets.leftShinRot.set(0, 0, 0);
    targets.rightShinRot.set(0, 0, 0);
    targets.weaponRot.set(Math.PI / 2, 0, 0);

    let lerpSpeed = 22; // Responsive blending speed

    // =========================================================
    // 1. HIT-REACTION FRAMES: VICTIM EXECUTED vs HEAVY STAGGER vs LIGHT FLINCH
    // =========================================================
    if (isExecuted) {
      // Victim is undergoing cinematic execution!
      lerpSpeed = 26;
      const p = Math.max(0, Math.min(1, animationProgress));
      const isSlashFlinch = (p >= 0.22 && p <= 0.32) || (p >= 0.45 && p <= 0.55) || (p >= 0.70 && p <= 0.80);
      const flinchTremor = isSlashFlinch ? Math.sin(t * 50) * 0.08 : 0;

      if (p < 0.25) {
        // Phase 1: Stunned anticipation / poised broken tremble
        targets.torsoPos.set(0, 0.78 + flinchTremor, 0);
        targets.torsoRot.set(-0.25, 0.1, flinchTremor);
        targets.headRot.set(0.3, 0, 0);
        targets.leftArmRot.set(0.4, 0, -0.2);
        targets.rightArmRot.set(0.4, 0, 0.2);
      } else if (p < 0.85) {
        // Phase 2: Rapid slashes connecting!
        const isAirborne = finisherId === 'judgement_guillotine';
        const airLift = isAirborne ? Math.sin(((p - 0.25) / 0.6) * Math.PI) * 2.2 : 0;
        targets.torsoPos.set(0, 0.72 + airLift + flinchTremor, isSlashFlinch ? -0.2 : 0);
        targets.torsoRot.set(-0.55 + flinchTremor, Math.sin(t * 30) * 0.3, 0);
        targets.headRot.set(-0.6, Math.sin(t * 25) * 0.25, 0);
        targets.leftArmRot.set(-1.2, 0, -0.7);
        targets.rightArmRot.set(-1.1, 0, 0.7);
        targets.leftLegRot.set(-0.6, 0, 0);
        targets.rightLegRot.set(0.4, 0, 0);
      } else {
        // Phase 3: Final climax collapse / fatality knees drop
        targets.torsoPos.set(0, 0.38, -0.2);
        targets.torsoRot.set(0.65, 0, 0.1);
        targets.headRot.set(0.85, 0, 0); // head bowed
        targets.leftArmRot.set(0.6, 0, -0.15);
        targets.rightArmRot.set(0.6, 0, 0.15);
        targets.leftLegRot.set(1.4, 0, -0.3);
        targets.rightLegRot.set(1.4, 0, 0.3);
        targets.leftShinRot.set(1.4, 0, 0);
        targets.rightShinRot.set(1.4, 0, 0);
      }
    } else if (isHeavyStaggered || combatState === 'stagger_heavy') {
      // Violent kinetic impact: torso blown far backward, arms flung wide, feet skidding
      lerpSpeed = 30;
      targets.torsoPos.set(0, 0.76, -0.15);
      targets.torsoRot.set(-0.62, 0.18, 0.12);
      targets.headRot.set(-0.45, -0.2, 0);

      targets.leftArmRot.set(-1.1, 0, -0.6);
      targets.rightArmRot.set(-1.25, 0, 0.7);
      targets.leftForearmRot.set(-0.4, 0, 0);
      targets.rightForearmRot.set(-0.5, 0, 0);

      targets.leftLegRot.set(-0.55, 0, -0.15);
      targets.rightLegRot.set(0.65, 0, 0.15);
      targets.leftShinRot.set(0.4, 0, 0);
      targets.rightShinRot.set(0.65, 0, 0);
    } else if (isStaggered || combatState === 'stagger') {
      // Light attack hit-reaction: sharp torso recoil, defensive flinch
      lerpSpeed = 28;
      targets.torsoPos.set(0, 0.85, -0.05);
      targets.torsoRot.set(-0.35, 0.22, -0.08);
      targets.headRot.set(-0.25, 0.15, 0);

      targets.leftArmRot.set(-0.6, 0, -0.4);
      targets.rightArmRot.set(-0.7, 0, 0.35);
      targets.leftLegRot.set(-0.3, 0, 0);
      targets.rightLegRot.set(0.35, 0, 0);
      targets.rightShinRot.set(0.35, 0, 0);
    }

    // =========================================================
    // 2. GUARD BREAK & RECOVERY FRAMES
    // =========================================================
    else if (isPoiseBroken) {
      // Poise shattered: buckled knees, wobbling off-balance torso, limp arms
      lerpSpeed = 16;
      const wobble = Math.sin(t * 6) * 0.1;
      targets.torsoPos.set(0, 0.76 + Math.sin(t * 3) * 0.03, 0);
      targets.torsoRot.set(-0.28 + wobble, Math.cos(t * 4) * 0.14, Math.sin(t * 5) * 0.08);

      targets.headRot.set(0.45 + Math.sin(t * 8) * 0.12, Math.cos(t * 6) * 0.18, 0);
      targets.leftArmRot.set(0.55, 0, -0.3);
      targets.rightArmRot.set(0.48, 0, 0.25);

      targets.leftLegRot.set(-0.25, 0, -0.1);
      targets.rightLegRot.set(0.2, 0, 0.1);
      targets.leftShinRot.set(0.35, 0, 0);
      targets.rightShinRot.set(0.4, 0, 0);
    } else if (isGuardBreakRecovery || combatState === 'guard_break_recovery') {
      // Recovery frame: shaking off daze, pushing back to upright guard
      lerpSpeed = 14;
      const headShake = Math.sin(t * 12) * 0.25;
      targets.torsoPos.set(0, 0.88, 0);
      targets.torsoRot.set(0.08, 0, 0);
      targets.headRot.set(0.1, headShake, 0);

      targets.leftArmRot.set(-0.45, 0, -0.3);
      targets.rightArmRot.set(-0.55, 0, 0.2);
      targets.leftLegRot.set(-0.15, 0, 0);
      targets.rightLegRot.set(0.18, 0, 0);
    }

    // =========================================================
    // 3. RUN CYCLE (DYNAMIC SPRINT)
    // =========================================================
    else if (combatState === 'run') {
      const runFreq = 12;
      const legAngle = Math.sin(t * runFreq) * 0.9;
      const bounce = Math.abs(Math.sin(t * runFreq)) * 0.1;
      const sway = Math.sin(t * runFreq) * 0.14;

      targets.torsoPos.set(0, 0.9 + bounce, 0);
      targets.torsoRot.set(0.24, sway, -sway * 0.5);

      targets.leftLegRot.set(legAngle, 0, 0);
      targets.rightLegRot.set(-legAngle, 0, 0);
      targets.leftShinRot.set(Math.max(0, -legAngle * 1.3), 0, 0);
      targets.rightShinRot.set(Math.max(0, legAngle * 1.3), 0, 0);

      targets.leftArmRot.set(-legAngle * 0.9, 0, -0.2);
      targets.rightArmRot.set(legAngle * 0.85, 0, 0.2);
      targets.leftForearmRot.set(-0.8, 0, 0);
      targets.rightForearmRot.set(-0.9, 0, 0);

      targets.weaponRot.set(Math.PI / 2 - 0.4, 0, 0.3);
    }

    // =========================================================
    // 4. COMBAT STRINGS & HEAVY WIND-UP
    // =========================================================
    else {
      const p = animationProgress;

      // LIGHT ATTACK 1: Horizontal Snap Slash
      if (combatState === 'light_1') {
        const swingP = Math.min(1, Math.max(0, (p - 0.12) / 0.58));
        const easedSwing = Math.sin(swingP * (Math.PI / 2));

        targets.torsoPos.set(0, 0.86, p * 0.16);
        targets.torsoRot.set(0.1, 0.65 - easedSwing * 1.85, 0);

        targets.rightArmRot.set(-0.9 + easedSwing * 0.45, -1.2 + easedSwing * 2.85, -0.3 + easedSwing * 0.6);
        targets.rightForearmRot.set(-0.4, 0, 0);
        targets.weaponRot.set(Math.PI / 2 + 0.35 * Math.sin(p * Math.PI), 0, 0.85 * Math.sin(p * Math.PI));

        targets.leftArmRot.set(0.4 - easedSwing * 0.7, 0, -0.5);
        targets.leftLegRot.set(-0.4, 0, 0);
        targets.rightLegRot.set(0.3, 0, 0);
        targets.leftShinRot.set(0.35, 0, 0);
        targets.rightShinRot.set(0.25, 0, 0);
      }

      // LIGHT ATTACK 2: Rising Diagonal Uppercut Slash
      else if (combatState === 'light_2') {
        const swingP = Math.min(1, Math.max(0, (p - 0.08) / 0.62));
        const easedSwing = Math.sin(swingP * (Math.PI / 2));

        targets.torsoPos.set(0, 0.82 + Math.sin(p * Math.PI) * 0.2, 0);
        targets.torsoRot.set(-0.15 + easedSwing * 0.3, -0.65 + easedSwing * 1.65, 0);

        targets.rightArmRot.set(0.5 - easedSwing * 2.65, -0.8 + easedSwing * 1.4, 0.6 - easedSwing * 1.2);
        targets.rightForearmRot.set(-0.6, 0, 0);
        targets.weaponRot.set(Math.PI / 2 - 0.95 * Math.sin(p * Math.PI), 0, 0);

        targets.leftArmRot.set(-0.6, 0, -0.3);
        targets.leftLegRot.set(0.3, 0, 0);
        targets.rightLegRot.set(-0.35, 0, 0);
        targets.leftShinRot.set(0.4, 0, 0);
      }

      // LIGHT ATTACK 3: Airborne 360 Spin Cleave
      else if (combatState === 'light_3') {
        const jumpHeight = Math.sin(p * Math.PI) * 0.52;
        targets.torsoPos.set(0, 0.9 + jumpHeight, 0);
        targets.torsoRot.set(0.2 * Math.sin(p * Math.PI), p * Math.PI * 2, 0);

        targets.rightArmRot.set(-2.8 + p * 3.4, 0, -0.4);
        targets.rightForearmRot.set(-0.5, 0, 0);
        targets.weaponRot.set(Math.PI / 2 + 1.25 * Math.sin(p * Math.PI), 0, 0);

        targets.leftLegRot.set(-0.75 * Math.sin(p * Math.PI), 0, 0);
        targets.rightLegRot.set(1.35 * Math.sin(p * Math.PI), 0, 0);
        targets.rightShinRot.set(0.65 * Math.sin(p * Math.PI), 0, 0);
      }

      // HEAVY WIND-UP / CHARGE (Coiled anticipation with tremors)
      else if (combatState === 'heavy_charge') {
        // Dramatic power coil with slight anticipation rumble
        const tremor = Math.sin(t * 35) * 0.015;
        targets.torsoPos.set(0, 0.78 + tremor, 0);
        targets.torsoRot.set(0.22, 1.05, tremor);

        targets.rightArmRot.set(0.85, -1.65, 0.55);
        targets.leftArmRot.set(0.65, -1.25, 0);
        targets.weaponRot.set(Math.PI / 2 - 0.75, 0, tremor * 2);

        targets.leftLegRot.set(0.55, 0, 0);
        targets.rightLegRot.set(-0.65, 0, 0);
        targets.leftShinRot.set(0.5, 0, 0);
        targets.rightShinRot.set(0.6, 0, 0);
      }

      // HEAVY STRIKE (Guard-Breaking Earth Slam)
      else if (combatState === 'heavy_strike') {
        const strikeP = Math.sin(p * (Math.PI / 2));
        targets.torsoPos.set(0, 0.78 - strikeP * 0.16, strikeP * 0.38);
        targets.torsoRot.set(0.68 * strikeP, -0.3 * strikeP, 0);

        targets.rightArmRot.set(-2.8 + strikeP * 2.65, 0.2, 0.2);
        targets.leftArmRot.set(-2.6 + strikeP * 2.45, 0, -0.2);
        targets.weaponRot.set(Math.PI / 2 + 1.25 * strikeP, 0, 0);

        targets.leftLegRot.set(-0.6 * strikeP, 0, 0);
        targets.rightLegRot.set(0.7 * strikeP, 0, 0);
        targets.rightShinRot.set(0.6, 0, 0);
      }

      // DASH / EVADE
      else if (combatState === 'dash') {
        targets.torsoPos.set(0, 0.52, 0);
        targets.torsoRot.set(0.78, 0, Math.sin(p * Math.PI) * 0.3);
        targets.leftArmRot.set(-1.6, 0, 0);
        targets.rightArmRot.set(-1.6, 0, 0);
        targets.leftLegRot.set(1.1, 0, 0);
        targets.rightLegRot.set(-0.8, 0, 0);
        targets.leftShinRot.set(0.8, 0, 0);
      }

      // PARRY / DEFLECTION STANCE
      else if (combatState === 'parry') {
        targets.torsoPos.set(0, 0.86, 0);
        targets.torsoRot.set(-0.1, 0.48, 0);

        targets.rightArmRot.set(-1.55, -0.85, 0.95);
        targets.leftArmRot.set(-1.35, 0.7, -0.6);
        targets.rightForearmRot.set(-1.25, 0, 0);
        targets.weaponRot.set(Math.PI / 2, 0, 1.48);

        targets.leftLegRot.set(-0.2, 0, 0);
        targets.rightLegRot.set(0.25, 0, 0);
      }

      // EXECUTION FINISHER CHOREOGRAPHY
      else if (combatState === 'execution') {
        const p = Math.max(0, Math.min(1, animationProgress));
        lerpSpeed = 24;

        if (finisherId === 'omni_slash') {
          // 4-Phase Omnislash Flurry + Iaijutsu Sheath
          if (p < 0.22) {
            // Dash-in coil
            targets.torsoPos.set(0, 0.78, 0.2);
            targets.torsoRot.set(0.45, 0.8, 0);
            targets.rightArmRot.set(0.6, -1.5, 0.6);
            targets.weaponRot.set(Math.PI / 2 - 0.6, 0, 0);
            targets.leftLegRot.set(-0.6, 0, 0);
            targets.rightLegRot.set(0.8, 0, 0);
          } else if (p < 0.45) {
            // Strike 1: High speed horizontal cross-cleave
            targets.torsoPos.set(0, 0.84, 0.1);
            targets.torsoRot.set(0.1, -1.2, 0);
            targets.rightArmRot.set(-1.8, 0.8, -0.5);
            targets.rightForearmRot.set(-0.3, 0, 0);
            targets.weaponRot.set(Math.PI / 2 + 0.9, 0, 0);
          } else if (p < 0.70) {
            // Strike 2: Rising diagonal upper-cleave
            targets.torsoPos.set(0, 0.92, 0);
            targets.torsoRot.set(-0.25, 1.4, 0);
            targets.rightArmRot.set(-2.6, -0.6, 0.8);
            targets.weaponRot.set(Math.PI / 2 - 1.1, 0, 0);
          } else if (p < 0.86) {
            // Strike 3: 360 Spin cleave & slide behind
            targets.torsoPos.set(0, 0.75, -0.1);
            targets.torsoRot.set(0.3, -2.4, 0);
            targets.rightArmRot.set(-1.2, 1.2, 0);
            targets.weaponRot.set(Math.PI / 2 + 1.4, 0, 0);
          } else {
            // Climax: Standing tall, Iaijutsu sheathing snap!
            targets.torsoPos.set(0, 0.92, 0);
            targets.torsoRot.set(0.04, 0.2, 0);
            targets.leftArmRot.set(0.2, 0.4, -0.2);
            targets.leftForearmRot.set(-1.4, 0, 0);
            targets.rightArmRot.set(0.35, -0.3, 0.2);
            targets.rightForearmRot.set(-1.3, 0, 0);
            targets.weaponRot.set(Math.PI, 0, 0.2);
            targets.headRot.set(0.1, -0.35, 0);
          }
        } else if (finisherId === 'judgement_guillotine') {
          // Launch kick -> Aerial Hold -> Diving Meteor Cleave
          if (p < 0.25) {
            // Bicycle launch sweep
            targets.torsoPos.set(0, 0.75, 0);
            targets.torsoRot.set(-0.4, 0.5, 0);
            targets.rightLegRot.set(-1.6, 0, 0);
            targets.rightShinRot.set(0.1, 0, 0);
            targets.rightArmRot.set(-1.8, 0, 0.4);
          } else if (p < 0.65) {
            // High in air, gripping weapon with both hands raised high
            targets.torsoPos.set(0, 1.1, 0);
            targets.torsoRot.set(-0.2, 0, 0);
            targets.rightArmRot.set(-2.9, 0.3, 0.2);
            targets.leftArmRot.set(-2.8, -0.3, -0.2);
            targets.weaponRot.set(Math.PI / 2 + 1.6, 0, 0);
            targets.leftLegRot.set(-0.4, 0, 0);
            targets.rightLegRot.set(0.5, 0, 0);
          } else {
            // Ground slam impact cleave
            targets.torsoPos.set(0, 0.62, 0.4);
            targets.torsoRot.set(0.85, 0, 0);
            targets.rightArmRot.set(0.1, 0.2, 0);
            targets.leftArmRot.set(0.1, -0.2, 0);
            targets.weaponRot.set(Math.PI / 2 + 1.2, 0, 0);
            targets.leftLegRot.set(0.8, 0, 0);
            targets.rightLegRot.set(-0.9, 0, 0);
          }
        } else if (finisherId === 'thunderclap') {
          // Iaijutsu Lightning Pass-through
          if (p < 0.32) {
            // Ultra-low coiled stance, hand gripping hilt
            targets.torsoPos.set(0, 0.68, 0);
            targets.torsoRot.set(0.4, 0.9, 0);
            targets.rightArmRot.set(0.4, -1.4, 0.5);
            targets.leftArmRot.set(0.2, 0.4, -0.3);
            targets.weaponRot.set(Math.PI / 2 - 0.4, 0, 0);
            targets.leftLegRot.set(0.7, 0, 0);
            targets.rightLegRot.set(-0.8, 0, 0);
          } else if (p < 0.55) {
            // Sonic draw flash through target
            targets.torsoPos.set(0, 0.72, 0.4);
            targets.torsoRot.set(0.2, -1.6, 0);
            targets.rightArmRot.set(-2.2, 1.2, -0.4);
            targets.weaponRot.set(Math.PI / 2 + 1.2, 0, 0);
          } else {
            // Reverse-grip over-the-shoulder pose looking back at falling victim
            targets.torsoPos.set(0, 0.9, 0);
            targets.torsoRot.set(0.05, -0.4, 0);
            targets.headRot.set(-0.1, -1.2, 0);
            targets.rightArmRot.set(-1.4, 0.8, 0.6);
            targets.weaponRot.set(-Math.PI / 2, 0, 1.2);
          }
        } else {
          // Void Singularity: Rift summon & Ground Shatter
          if (p < 0.35) {
            targets.torsoPos.set(0, 0.82, 0);
            targets.torsoRot.set(0.1, -0.5, 0);
            targets.leftArmRot.set(-1.8, 0.4, -0.2);
            targets.rightArmRot.set(0.4, -0.8, 0.3);
          } else if (p < 0.68) {
            // 2-handed skyward blade lift
            targets.torsoPos.set(0, 0.95, 0);
            targets.torsoRot.set(-0.3, 0, 0);
            targets.rightArmRot.set(-2.8, 0.2, 0.1);
            targets.leftArmRot.set(-2.7, -0.2, -0.1);
            targets.weaponRot.set(Math.PI / 2 + 1.4, 0, 0);
          } else {
            // Ground split smash
            targets.torsoPos.set(0, 0.65, 0.3);
            targets.torsoRot.set(0.75, 0, 0);
            targets.rightArmRot.set(0.2, 0.2, 0);
            targets.leftArmRot.set(0.2, -0.2, 0);
            targets.weaponRot.set(Math.PI / 2 + 1.3, 0, 0);
          }
        }
      }

      // IDLE READY STANCE
      else {
        const idleBreathe = Math.sin(t * 3.0) * 0.025;
        targets.torsoPos.set(0, 0.9 + idleBreathe, 0);
        targets.torsoRot.set(0.05, 0.28, 0);

        targets.leftArmRot.set(-0.6 + idleBreathe, 0, -0.35);
        targets.rightArmRot.set(-0.8 + idleBreathe, -0.25, 0);
        targets.rightForearmRot.set(-0.7, 0, 0);
        targets.leftForearmRot.set(-0.6, 0, 0);
        targets.weaponRot.set(Math.PI / 2 - 0.2, 0, 0.3);

        targets.leftLegRot.set(-0.15, 0, -0.08);
        targets.rightLegRot.set(0.18, 0, 0.08);
      }
    }

    // =========================================================
    // 5. SMOOTH BONE LERPING (ZERO POPPING BETWEEN STATES)
    // =========================================================
    const blendFactor = Math.min(1, lerpSpeed * delta);
    const curr = currentPose.current;

    curr.torsoPos.lerp(targets.torsoPos, blendFactor);
    curr.torsoRot.x = THREE.MathUtils.lerp(curr.torsoRot.x, targets.torsoRot.x, blendFactor);
    curr.torsoRot.y = THREE.MathUtils.lerp(curr.torsoRot.y, targets.torsoRot.y, blendFactor);
    curr.torsoRot.z = THREE.MathUtils.lerp(curr.torsoRot.z, targets.torsoRot.z, blendFactor);

    curr.headRot.x = THREE.MathUtils.lerp(curr.headRot.x, targets.headRot.x, blendFactor);
    curr.headRot.y = THREE.MathUtils.lerp(curr.headRot.y, targets.headRot.y, blendFactor);
    curr.headRot.z = THREE.MathUtils.lerp(curr.headRot.z, targets.headRot.z, blendFactor);

    curr.leftArmRot.x = THREE.MathUtils.lerp(curr.leftArmRot.x, targets.leftArmRot.x, blendFactor);
    curr.leftArmRot.y = THREE.MathUtils.lerp(curr.leftArmRot.y, targets.leftArmRot.y, blendFactor);
    curr.leftArmRot.z = THREE.MathUtils.lerp(curr.leftArmRot.z, targets.leftArmRot.z, blendFactor);

    curr.rightArmRot.x = THREE.MathUtils.lerp(curr.rightArmRot.x, targets.rightArmRot.x, blendFactor);
    curr.rightArmRot.y = THREE.MathUtils.lerp(curr.rightArmRot.y, targets.rightArmRot.y, blendFactor);
    curr.rightArmRot.z = THREE.MathUtils.lerp(curr.rightArmRot.z, targets.rightArmRot.z, blendFactor);

    curr.leftForearmRot.x = THREE.MathUtils.lerp(curr.leftForearmRot.x, targets.leftForearmRot.x, blendFactor);
    curr.rightForearmRot.x = THREE.MathUtils.lerp(curr.rightForearmRot.x, targets.rightForearmRot.x, blendFactor);

    curr.leftLegRot.x = THREE.MathUtils.lerp(curr.leftLegRot.x, targets.leftLegRot.x, blendFactor);
    curr.rightLegRot.x = THREE.MathUtils.lerp(curr.rightLegRot.x, targets.rightLegRot.x, blendFactor);

    curr.leftShinRot.x = THREE.MathUtils.lerp(curr.leftShinRot.x, targets.leftShinRot.x, blendFactor);
    curr.rightShinRot.x = THREE.MathUtils.lerp(curr.rightShinRot.x, targets.rightShinRot.x, blendFactor);

    curr.weaponRot.x = THREE.MathUtils.lerp(curr.weaponRot.x, targets.weaponRot.x, blendFactor);
    curr.weaponRot.y = THREE.MathUtils.lerp(curr.weaponRot.y, targets.weaponRot.y, blendFactor);
    curr.weaponRot.z = THREE.MathUtils.lerp(curr.weaponRot.z, targets.weaponRot.z, blendFactor);

    // Apply to Three.js Object3Ds
    if (torsoRef.current) {
      torsoRef.current.position.copy(curr.torsoPos);
      torsoRef.current.rotation.copy(curr.torsoRot);
    }
    if (headRef.current) headRef.current.rotation.copy(curr.headRot);
    if (leftArmRef.current) leftArmRef.current.rotation.copy(curr.leftArmRot);
    if (rightArmRef.current) rightArmRef.current.rotation.copy(curr.rightArmRot);
    if (leftForearmRef.current) leftForearmRef.current.rotation.copy(curr.leftForearmRot);
    if (rightForearmRef.current) rightForearmRef.current.rotation.copy(curr.rightForearmRot);
    if (leftLegRef.current) leftLegRef.current.rotation.copy(curr.leftLegRot);
    if (rightLegRef.current) rightLegRef.current.rotation.copy(curr.rightLegRot);
    if (leftShinRef.current) leftShinRef.current.rotation.copy(curr.leftShinRot);
    if (rightShinRef.current) rightShinRef.current.rotation.copy(curr.rightShinRot);
    if (weaponRef.current) weaponRef.current.rotation.copy(curr.weaponRot);

    // Dynamically update material emissive intensities
    if (visorMatRef.current) {
      visorMatRef.current.emissiveIntensity = dynamicEmissiveIntensity;
    }
    if (bladeEdgeMatRef.current) {
      bladeEdgeMatRef.current.emissiveIntensity = dynamicEmissiveIntensity;
    }
  });

  return (
    <group ref={rootRef} scale={[scale, scale, scale]}>
      {/* Telegraph danger indicator beacon over head for brute unblockable */}
      {isTelegraphing && (
        <group position={[0, 2.4, 0]}>
          <mesh>
            <octahedronGeometry args={[0.26, 0]} />
            <meshBasicMaterial color="#ff0033" wireframe />
          </mesh>
          <pointLight color="#ff0033" intensity={4} distance={5} />
        </group>
      )}

      {/* Stun/Poise broken orbiting star halo */}
      {isPoiseBroken && (
        <group position={[0, 2.2, 0]}>
          <mesh position={[0.32, 0, 0]}>
            <dodecahedronGeometry args={[0.08, 0]} />
            <meshStandardMaterial emissive="#fbbf24" emissiveIntensity={3} color="#fbbf24" />
          </mesh>
          <mesh position={[-0.32, 0, 0]}>
            <dodecahedronGeometry args={[0.08, 0]} />
            <meshStandardMaterial emissive="#fbbf24" emissiveIntensity={3} color="#fbbf24" />
          </mesh>
        </group>
      )}

      {/* 3D DYNAMIC ENERGY BLADE SLASH TRAIL ARC */}
      {bladeTrailActive && (
        <mesh
          ref={trailRef}
          position={[0, 1.1, 0.4]}
          rotation={
            combatState === 'light_2'
              ? [0.4, 0.5, 0.8]
              : combatState === 'heavy_strike'
              ? [Math.PI / 2, 0, 0]
              : [0, 0, 0]
          }
        >
          <ringGeometry args={[0.8, 1.5, 32, 1, 0, Math.PI * 1.4]} />
          <meshBasicMaterial
            color={baseEmissiveColor}
            transparent
            opacity={Math.min(0.9, 0.5 + dynamicEmissiveIntensity * 0.08)}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Main Hip / Pelvis */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[isBrute ? 0.46 : 0.34, 0.22, isBrute ? 0.3 : 0.24]} />
        <meshStandardMaterial color={armorColor} roughness={0.25} metalness={0.85} />
      </mesh>

      {/* Torso & Chest Assembly */}
      <group ref={torsoRef}>
        {/* Abdomen joint */}
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.16, 0.18, 8]} />
          <meshStandardMaterial color="#0b1120" roughness={0.4} metalness={0.9} />
        </mesh>

        {/* Chest Plate */}
        <mesh position={[0, 0.32, 0]} castShadow>
          <boxGeometry args={[isBrute ? 0.65 : 0.46, 0.36, isBrute ? 0.38 : 0.28]} />
          <meshStandardMaterial color={armorColor} roughness={0.2} metalness={0.88} />
        </mesh>

        {/* Glowing Cyber Energy Core (Reacts to combat streak) */}
        <mesh position={[0, 0.32, isBrute ? 0.2 : 0.15]}>
          <circleGeometry args={[isBrute ? 0.095 : 0.07, 16]} />
          <meshBasicMaterial ref={coreMatRef} color={baseEmissiveColor} />
        </mesh>

        {/* Neck & Head */}
        <group ref={headRef} position={[0, 0.54, 0]}>
          {/* Cyber Helmet */}
          <mesh castShadow>
            <boxGeometry args={[0.24, 0.26, 0.26]} />
            <meshStandardMaterial color={armorColor} roughness={0.18} metalness={0.92} />
          </mesh>
          {/* Glowing Visor Slit (Reacts to active parry & combo) */}
          <mesh position={[0, 0.02, 0.135]}>
            <boxGeometry args={[0.2, 0.055, 0.02]} />
            <meshStandardMaterial
              ref={visorMatRef}
              color={baseEmissiveColor}
              emissive={baseEmissiveColor}
              emissiveIntensity={dynamicEmissiveIntensity}
            />
          </mesh>
        </group>

        {/* Left Arm Assembly */}
        <group ref={leftArmRef} position={[isBrute ? -0.38 : -0.28, 0.42, 0]}>
          {/* Pauldron */}
          <mesh castShadow>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color={accentColor} roughness={0.25} metalness={0.75} />
          </mesh>
          {/* Upper Arm */}
          <mesh position={[0, -0.16, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.055, 0.22, 8]} />
            <meshStandardMaterial color={armorColor} roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Forearm */}
          <group ref={leftForearmRef} position={[0, -0.28, 0]}>
            <mesh position={[0, -0.12, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.06, 0.22, 8]} />
              <meshStandardMaterial color={armorColor} roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Hand */}
            <mesh position={[0, -0.24, 0]}>
              <boxGeometry args={[0.085, 0.085, 0.085]} />
              <meshStandardMaterial color={accentColor} metalness={0.9} />
            </mesh>

            {/* Off-Hand Blade for Dual Blades */}
            {isPlayer && equippedWeapon === 'dual_blades' && (
              <group position={[0, -0.26, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
                <mesh position={[0, 0.08, 0]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.18, 8]} />
                  <meshStandardMaterial color="#0b1120" metalness={0.9} />
                </mesh>
                <mesh position={[0, 0.46, 0]}>
                  <boxGeometry args={[0.018, 0.65, 0.05]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
                </mesh>
                <mesh position={[0, 0.46, 0.03]}>
                  <boxGeometry args={[0.009, 0.64, 0.016]} />
                  <meshStandardMaterial
                    color="#38bdf8"
                    emissive="#38bdf8"
                    emissiveIntensity={dynamicEmissiveIntensity}
                  />
                </mesh>
              </group>
            )}
          </group>
        </group>

        {/* Right Arm Assembly (Weapon Arm) */}
        <group ref={rightArmRef} position={[isBrute ? 0.38 : 0.28, 0.42, 0]}>
          {/* Pauldron */}
          <mesh castShadow>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color={accentColor} roughness={0.25} metalness={0.75} />
          </mesh>
          {/* Upper Arm */}
          <mesh position={[0, -0.16, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.055, 0.22, 8]} />
            <meshStandardMaterial color={armorColor} roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Forearm */}
          <group ref={rightForearmRef} position={[0, -0.28, 0]}>
            <mesh position={[0, -0.12, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.06, 0.22, 8]} />
              <meshStandardMaterial color={armorColor} roughness={0.3} metalness={0.8} />
            </mesh>

            {/* Hand */}
            <mesh position={[0, -0.24, 0]}>
              <boxGeometry args={[0.085, 0.085, 0.085]} />
              <meshStandardMaterial color={accentColor} metalness={0.9} />
            </mesh>

            {/* WEAPON ATTACHMENT */}
            <group ref={weaponRef} position={[0, -0.26, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
              {isBrute ? (
                // Brute: Heavy Cyber Hammer / Cleaver
                <group>
                  <mesh position={[0, 0.45, 0]}>
                    <cylinderGeometry args={[0.045, 0.045, 0.95, 8]} />
                    <meshStandardMaterial color="#334155" metalness={0.9} />
                  </mesh>
                  <mesh position={[0, 0.88, 0]}>
                    <boxGeometry args={[0.32, 0.38, 0.44]} />
                    <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.2} />
                  </mesh>
                  {/* Glowing Energy Edge */}
                  <mesh position={[0, 0.88, 0.23]}>
                    <boxGeometry args={[0.28, 0.32, 0.04]} />
                    <meshStandardMaterial
                      ref={bladeEdgeMatRef}
                      color={baseEmissiveColor}
                      emissive={baseEmissiveColor}
                      emissiveIntensity={dynamicEmissiveIntensity}
                    />
                  </mesh>
                </group>
              ) : isPlayer && equippedWeapon === 'greatsword' ? (
                // Player: Heavy Buster Greatsword
                <group>
                  {/* Heavy Pommel & Long Hilt */}
                  <mesh position={[0, -0.08, 0]}>
                    <cylinderGeometry args={[0.04, 0.04, 0.06, 8]} />
                    <meshStandardMaterial color="#0f172a" metalness={0.95} />
                  </mesh>
                  <mesh position={[0, 0.14, 0]}>
                    <cylinderGeometry args={[0.03, 0.03, 0.38, 8]} />
                    <meshStandardMaterial color="#1e293b" metalness={0.9} />
                  </mesh>
                  {/* Broad Crossguard */}
                  <mesh position={[0, 0.34, 0]}>
                    <boxGeometry args={[0.34, 0.05, 0.08]} />
                    <meshStandardMaterial color={accentColor} metalness={0.9} />
                  </mesh>
                  {/* Massive Buster Blade Spine */}
                  <mesh position={[0, 0.95, 0]}>
                    <boxGeometry args={[0.038, 1.25, 0.22]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.12} />
                  </mesh>
                  {/* Glowing Energy Cutting Edge */}
                  <mesh position={[0, 0.95, 0.115]}>
                    <boxGeometry args={[0.016, 1.22, 0.02]} />
                    <meshStandardMaterial
                      ref={bladeEdgeMatRef}
                      color="#ec4899"
                      emissive="#ec4899"
                      emissiveIntensity={dynamicEmissiveIntensity * 1.2}
                    />
                  </mesh>
                </group>
              ) : isPlayer && equippedWeapon === 'glaive' ? (
                // Player: Twin-Edged Glaive / Naginata
                <group>
                  {/* Long Center Polearm Shaft */}
                  <mesh position={[0, 0.35, 0]}>
                    <cylinderGeometry args={[0.024, 0.024, 1.9, 8]} />
                    <meshStandardMaterial color="#0f172a" metalness={0.9} />
                  </mesh>
                  {/* Top Blade */}
                  <mesh position={[0, 1.45, 0]}>
                    <boxGeometry args={[0.018, 0.65, 0.07]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.95} />
                  </mesh>
                  <mesh position={[0, 1.45, 0.04]}>
                    <boxGeometry args={[0.009, 0.62, 0.016]} />
                    <meshStandardMaterial
                      ref={bladeEdgeMatRef}
                      color="#10b981"
                      emissive="#10b981"
                      emissiveIntensity={dynamicEmissiveIntensity}
                    />
                  </mesh>
                  {/* Bottom Counter-Blade */}
                  <mesh position={[0, -0.75, 0]}>
                    <boxGeometry args={[0.018, 0.45, 0.06]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.95} />
                  </mesh>
                  <mesh position={[0, -0.75, -0.035]}>
                    <boxGeometry args={[0.009, 0.42, 0.014]} />
                    <meshStandardMaterial
                      color="#10b981"
                      emissive="#10b981"
                      emissiveIntensity={dynamicEmissiveIntensity}
                    />
                  </mesh>
                </group>
              ) : (
                // Player (Katana / Dual Blades Main) & Grunt / Elite: Cyber Katana
                <group>
                  {/* Hilt */}
                  <mesh position={[0, 0.1, 0]}>
                    <cylinderGeometry args={[0.025, 0.025, 0.25, 8]} />
                    <meshStandardMaterial color="#0b1120" metalness={0.9} />
                  </mesh>
                  {/* Tsuba / Guard */}
                  <mesh position={[0, 0.23, 0]}>
                    <cylinderGeometry args={[0.075, 0.075, 0.02, 12]} />
                    <meshStandardMaterial color={accentColor} metalness={0.9} />
                  </mesh>
                  {/* Blade Spine */}
                  <mesh position={[0, 0.74, 0]}>
                    <boxGeometry args={[0.022, 1.02, 0.065]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.08} />
                  </mesh>
                  {/* Glowing Laser Edge */}
                  <mesh position={[0, 0.74, 0.038]}>
                    <boxGeometry args={[0.01, 1.0, 0.018]} />
                    <meshStandardMaterial
                      ref={bladeEdgeMatRef}
                      color={baseEmissiveColor}
                      emissive={baseEmissiveColor}
                      emissiveIntensity={dynamicEmissiveIntensity}
                    />
                  </mesh>
                </group>
              )}
            </group>
          </group>
        </group>
      </group>

      {/* Left Leg Assembly */}
      <group ref={leftLegRef} position={[-0.14, 0.82, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <cylinderGeometry args={[isBrute ? 0.095 : 0.075, 0.065, 0.38, 8]} />
          <meshStandardMaterial color={armorColor} roughness={0.3} metalness={0.8} />
        </mesh>
        <group ref={leftShinRef} position={[0, -0.4, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.055, 0.38, 8]} />
            <meshStandardMaterial color={armorColor} roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Foot */}
          <mesh position={[0, -0.39, 0.06]} castShadow>
            <boxGeometry args={[0.11, 0.075, 0.22]} />
            <meshStandardMaterial color={accentColor} metalness={0.85} />
          </mesh>
        </group>
      </group>

      {/* Right Leg Assembly */}
      <group ref={rightLegRef} position={[0.14, 0.82, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <cylinderGeometry args={[isBrute ? 0.095 : 0.075, 0.065, 0.38, 8]} />
          <meshStandardMaterial color={armorColor} roughness={0.3} metalness={0.8} />
        </mesh>
        <group ref={rightShinRef} position={[0, -0.4, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.055, 0.38, 8]} />
            <meshStandardMaterial color={armorColor} roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Foot */}
          <mesh position={[0, -0.39, 0.06]} castShadow>
            <boxGeometry args={[0.11, 0.075, 0.22]} />
            <meshStandardMaterial color={accentColor} metalness={0.85} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
