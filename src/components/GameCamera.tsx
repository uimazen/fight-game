import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';

interface GameCameraProps {
  targetPosition: THREE.Vector3;
  isMoving: boolean;
  isEngaged1v1: boolean;
}

export const GameCamera: React.FC<GameCameraProps> = ({
  targetPosition,
  isMoving,
  isEngaged1v1,
}) => {
  const { camera } = useThree();
  const feedback = useGameStore((s) => s.feedback);
  const executionCinematic = useGameStore((s) => s.executionCinematic);

  // Scratch vectors to prevent memory allocations in useFrame
  const currentLookAt = useRef(new THREE.Vector3(0, 1.2, 0));
  const desiredCamPos = useRef(new THREE.Vector3(0, 6, 9));

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const clampedDelta = Math.min(delta, 0.05);

    // ==========================================
    // 1. CINEMATIC EXECUTION CAMERA DIRECTING
    // ==========================================
    if (executionCinematic.active) {
      const p = executionCinematic.progress;
      const targetPos = executionCinematic.targetPos;
      const playerPos = executionCinematic.playerPos;

      // Midpoint between combatants
      const midX = (playerPos[0] + targetPos[0]) * 0.5;
      const midZ = (playerPos[2] + targetPos[2]) * 0.5;
      const midY = (playerPos[1] + targetPos[1]) * 0.5;

      // Dynamic orbiting angle & height
      // Sweeps dynamically around the duel axis to show dramatic slash angles
      const orbitAngle = Math.atan2(targetPos[0] - playerPos[0], targetPos[2] - playerPos[2]) + (p * 1.8 - 0.9);
      
      let camDist = 3.6;
      let camHeight = 1.6;

      if (executionCinematic.finisherId === 'judgement_guillotine' && p > 0.25 && p < 0.75) {
        // High aerial tracking for guillotine
        camDist = 4.4;
        camHeight = 3.2;
      } else if (p > 0.82) {
        // Lethal climax close-up!
        camDist = 2.6;
        camHeight = 1.1;
      }

      desiredCamPos.current.set(
        midX - Math.sin(orbitAngle) * camDist,
        midY + camHeight,
        midZ - Math.cos(orbitAngle) * camDist
      );

      // Look at victim's torso
      const targetLookAt = new THREE.Vector3(midX, midY + 1.1, midZ);
      currentLookAt.current.lerp(targetLookAt, 16.0 * clampedDelta);

      // FOV tightens to anamorphic telephoto (38 to 44)
      if (camera instanceof THREE.PerspectiveCamera) {
        const targetFov = p > 0.85 ? 38 : 42;
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 14 * clampedDelta);
        camera.updateProjectionMatrix();
      }
    } else {
      // ==========================================
      // 2. STANDARD COMBAT / LOCOMOTION CAMERA
      // ==========================================
      let distance = 7.5;
      let height = 4.8;
      if (isMoving) {
        distance = 8.5;
        height = 5.2;
      } else if (isEngaged1v1) {
        distance = 6.2;
        height = 4.2;
      }

      desiredCamPos.current.set(
        targetPosition.x,
        targetPosition.y + height,
        targetPosition.z + distance
      );

      const targetLookAt = new THREE.Vector3(
        targetPosition.x,
        targetPosition.y + 1.2,
        targetPosition.z
      );
      currentLookAt.current.lerp(targetLookAt, 9.0 * clampedDelta);

      if (camera instanceof THREE.PerspectiveCamera) {
        const targetFov = 60 - feedback.fovWarp;
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 12 * clampedDelta);
        camera.updateProjectionMatrix();
      }
    }

    // Screenshake
    if (feedback.shakeDuration > 0 && feedback.shakeIntensity > 0) {
      const shakeAmt = feedback.shakeIntensity;
      const shakeX = (Math.sin(t * 45) + Math.cos(t * 33)) * shakeAmt;
      const shakeY = (Math.cos(t * 52) + Math.sin(t * 28)) * shakeAmt;
      const shakeZ = Math.sin(t * 39) * shakeAmt * 0.5;

      desiredCamPos.current.x += shakeX;
      desiredCamPos.current.y += shakeY;
      desiredCamPos.current.z += shakeZ;
    }

    // Smooth camera lag
    const lerpSpeed = executionCinematic.active ? 12.0 : 7.5;
    camera.position.lerp(desiredCamPos.current, lerpSpeed * clampedDelta);
    camera.lookAt(currentLookAt.current);
  });

  return null;
};
