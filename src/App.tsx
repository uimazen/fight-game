/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { GameScene } from './components/GameScene';
import { HUD } from './components/HUD';
import { TutorialModal } from './components/TutorialModal';
import { ShopModal } from './components/ShopModal';
import { soundEngine } from './audio/soundEngine';

export default function App() {
  // Virtual action dispatcher for mobile / touch controls
  const handleVirtualAction = useCallback((action: 'light' | 'heavy' | 'dash' | 'parry' | 'execute') => {
    soundEngine.initCtx();
    if (action === 'light') {
      window.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    } else if (action === 'heavy') {
      window.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));
    } else if (action === 'dash') {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })), 100);
    } else if (action === 'parry') {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyF' })), 100);
    } else if (action === 'execute') {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' })), 100);
    }
  }, []);

  React.useEffect(() => {
    const handleFirstInput = () => {
      soundEngine.initCtx();
    };
    window.addEventListener('keydown', handleFirstInput, { once: true });
    window.addEventListener('pointerdown', handleFirstInput, { once: true });
    return () => {
      window.removeEventListener('keydown', handleFirstInput);
      window.removeEventListener('pointerdown', handleFirstInput);
    };
  }, []);

  return (
    <main
      id="game-container"
      className="relative w-screen h-screen bg-[#07090e] overflow-hidden select-none cursor-crosshair"
      onPointerDown={() => {
        soundEngine.initCtx();
      }}
    >
      {/* 3D R3F Engine Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 6, 9], fov: 60, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <GameScene />
        </Suspense>
      </Canvas>

      {/* Visceral Arcade Fighting Game HUD & Touch Controls */}
      <HUD onVirtualAction={handleVirtualAction} />

      {/* Interactive Combat Briefing & Native TTS Voice Tutorial */}
      <TutorialModal />

      {/* Cybernetic Arsenal & Upgrades Shop */}
      <ShopModal />
    </main>
  );
}

