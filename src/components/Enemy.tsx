import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ProceduralGladiator } from './ProceduralGladiator';
import { CombatState, EnemyData } from '../types';
import { Html } from '@react-three/drei';

interface EnemyProps {
  data: EnemyData;
  isTargeted: boolean;
  canExecute: boolean;
}

export const Enemy: React.FC<EnemyProps> = ({ data, isTargeted, canExecute }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Map enemy AI state to visual combat state for the procedural gladiator
  const getVisualCombatState = (state: EnemyData['state']): CombatState => {
    switch (state) {
      case 'approach':
      case 'patrol':
        return 'run';
      case 'windup':
        return 'heavy_charge';
      case 'attack':
        return 'heavy_strike';
      case 'staggered':
        return 'stagger';
      case 'stagger_heavy':
        return 'stagger_heavy';
      case 'poise_broken':
        return 'stagger';
      case 'poise_recovering':
        return 'guard_break_recovery';
      case 'dead':
      case 'executed':
        return 'dead';
      default:
        return 'idle';
    }
  };

  const visualState = getVisualCombatState(data.state);
  const isExecuted = data.state === 'executed';
  const isPoiseBroken = data.state === 'poise_broken';
  const isStaggered = data.state === 'staggered';
  const isHeavyStaggered = data.state === 'stagger_heavy';
  const isGuardBreakRecovery = data.state === 'poise_recovering';

  useFrame(() => {
    if (!groupRef.current) return;
    // Sync transform smoothly
    groupRef.current.position.set(data.position[0], data.position[1], data.position[2]);
    groupRef.current.rotation.y = data.rotation;
  });

  const healthPct = Math.max(0, (data.health / data.maxHealth) * 100);
  const posturePct = Math.min(100, (data.posture / data.maxPosture) * 100);

  return (
    <group ref={groupRef} position={data.position}>
      {/* 3D Model */}
      <ProceduralGladiator
        isPlayer={false}
        enemyType={data.type}
        combatState={visualState}
        animationProgress={isExecuted ? data.stateTimer : Math.min(1, data.stateTimer)}
        isStaggered={isStaggered}
        isHeavyStaggered={isHeavyStaggered}
        isPoiseBroken={isPoiseBroken}
        isGuardBreakRecovery={isGuardBreakRecovery}
        isTelegraphing={data.isUnblockable && data.state === 'windup'}
        bladeTrailActive={data.state === 'attack'}
        isExecuted={isExecuted}
      />

      {/* Target Marker & Arkham-style Counter/Finisher indicator */}
      {isTargeted && !isExecuted && (
        <group position={[0, 0.05, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={data.type === 'boss' ? [1.8, 2.05, 32] : [1.0, 1.15, 24]} />
            <meshBasicMaterial color={canExecute ? '#ef4444' : '#38bdf8'} />
          </mesh>
        </group>
      )}

      {/* Overhead Posture & Health Bar HUD (hidden for boss since HUD has top bar, but show [E] prompt) */}
      {!isExecuted && (
        <Html position={[0, data.type === 'boss' ? 3.4 : 2.35, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
          <div className="flex flex-col items-center gap-1 w-24">
            {/* Execution Prompt [E] when posture broken */}
            {isPoiseBroken && (
              <div className="animate-bounce bg-red-600 text-white font-extrabold px-3 py-1 rounded text-xs tracking-wider shadow-[0_0_15px_#ef4444] border border-red-300 whitespace-nowrap">
                [E] EXECUTE
              </div>
            )}

            {/* Health Bar (Red/Orange) - only for non-boss enemies */}
            {data.type !== 'boss' && (
              <>
                <div className="w-full h-1.5 bg-slate-950/80 rounded-full overflow-hidden border border-slate-700/60 p-[1px]">
                  <div
                    className={`h-full transition-all duration-75 rounded-full ${
                      data.type === 'brute' ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${healthPct}%` }}
                  />
                </div>

                {/* Posture / Poise Meter (Yellow / Gold) */}
                <div className="w-full h-1 bg-slate-950/80 rounded-full overflow-hidden border border-slate-700/40">
                  <div
                    className={`h-full transition-all duration-75 rounded-full ${
                      isPoiseBroken ? 'bg-red-400 animate-pulse' : 'bg-amber-400'
                    }`}
                    style={{ width: `${posturePct}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
