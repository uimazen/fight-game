import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import { soundEngine } from '../audio/soundEngine';
import { Enemy } from './Enemy';
import { EnemyData, EnemyType } from '../types';
import { ARENA_RADIUS } from './Arena';

interface EnemyManagerProps {
  playerPos: THREE.Vector3;
  onEnemiesUpdate: (enemies: EnemyData[]) => void;
}

export const EnemyManager: React.FC<EnemyManagerProps> = ({
  playerPos,
  onEnemiesUpdate,
}) => {
  const wave = useGameStore((s) => s.wave);
  const waveStatus = useGameStore((s) => s.waveStatus);
  const setWaveCleared = useGameStore((s) => s.setWaveCleared);
  const takeDamage = useGameStore((s) => s.takeDamage);
  const enemyKilled = useGameStore((s) => s.enemyKilled);
  const targetEnemyId = useGameStore((s) => s.targetEnemyId);
  const canExecuteTarget = useGameStore((s) => s.canExecuteTarget);
  const feedback = useGameStore((s) => s.feedback);
  const executionCinematic = useGameStore((s) => s.executionCinematic);

  const enemiesRef = useRef<EnemyData[]>([]);
  const [, setRenderTrigger] = React.useState(0);

  // Spawn wave composition based on current wave number
  useEffect(() => {
    if (waveStatus !== 'active') return;

    const list: EnemyData[] = [];
    const gruntCount = Math.min(6, 2 + Math.floor(wave * 0.8));
    const bruteCount = wave >= 2 ? Math.min(3, Math.floor(wave / 2)) : 0;
    const eliteCount = wave >= 3 ? Math.min(2, Math.floor((wave - 1) / 2)) : 0;

    const total = gruntCount + bruteCount + eliteCount;

    for (let i = 0; i < total; i++) {
      let type: EnemyType = 'grunt';
      if (i < bruteCount) type = 'brute';
      else if (i < bruteCount + eliteCount) type = 'elite';

      const angle = (i / total) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 7 + Math.random() * 5;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const isBrute = type === 'brute';
      const isElite = type === 'elite';

      list.push({
        id: `enemy_${wave}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        type,
        position: [x, 0, z],
        rotation: angle + Math.PI,
        health: isBrute ? 200 : isElite ? 120 : 80,
        maxHealth: isBrute ? 200 : isElite ? 120 : 80,
        posture: 0,
        maxPosture: isBrute ? 140 : isElite ? 90 : 60,
        state: 'approach',
        stateTimer: 0,
        isUnblockable: isBrute,
        staggerDuration: 0,
        velocity: [0, 0, 0],
      });
    }

    enemiesRef.current = list;
    onEnemiesUpdate(list);
    setRenderTrigger((c) => c + 1);
  }, [wave, waveStatus]);

  // Main AI loop inside useFrame
  useFrame((_, rawDelta) => {
    // Check hitstop freeze
    if (feedback.hitstopRemaining > 0) return;

    const delta = Math.min(rawDelta, 0.05) * feedback.timeDilation;
    const enemies = enemiesRef.current;
    if (enemies.length === 0) return;

    let hasChanges = false;
    const remainingEnemies: EnemyData[] = [];

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];

      // Executed cinematic sequence: keep enemy in place while receiving finisher!
      if (e.state === 'executed') {
        e.stateTimer -= rawDelta;
        if (e.stateTimer <= 0 || !executionCinematic.active) {
          hasChanges = true;
          continue;
        }
        remainingEnemies.push(e);
        continue;
      }

      // Regular dead
      if (e.health <= 0 || e.state === 'dead') {
        enemyKilled();
        hasChanges = true;
        continue;
      }

      // Apply physics velocity if any (e.g. knockback)
      if (e.velocity[0] !== 0 || e.velocity[2] !== 0) {
        e.position[0] += e.velocity[0] * delta;
        e.position[2] += e.velocity[2] * delta;
        e.velocity[0] *= 0.88;
        e.velocity[2] *= 0.88;
        if (Math.abs(e.velocity[0]) < 0.05) e.velocity[0] = 0;
        if (Math.abs(e.velocity[2]) < 0.05) e.velocity[2] = 0;

        // Arena boundary collision bounce
        const currentDist = Math.hypot(e.position[0], e.position[2]);
        if (currentDist > ARENA_RADIUS - 0.8) {
          const normX = e.position[0] / currentDist;
          const normZ = e.position[2] / currentDist;
          e.position[0] = normX * (ARENA_RADIUS - 0.8);
          e.position[2] = normZ * (ARENA_RADIUS - 0.8);
          e.velocity[0] *= -0.5;
          e.velocity[2] *= -0.5;
        }
      }

      // 1. POISE BROKEN STATE (Stunned & ready for execution)
      if (e.state === 'poise_broken') {
        e.stateTimer -= delta;
        if (e.stateTimer <= 0) {
          // Transition into guard-break recovery frame
          e.state = 'poise_recovering';
          e.stateTimer = 0.5;
          e.posture = 0;
        }
        remainingEnemies.push(e);
        continue;
      }

      if (e.state === 'poise_recovering') {
        e.stateTimer -= delta;
        if (e.stateTimer <= 0) {
          e.state = 'approach';
        }
        remainingEnemies.push(e);
        continue;
      }

      // 2. STAGGERED (Light hit reaction) & STAGGER_HEAVY (Heavy knockback reaction)
      if (e.state === 'staggered' || e.state === 'stagger_heavy') {
        e.stateTimer -= delta;
        if (e.stateTimer <= 0) {
          e.state = 'approach';
        }
        remainingEnemies.push(e);
        continue;
      }

      // Distance and angle to player
      const dx = playerPos.x - e.position[0];
      const dz = playerPos.z - e.position[2];
      const distToPlayer = Math.hypot(dx, dz);
      const angleToPlayer = Math.atan2(dx, dz);

      e.rotation = THREE.MathUtils.lerp(e.rotation, angleToPlayer, 8 * delta);

      const isBrute = e.type === 'brute';
      const attackRange = isBrute ? 2.4 : 1.9;
      const moveSpeed = isBrute ? 2.8 : e.type === 'elite' ? 4.8 : 3.8;

      // 3. APPROACH / FLANKING
      if (e.state === 'approach') {
        if (distToPlayer > attackRange) {
          // Move toward player
          const dirX = Math.sin(angleToPlayer);
          const dirZ = Math.cos(angleToPlayer);
          e.position[0] += dirX * moveSpeed * delta;
          e.position[2] += dirZ * moveSpeed * delta;
        } else {
          // Stagger attack initiation so they don't all hit in unison
          const canAttack = Math.random() < 0.35 || distToPlayer < 1.4;
          if (canAttack) {
            e.state = 'windup';
            e.stateTimer = 0;
            if (isBrute) {
              soundEngine.playDangerTelegraph();
            }
          }
        }
      }

      // 4. WINDUP (Telegraph)
      else if (e.state === 'windup') {
        const windupMax = isBrute ? 0.85 : 0.45;
        e.stateTimer += delta / windupMax;

        if (e.stateTimer >= 1.0) {
          e.state = 'attack';
          e.stateTimer = 0;
        }
      }

      // 5. ATTACK STRIKE
      else if (e.state === 'attack') {
        const attackDuration = 0.28;
        e.stateTimer += delta / attackDuration;

        // Hit active frame around 50%
        if (e.stateTimer >= 0.45 && e.stateTimer <= 0.65) {
          // Check range
          if (distToPlayer <= attackRange + 0.6) {
            const damage = isBrute ? 28 : 14;
            const poiseDmg = isBrute ? 40 : 18;
            const blocked = takeDamage(damage, poiseDmg, e.isUnblockable);

            if (blocked) {
              // Player deflected attack!
              e.state = 'staggered';
              e.stateTimer = 0.6;
              e.posture = Math.min(e.maxPosture, e.posture + (isBrute ? 45 : 35));
              // Push enemy back
              e.velocity[0] = -Math.sin(angleToPlayer) * 6;
              e.velocity[2] = -Math.cos(angleToPlayer) * 6;

              if (e.posture >= e.maxPosture) {
                e.state = 'poise_broken';
                e.stateTimer = 4.0;
                soundEngine.playGuardBreak();
              }
            }
          }
        }

        if (e.stateTimer >= 1.0) {
          e.state = 'recovery';
          e.stateTimer = isBrute ? 0.9 : 0.5;
        }
      }

      // 6. RECOVERY
      else if (e.state === 'recovery') {
        e.stateTimer -= delta;
        if (e.stateTimer <= 0) {
          e.state = 'approach';
        }
      }

      // Boundary clamp
      const curDist = Math.hypot(e.position[0], e.position[2]);
      if (curDist > ARENA_RADIUS - 0.8) {
        e.position[0] = (e.position[0] / curDist) * (ARENA_RADIUS - 0.8);
        e.position[2] = (e.position[2] / curDist) * (ARENA_RADIUS - 0.8);
      }

      remainingEnemies.push(e);
    }

    enemiesRef.current = remainingEnemies;
    onEnemiesUpdate(remainingEnemies);

    if (hasChanges) {
      setRenderTrigger((c) => c + 1);
    }

    // Check if wave is completed
    if (remainingEnemies.length === 0 && waveStatus === 'active') {
      setWaveCleared();
    }
  });

  return (
    <group>
      {enemiesRef.current.map((enemy) => (
        <Enemy
          key={enemy.id}
          data={enemy}
          isTargeted={targetEnemyId === enemy.id}
          canExecute={canExecuteTarget && targetEnemyId === enemy.id}
        />
      ))}
    </group>
  );
};
