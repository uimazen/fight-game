import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ProceduralGladiator } from './ProceduralGladiator';
import { useGameStore } from '../store/gameStore';
import { soundEngine } from '../audio/soundEngine';
import { CombatState, EnemyData } from '../types';
import { ARENA_RADIUS } from './Arena';
import { WEAPONS, FINISHERS } from '../data/arsenal';

interface PlayerProps {
  onPositionUpdate: (pos: THREE.Vector3, isMoving: boolean) => void;
  enemies: EnemyData[];
}

export const Player: React.FC<PlayerProps> = ({ onPositionUpdate, enemies }) => {
  const meshRef = useRef<THREE.Group>(null);
  const position = useRef(new THREE.Vector3(0, 0, 0));
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const rotationY = useRef(0);

  // Zustand hooks
  const gameState = useGameStore((s) => s.gameState);
  const registerHitLanded = useGameStore((s) => s.registerHitLanded);
  const setParrying = useGameStore((s) => s.setParrying);
  const setIFrames = useGameStore((s) => s.setIFrames);
  const setTargetEnemy = useGameStore((s) => s.setTargetEnemy);
  const feedback = useGameStore((s) => s.feedback);

  // Shop & Progression hooks
  const equippedWeapon = useGameStore((s) => s.equippedWeapon);
  const equippedFinisher = useGameStore((s) => s.equippedFinisher);
  const upgrades = useGameStore((s) => s.upgrades);
  const toggleShop = useGameStore((s) => s.toggleShop);
  const isShopOpen = useGameStore((s) => s.isShopOpen);
  const startCinematicExecution = useGameStore((s) => s.startCinematicExecution);
  const updateExecutionCinematic = useGameStore((s) => s.updateExecutionCinematic);
  const endCinematicExecution = useGameStore((s) => s.endCinematicExecution);

  // Combat State & Animation
  const [combatState, setCombatState] = useState<CombatState>('idle');
  const animProgress = useRef(0);
  const inputBuffer = useRef<string | null>(null);
  const canCancelRecovery = useRef(false);
  const attackHitsDealt = useRef(false);

  // Input states
  const keys = useRef<{ [key: string]: boolean }>({});

  // Nearest enemy finding for Soft-Lock & Finisher
  const findSoftLockEnemy = useCallback(
    (maxAngle = Math.PI * 0.7, maxDist = 6.0): EnemyData | null => {
      let bestEnemy: EnemyData | null = null;
      let closestDist = maxDist;

      const forwardX = Math.sin(rotationY.current);
      const forwardZ = Math.cos(rotationY.current);

      for (const e of enemies) {
        if (e.health <= 0) continue;
        const dx = e.position[0] - position.current.x;
        const dz = e.position[2] - position.current.z;
        const dist = Math.hypot(dx, dz);
        if (dist > maxDist) continue;

        // Angle between player forward and enemy
        const enemyAngle = Math.atan2(dx, dz);
        let diff = Math.abs(rotationY.current - enemyAngle);
        while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);

        if (diff <= maxAngle && dist < closestDist) {
          closestDist = dist;
          bestEnemy = e;
        }
      }
      return bestEnemy;
    },
    [enemies]
  );

  // Look for broken poise enemy nearby for [E] Finisher
  useEffect(() => {
    let executable: EnemyData | null = null;
    let closestDist = 7.0;

    for (const e of enemies) {
      if (e.state === 'poise_broken' && e.health > 0) {
        const dist = Math.hypot(e.position[0] - position.current.x, e.position[2] - position.current.z);
        if (dist < closestDist) {
          closestDist = dist;
          executable = e;
        }
      }
    }

    if (executable) {
      setTargetEnemy(executable.id, true);
    } else {
      const nearest = findSoftLockEnemy(Math.PI, 5.0);
      setTargetEnemy(nearest ? nearest.id : null, false);
    }
  }, [enemies, findSoftLockEnemy, setTargetEnemy]);

  // COMBAT ACTIONS
  const startLightAttack = useCallback((comboStep: 'light_1' | 'light_2' | 'light_3') => {
    setCombatState(comboStep);
    animProgress.current = 0;
    attackHitsDealt.current = false;
    canCancelRecovery.current = false;

    // Play synthesized swing sound
    const pitch = comboStep === 'light_1' ? 1.0 : comboStep === 'light_2' ? 1.2 : 1.4;
    soundEngine.playWhoosh(pitch, false);

    // Arkham-style Target Magnetism: gently glide towards targeted enemy
    const target = findSoftLockEnemy(Math.PI * 0.6, 5.5);
    if (target) {
      const dx = target.position[0] - position.current.x;
      const dz = target.position[2] - position.current.z;
      const targetAngle = Math.atan2(dx, dz);
      rotationY.current = targetAngle;

      // Lunge towards enemy (up to 2.2 units)
      const dist = Math.hypot(dx, dz);
      const lungeDist = Math.min(2.0, Math.max(0, dist - 1.2));
      velocity.current.x += Math.sin(targetAngle) * (lungeDist * 4);
      velocity.current.z += Math.cos(targetAngle) * (lungeDist * 4);
    } else {
      // Small forward step
      velocity.current.x += Math.sin(rotationY.current) * 3;
      velocity.current.z += Math.cos(rotationY.current) * 3;
    }
  }, [findSoftLockEnemy]);

  const startHeavyAttack = useCallback(() => {
    setCombatState('heavy_charge');
    animProgress.current = 0;
    attackHitsDealt.current = false;
    canCancelRecovery.current = false;
    soundEngine.playWhoosh(0.75, false);

    // Magnetism
    const target = findSoftLockEnemy(Math.PI * 0.7, 6.0);
    if (target) {
      const dx = target.position[0] - position.current.x;
      const dz = target.position[2] - position.current.z;
      rotationY.current = Math.atan2(dx, dz);
    }
  }, [findSoftLockEnemy]);

  const startDash = useCallback(() => {
    setCombatState('dash');
    animProgress.current = 0;
    setIFrames(true);
    soundEngine.playWhoosh(1.3, true);

    // Direction of dash
    let dashDirX = Math.sin(rotationY.current);
    let dashDirZ = Math.cos(rotationY.current);
    let moveX = 0;
    let moveZ = 0;
    if (keys.current['KeyW'] || keys.current['ArrowUp']) moveZ -= 1;
    if (keys.current['KeyS'] || keys.current['ArrowDown']) moveZ += 1;
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) moveX -= 1;
    if (keys.current['KeyD'] || keys.current['ArrowRight']) moveX += 1;

    if (moveX !== 0 || moveZ !== 0) {
      const len = Math.hypot(moveX, moveZ);
      dashDirX = moveX / len;
      dashDirZ = moveZ / len;
      rotationY.current = Math.atan2(dashDirX, dashDirZ);
    }

    // High velocity burst
    const dashSpeed = 16.5;
    velocity.current.set(dashDirX * dashSpeed, 0, dashDirZ * dashSpeed);
  }, [setIFrames]);

  const startParry = useCallback(() => {
    setCombatState('parry');
    animProgress.current = 0;
    setParrying(true);
    soundEngine.playWhoosh(1.8, false);

    // Stop velocity abruptly for guard stance
    velocity.current.multiplyScalar(0.2);
  }, [setParrying]);

  const startExecution = useCallback(() => {
    // Find poised broken target
    const target = enemies.find(
      (e) =>
        e.state === 'poise_broken' &&
        e.health > 0 &&
        Math.hypot(e.position[0] - position.current.x, e.position[2] - position.current.z) < 7.0
    );

    if (!target) return;

    const finisher = FINISHERS[equippedFinisher] || FINISHERS.omni_slash;

    setCombatState('execution');
    animProgress.current = 0;

    // Instantly warp / slide directly in front of target
    const dx = target.position[0] - position.current.x;
    const dz = target.position[2] - position.current.z;
    const angle = Math.atan2(dx, dz);
    rotationY.current = angle;

    // Position player right before enemy
    position.current.set(
      target.position[0] - Math.sin(angle) * 1.15,
      0,
      target.position[2] - Math.cos(angle) * 1.15
    );
    velocity.current.set(0, 0, 0);

    // Fatal damage to target - preserve during execution sequence
    target.health = 0;
    target.state = 'executed';
    target.stateTimer = finisher.duration;

    startCinematicExecution(
      target.id,
      target.type,
      [position.current.x, position.current.y, position.current.z],
      [target.position[0], 1.2, target.position[2]]
    );
  }, [enemies, equippedFinisher, startCinematicExecution]);

  // KEYBOARD & MOUSE EVENT LISTENERS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle shop in play or pause
      if (e.code === 'KeyB') {
        e.preventDefault();
        toggleShop();
        return;
      }

      if (gameState !== 'playing' || isShopOpen) return;
      keys.current[e.code] = true;

      // Dash / Evade (cancels recovery frames)
      if (e.code === 'Space') {
        e.preventDefault();
        if (combatState === 'idle' || combatState === 'run' || canCancelRecovery.current) {
          startDash();
        } else {
          inputBuffer.current = 'dash';
        }
      }

      // Timed Parry (F)
      if (e.code === 'KeyF') {
        e.preventDefault();
        if (combatState === 'idle' || combatState === 'run') {
          startParry();
        }
      }

      // Finisher / Execution (E)
      if (e.code === 'KeyE') {
        e.preventDefault();
        startExecution();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (gameState !== 'playing') return;

      // Left Click: Light Attack
      if (e.button === 0) {
        if (combatState === 'idle' || combatState === 'run') {
          startLightAttack('light_1');
        } else if (canCancelRecovery.current || animProgress.current > 0.65) {
          // Buffer next string
          if (combatState === 'light_1') inputBuffer.current = 'light_2';
          else if (combatState === 'light_2') inputBuffer.current = 'light_3';
          else if (combatState === 'light_3') inputBuffer.current = 'light_1';
        } else {
          // Input buffering window
          inputBuffer.current = 'light_next';
        }
      }

      // Right Click: Heavy Attack
      if (e.button === 2) {
        e.preventDefault();
        if (combatState === 'idle' || combatState === 'run' || canCancelRecovery.current) {
          startHeavyAttack();
        } else {
          inputBuffer.current = 'heavy';
        }
      }

      // Middle Click: Parry
      if (e.button === 1) {
        e.preventDefault();
        if (combatState === 'idle' || combatState === 'run') {
          startParry();
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent browser context menu on RMB
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [
    gameState,
    combatState,
    startDash,
    startLightAttack,
    startHeavyAttack,
    startParry,
    startExecution,
  ]);

  // FRAME UPDATE LOOP
  useFrame((_, rawDelta) => {
    // Check hitstop micro-freeze
    if (feedback.hitstopRemaining > 0) return;

    const delta = Math.min(rawDelta, 0.05) * feedback.timeDilation;
    let isMoving = false;

    // 1. INPUT LOCOMOTION (WASD / Arrow Keys)
    if (combatState === 'idle' || combatState === 'run') {
      let moveX = 0;
      let moveZ = 0;
      if (keys.current['KeyW'] || keys.current['ArrowUp']) moveZ -= 1;
      if (keys.current['KeyS'] || keys.current['ArrowDown']) moveZ += 1;
      if (keys.current['KeyA'] || keys.current['ArrowLeft']) moveX -= 1;
      if (keys.current['KeyD'] || keys.current['ArrowRight']) moveX += 1;

      if (moveX !== 0 || moveZ !== 0) {
        isMoving = true;
        const len = Math.hypot(moveX, moveZ);
        const normX = moveX / len;
        const normZ = moveZ / len;

        // Correct character facing angle: W (0, -1) -> PI, S (0, 1) -> 0, A (-1, 0) -> -PI/2, D (1, 0) -> PI/2
        const targetAngle = Math.atan2(normX, normZ);

        // Shortest arc interpolation so the model never spins 360 degrees
        let diff = targetAngle - rotationY.current;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        rotationY.current += diff * Math.min(1, 16 * delta);

        const runSpeed = 7.5;
        velocity.current.x = THREE.MathUtils.lerp(
          velocity.current.x,
          normX * runSpeed,
          14 * delta
        );
        velocity.current.z = THREE.MathUtils.lerp(
          velocity.current.z,
          normZ * runSpeed,
          14 * delta
        );

        if (combatState !== 'run') setCombatState('run');
      } else {
        velocity.current.multiplyScalar(0.7);
        if (combatState === 'run') setCombatState('idle');
      }
    } else {
      // Attacks and dash have custom friction/drag
      velocity.current.multiplyScalar(0.85);
    }

    // 2. COMBAT STATE LIFECYCLES & HIT-CONFIRM CHECKS
    const p = animProgress.current;

    // LIGHT ATTACK 1
    if (combatState === 'light_1') {
      const dur = 0.32;
      animProgress.current += delta / dur;

      // Hit-confirm window at 40%-65% of animation
      if (p >= 0.4 && !attackHitsDealt.current) {
        attackHitsDealt.current = true;
        checkHitCollision(22, 20, 2.2, 'light_1');
      }

      // Recovery window opens at 65% (cancelable by dodge or next attack)
      if (p >= 0.65) canCancelRecovery.current = true;

      if (animProgress.current >= 1.0) {
        if (inputBuffer.current === 'light_2' || inputBuffer.current === 'light_next') {
          inputBuffer.current = null;
          startLightAttack('light_2');
        } else if (inputBuffer.current === 'dash') {
          inputBuffer.current = null;
          startDash();
        } else {
          setCombatState('idle');
        }
      }
    }

    // LIGHT ATTACK 2
    else if (combatState === 'light_2') {
      const dur = 0.34;
      animProgress.current += delta / dur;

      if (p >= 0.4 && !attackHitsDealt.current) {
        attackHitsDealt.current = true;
        checkHitCollision(32, 28, 2.4, 'light_2');
      }

      if (p >= 0.65) canCancelRecovery.current = true;

      if (animProgress.current >= 1.0) {
        if (inputBuffer.current === 'light_3' || inputBuffer.current === 'light_next') {
          inputBuffer.current = null;
          startLightAttack('light_3');
        } else if (inputBuffer.current === 'dash') {
          inputBuffer.current = null;
          startDash();
        } else {
          setCombatState('idle');
        }
      }
    }

    // LIGHT ATTACK 3 (Finisher overhead cleave / spin kick)
    else if (combatState === 'light_3') {
      const dur = 0.52;
      animProgress.current += delta / dur;

      if (p >= 0.45 && !attackHitsDealt.current) {
        attackHitsDealt.current = true;
        checkHitCollision(58, 48, 2.8, 'light_3', true);
      }

      if (p >= 0.75) canCancelRecovery.current = true;

      if (animProgress.current >= 1.0) {
        if (inputBuffer.current === 'dash') {
          inputBuffer.current = null;
          startDash();
        } else {
          setCombatState('idle');
        }
      }
    }

    // HEAVY ATTACK CHARGE & STRIKE
    else if (combatState === 'heavy_charge') {
      const chargeDur = 0.28;
      animProgress.current += delta / chargeDur;
      if (animProgress.current >= 1.0) {
        setCombatState('heavy_strike');
        animProgress.current = 0;
        attackHitsDealt.current = false;
        // Forward lunge
        velocity.current.x += Math.sin(rotationY.current) * 6;
        velocity.current.z += Math.cos(rotationY.current) * 6;
      }
    } else if (combatState === 'heavy_strike') {
      const strikeDur = 0.45;
      animProgress.current += delta / strikeDur;

      if (p >= 0.35 && !attackHitsDealt.current) {
        attackHitsDealt.current = true;
        // Guard-breaker: 65 damage, 75 posture damage, heavy knockback
        checkHitCollision(65, 75, 2.8, 'heavy', true);
      }

      if (animProgress.current >= 1.0) {
        setCombatState('idle');
      }
    }

    // DASH (I-FRAMES)
    else if (combatState === 'dash') {
      const dashDur = 0.35;
      animProgress.current += delta / dashDur;

      // I-Frames active for first 75% of dash
      if (animProgress.current > 0.75) {
        setIFrames(false);
      }

      if (animProgress.current >= 1.0) {
        setIFrames(false);
        setCombatState('idle');
      }
    }

    // PARRY
    else if (combatState === 'parry') {
      const parryDur = 0.38;
      animProgress.current += delta / parryDur;

      // Deflection window is active during first 240ms
      if (animProgress.current > 0.65) {
        setParrying(false);
      }

      if (animProgress.current >= 1.0) {
        setParrying(false);
        setCombatState('idle');
      }
    }

    // EXECUTION FINISHER
    else if (combatState === 'execution') {
      const finisher = FINISHERS[equippedFinisher] || FINISHERS.omni_slash;
      const execDur = finisher.duration || 2.2;
      const clampedRawDelta = Math.min(rawDelta, 0.05);
      animProgress.current += clampedRawDelta / execDur;
      updateExecutionCinematic(clampedRawDelta);

      // Physical hero acrobatics during finisher
      if (equippedFinisher === 'judgement_guillotine') {
        const p = animProgress.current;
        if (p > 0.25 && p < 0.65) {
          position.current.y = Math.sin(((p - 0.25) / 0.4) * Math.PI) * 2.8;
        } else {
          position.current.y = 0;
        }
      } else if (equippedFinisher === 'thunderclap') {
        const p = animProgress.current;
        if (p > 0.35 && p < 0.55) {
          position.current.x += Math.sin(rotationY.current) * clampedRawDelta * 7;
          position.current.z += Math.cos(rotationY.current) * clampedRawDelta * 7;
        }
      }

      if (animProgress.current >= 0.99) {
        position.current.y = 0;
        setCombatState('idle');
        endCinematicExecution();
      }
    }

    // 3. APPLY POSITION & BOUNDARY COLLISION
    position.current.x += velocity.current.x * delta;
    position.current.z += velocity.current.z * delta;

    // Arena Perimeter Shock-fence Bounce
    const distFromCenter = Math.hypot(position.current.x, position.current.z);
    if (distFromCenter > ARENA_RADIUS - 0.7) {
      const normX = position.current.x / distFromCenter;
      const normZ = position.current.z / distFromCenter;
      position.current.x = normX * (ARENA_RADIUS - 0.7);
      position.current.z = normZ * (ARENA_RADIUS - 0.7);
      velocity.current.x *= -0.3;
      velocity.current.z *= -0.3;
    }

    // Sync mesh transform
    if (meshRef.current) {
      meshRef.current.position.copy(position.current);
      meshRef.current.rotation.y = rotationY.current;
    }

    // Notify camera & parent
    onPositionUpdate(position.current, isMoving);
  });

  // Hit detection helper
  const checkHitCollision = (
    baseDamage: number,
    basePostureDmg: number,
    baseRange: number,
    type: 'light_1' | 'light_2' | 'light_3' | 'heavy',
    heavyKnockback = false
  ) => {
    const currentWeapon = WEAPONS[equippedWeapon] || WEAPONS.katana;
    const dmgMult = currentWeapon.damageMultiplier * (1 + (upgrades.damage || 0) * 0.25);
    const damage = Math.round(baseDamage * dmgMult);
    const postureDmg = Math.round(basePostureDmg * (1 + (upgrades.damage || 0) * 0.2));
    const range = baseRange * currentWeapon.rangeMultiplier;

    const forwardX = Math.sin(rotationY.current);
    const forwardZ = Math.cos(rotationY.current);

    for (const e of enemies) {
      if (e.health <= 0) continue;
      const dx = e.position[0] - position.current.x;
      const dz = e.position[2] - position.current.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= range) {
        // Check cone angle
        const dot = (dx * forwardX + dz * forwardZ) / dist;
        if (dot > 0.25) {
          // Hit connects!
          e.health = Math.max(0, e.health - damage);
          e.posture = Math.min(e.maxPosture, e.posture + postureDmg);

          // Knockback
          const knockForce = heavyKnockback ? 10 : 4.5;
          e.velocity[0] = Math.sin(rotationY.current) * knockForce;
          e.velocity[2] = Math.cos(rotationY.current) * knockForce;

          // Check poise break
          if (e.posture >= e.maxPosture) {
            e.state = 'poise_broken';
            e.stateTimer = 4.5;
            soundEngine.playGuardBreak();
          } else {
            e.state = heavyKnockback ? 'stagger_heavy' : 'staggered';
            e.stateTimer = heavyKnockback ? 0.55 : 0.28;
          }

          registerHitLanded(
            e.id,
            damage,
            postureDmg,
            [e.position[0], 1.2, e.position[2]],
            type
          );
        }
      }
    }
  };

  const combo = useGameStore((s) => s.combo);
  const styleRank = useGameStore((s) => s.styleRank);
  const parryWindowActive = useGameStore((s) => s.parryWindowActive);

  return (
    <group ref={meshRef}>
      <ProceduralGladiator
        isPlayer={true}
        combatState={combatState}
        animationProgress={animProgress.current}
        isInvulnerable={combatState === 'dash'}
        bladeTrailActive={
          combatState === 'light_1' ||
          combatState === 'light_2' ||
          combatState === 'light_3' ||
          combatState === 'heavy_strike'
        }
        isParrying={combatState === 'parry'}
        parryWindowActive={parryWindowActive}
        combo={combo}
        styleRank={styleRank}
        equippedWeapon={equippedWeapon}
        finisherId={equippedFinisher}
      />
    </group>
  );
};
