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
  const addLaserBeam = useGameStore((s) => s.addLaserBeam);
  const addShockwave = useGameStore((s) => s.addShockwave);
  const triggerHitFX = useGameStore((s) => s.triggerHitFX);
  const triggerShake = useGameStore((s) => s.triggerShake);
  const setBossStats = useGameStore((s) => s.setBossStats);
  const addCredits = useGameStore((s) => s.addCredits);
  const addFloatingText = useGameStore((s) => s.addFloatingText);

  const enemiesRef = useRef<EnemyData[]>([]);
  const [, setRenderTrigger] = React.useState(0);

  // Spawn wave composition based on current wave number
  useEffect(() => {
    if (waveStatus !== 'active') return;

    const list: EnemyData[] = [];
    const isBossWave = wave > 0 && wave % 5 === 0;

    if (isBossWave) {
      // 1. BOSS FIGHT: Apex Cyber Warlord
      const bossHealth = 550 + wave * 75;
      const bossPosture = 260;
      const bossId = `boss_${wave}_${Math.random().toString(36).substring(2, 6)}`;

      list.push({
        id: bossId,
        type: 'boss',
        position: [0, 0, -8],
        rotation: 0,
        health: bossHealth,
        maxHealth: bossHealth,
        posture: 0,
        maxPosture: bossPosture,
        state: 'approach',
        stateTimer: 0,
        isUnblockable: true,
        staggerDuration: 0,
        velocity: [0, 0, 0],
      });

      // 2 escort guards
      for (let i = 0; i < 2; i++) {
        const angle = i === 0 ? -Math.PI * 0.4 : Math.PI * 0.4;
        list.push({
          id: `escort_${wave}_${i}`,
          type: 'elite',
          position: [Math.sin(angle) * 7, 0, Math.cos(angle) * 7],
          rotation: angle + Math.PI,
          health: 120,
          maxHealth: 120,
          posture: 0,
          maxPosture: 90,
          state: 'approach',
          stateTimer: 0,
          isUnblockable: false,
          staggerDuration: 0,
          velocity: [0, 0, 0],
        });
      }

      soundEngine.playBossSpawn();
      setBossStats({
        id: bossId,
        name: 'APEX CYBER WARLORD',
        health: bossHealth,
        maxHealth: bossHealth,
        posture: 0,
        maxPosture: bossPosture,
        phase: 1,
      });
    } else {
      // Standard enemy wave
      setBossStats(null);
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
    }

    enemiesRef.current = list;
    onEnemiesUpdate(list);
    setRenderTrigger((c) => c + 1);
  }, [wave, waveStatus, setBossStats]);

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
          if (e.type === 'boss') {
            setBossStats(null);
            addCredits(1500);
            addFloatingText('BOSS SLAIN! +1500 CR', [e.position[0], 2.5, e.position[2]], '#fbbf24', 2.0);
          }
          continue;
        }
        remainingEnemies.push(e);
        continue;
      }

      // Regular dead
      if (e.health <= 0 || e.state === 'dead') {
        enemyKilled();
        hasChanges = true;
        if (e.type === 'boss') {
          setBossStats(null);
          addCredits(1500);
          addFloatingText('APEX WARLORD DEFEATED! +1500 CR', [e.position[0], 2.5, e.position[2]], '#fbbf24', 2.0);
          triggerShake(0.8, 0.5);
          soundEngine.playWaveCleared();
        }
        continue;
      }

      const isBoss = e.type === 'boss';

      // Sync active boss stats to HUD
      if (isBoss) {
        const phase = e.health <= e.maxHealth * 0.5 ? 2 : 1;
        setBossStats({
          id: e.id,
          name: phase === 2 ? 'APEX WARLORD // OVERCHARGED' : 'APEX CYBER WARLORD',
          health: e.health,
          maxHealth: e.maxHealth,
          posture: e.posture,
          maxPosture: e.maxPosture,
          phase,
        });
      }

      // Apply physics velocity if any (e.g. knockback)
      if (e.velocity[0] !== 0 || e.velocity[2] !== 0) {
        e.position[0] += e.velocity[0] * delta;
        e.position[2] += e.velocity[2] * delta;
        e.velocity[0] *= isBoss ? 0.75 : 0.88;
        e.velocity[2] *= isBoss ? 0.75 : 0.88;
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

      // 2. STAGGERED & HEAVY STAGGER
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

      e.rotation = THREE.MathUtils.lerp(e.rotation, angleToPlayer, (isBoss ? 5 : 8) * delta);

      const isBrute = e.type === 'brute';
      const attackRange = isBoss ? 3.0 : isBrute ? 2.4 : 1.9;
      const moveSpeed = isBoss ? 3.2 : isBrute ? 2.8 : e.type === 'elite' ? 4.8 : 3.8;

      // 3. APPROACH / FLANKING
      if (e.state === 'approach') {
        // Special Boss attack selection based on distance
        if (isBoss) {
          if (distToPlayer > 5.5 && Math.random() < 0.04) {
            // Initiate Laser Charge or Jump Slam
            if (Math.random() < 0.55) {
              e.state = 'laser_charge';
              e.stateTimer = 0;
              soundEngine.playLaserCharge();
            } else {
              e.state = 'jump_slam';
              e.stateTimer = 0;
              soundEngine.playDangerTelegraph();
            }
          } else if (distToPlayer > attackRange) {
            const dirX = Math.sin(angleToPlayer);
            const dirZ = Math.cos(angleToPlayer);
            e.position[0] += dirX * moveSpeed * delta;
            e.position[2] += dirZ * moveSpeed * delta;
          } else {
            // Close range boss attack
            e.state = 'windup';
            e.stateTimer = 0;
            soundEngine.playDangerTelegraph();
          }
        } else {
          // Standard enemies
          if (distToPlayer > attackRange) {
            const dirX = Math.sin(angleToPlayer);
            const dirZ = Math.cos(angleToPlayer);
            e.position[0] += dirX * moveSpeed * delta;
            e.position[2] += dirZ * moveSpeed * delta;
          } else {
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
      }

      // 4. BOSS LASER CHARGE
      else if (e.state === 'laser_charge') {
        const chargeDuration = 0.85;
        e.stateTimer += delta / chargeDuration;

        // Render scarlet targeting guide laser
        addLaserBeam({
          start: [e.position[0], 1.8, e.position[2]],
          end: [playerPos.x, 1.1, playerPos.z],
          color: '#f43f5e',
          width: 0.06,
          duration: 0.1,
        });

        if (e.stateTimer >= 1.0) {
          e.state = 'laser_sweep';
          e.stateTimer = 0;
          soundEngine.playLaserFire(true);
        }
      }

      // 5. BOSS LASER SWEEP
      else if (e.state === 'laser_sweep') {
        const sweepDuration = 0.75;
        e.stateTimer += delta / sweepDuration;

        // Sweeping beam across player position
        const sweepAngle = e.rotation + (e.stateTimer - 0.5) * Math.PI * 0.9;
        const beamDist = 18;
        const beamEndX = e.position[0] + Math.sin(sweepAngle) * beamDist;
        const beamEndZ = e.position[2] + Math.cos(sweepAngle) * beamDist;

        addLaserBeam({
          start: [e.position[0], 1.8, e.position[2]],
          end: [beamEndX, 0.4, beamEndZ],
          color: '#ef4444',
          width: 0.35,
          duration: 0.12,
        });

        // Player laser collision check
        const diffAngle = Math.abs(sweepAngle - angleToPlayer);
        if (diffAngle < 0.18 && distToPlayer <= beamDist) {
          const blocked = takeDamage(28, 35, true);
          triggerHitFX([playerPos.x, 1.1, playerPos.z], 'blood', 18, '#dc2626');
          triggerShake(0.65, 0.3);
        }

        if (e.stateTimer >= 1.0) {
          e.state = 'recovery';
          e.stateTimer = 1.0;
        }
      }

      // 6. BOSS JUMP SLAM
      else if (e.state === 'jump_slam') {
        const jumpDuration = 1.0;
        e.stateTimer += delta / jumpDuration;

        // Parabolic jump trajectory
        e.position[1] = Math.sin(Math.min(1, e.stateTimer) * Math.PI) * 4.2;

        // Drift towards player in mid-air
        if (e.stateTimer < 0.8) {
          e.position[0] += Math.sin(angleToPlayer) * 5.5 * delta;
          e.position[2] += Math.cos(angleToPlayer) * 5.5 * delta;
        }

        if (e.stateTimer >= 1.0) {
          e.position[1] = 0;
          soundEngine.playBossSmash();
          addShockwave([e.position[0], 0.05, e.position[2]], '#ef4444', 6.5, 0.45);
          triggerShake(0.85, 0.4);

          // AoE crater damage
          if (distToPlayer <= 5.0) {
            takeDamage(36, 45, true);
            triggerHitFX([playerPos.x, 1.1, playerPos.z], 'blood', 20, '#dc2626');
          }

          e.state = 'recovery';
          e.stateTimer = 1.2; // Vulnerable window
        }
      }

      // 7. WINDUP (Telegraph)
      else if (e.state === 'windup') {
        const windupMax = isBoss ? 0.95 : isBrute ? 0.85 : 0.45;
        e.stateTimer += delta / windupMax;

        if (e.stateTimer >= 1.0) {
          e.state = 'attack';
          e.stateTimer = 0;
        }
      }

      // 8. ATTACK STRIKE
      else if (e.state === 'attack') {
        const attackDuration = isBoss ? 0.38 : 0.28;
        e.stateTimer += delta / attackDuration;

        // Hit active frame around 50%
        if (e.stateTimer >= 0.45 && e.stateTimer <= 0.65) {
          if (distToPlayer <= attackRange + 0.8) {
            const damage = isBoss ? 42 : isBrute ? 28 : 14;
            const poiseDmg = isBoss ? 55 : isBrute ? 40 : 18;
            const blocked = takeDamage(damage, poiseDmg, e.isUnblockable);

            if (blocked) {
              // Player deflected/parried attack!
              triggerHitFX([e.position[0], 1.2, e.position[2]], 'spark', 24, '#38bdf8');
              e.state = 'staggered';
              e.stateTimer = isBoss ? 0.4 : 0.6;
              e.posture = Math.min(e.maxPosture, e.posture + (isBoss ? 60 : isBrute ? 45 : 35));

              // Push enemy back
              e.velocity[0] = -Math.sin(angleToPlayer) * (isBoss ? 3 : 6);
              e.velocity[2] = -Math.cos(angleToPlayer) * (isBoss ? 3 : 6);

              if (e.posture >= e.maxPosture) {
                e.state = 'poise_broken';
                e.stateTimer = isBoss ? 5.5 : 4.0;
                soundEngine.playGuardBreak();
              }
            } else {
              // Player took full damage! Spawn blood splatters
              triggerHitFX([playerPos.x, 1.2, playerPos.z], 'blood', 18, '#dc2626');
              triggerShake(isBoss ? 0.75 : 0.45, 0.35);
            }
          }
        }

        if (e.stateTimer >= 1.0) {
          e.state = 'recovery';
          e.stateTimer = isBoss ? 1.1 : isBrute ? 0.9 : 0.5;
        }
      }

      // 9. RECOVERY
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
      setBossStats(null);
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
