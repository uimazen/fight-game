import React, { useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Arena } from './Arena';
import { Player } from './Player';
import { EnemyManager } from './EnemyManager';
import { CombatFX } from './CombatFX';
import { GameCamera } from './GameCamera';
import { PostProcessingEffects } from './PostProcessingEffects';
import { useGameStore } from '../store/gameStore';
import { EnemyData } from '../types';

export const GameScene: React.FC = () => {
  const [playerPos, setPlayerPos] = useState(new THREE.Vector3(0, 0, 0));
  const [isPlayerMoving, setIsPlayerMoving] = useState(false);
  const [enemies, setEnemies] = useState<EnemyData[]>([]);

  const updateComboTimer = useGameStore((s) => s.updateComboTimer);
  const updateFeedback = useGameStore((s) => s.updateFeedback);
  const executionCinematic = useGameStore((s) => s.executionCinematic);
  const endCinematicExecution = useGameStore((s) => s.endCinematicExecution);

  // Position callback
  const handlePlayerPosition = useCallback((pos: THREE.Vector3, moving: boolean) => {
    setPlayerPos((prev) => {
      prev.copy(pos);
      return prev;
    });
    setIsPlayerMoving(moving);
  }, []);

  // Enemies update callback
  const handleEnemiesUpdate = useCallback((list: EnemyData[]) => {
    setEnemies(list);
  }, []);

  // Frame tick for feedback decay & combo timer
  useFrame((_, delta) => {
    updateComboTimer(delta);
    updateFeedback(delta);

    // Watchdog: auto-recover camera if cinematic finished or progress >= 0.99
    if (executionCinematic.active && executionCinematic.progress >= 0.99) {
      endCinematicExecution();
    }
  });

  // Check if engaged 1v1 (only 1 enemy close)
  const isEngaged1v1 = React.useMemo(() => {
    if (enemies.length === 0) return false;
    let closeCount = 0;
    for (const e of enemies) {
      if (e.health <= 0) continue;
      const d = Math.hypot(e.position[0] - playerPos.x, e.position[2] - playerPos.z);
      if (d < 4.0) closeCount++;
    }
    return closeCount === 1;
  }, [enemies, playerPos]);

  return (
    <>
      <GameCamera
        targetPosition={playerPos}
        isMoving={isPlayerMoving}
        isEngaged1v1={isEngaged1v1}
      />
      <Arena />
      <Player
        onPositionUpdate={handlePlayerPosition}
        enemies={enemies}
      />
      <EnemyManager
        playerPos={playerPos}
        onEnemiesUpdate={handleEnemiesUpdate}
      />
      <CombatFX />
      <PostProcessingEffects />
    </>
  );
};
