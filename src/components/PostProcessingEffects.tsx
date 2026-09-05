import React, { useMemo } from 'react';
import * as THREE from 'three';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { useGameStore } from '../store/gameStore';

export const PostProcessingEffects: React.FC = () => {
  const chromaticFlash = useGameStore((s) => s.feedback.chromaticFlash);
  const parryWindowActive = useGameStore((s) => s.parryWindowActive);
  const combo = useGameStore((s) => s.combo);
  const styleRank = useGameStore((s) => s.styleRank);

  // Dynamic bloom pass that scales with combat events:
  // - Surges brightly during active parry windows
  // - Amplifies proportionally with high-combo streaks (D -> SSS)
  // - Reacts to hitstop and execution flashes
  const bloomConfig = useMemo(() => {
    let intensity = 0.75;
    let threshold = 0.5;

    // High-combo streak bloom scaling
    if (combo >= 25 || styleRank === 'SSS') {
      intensity += 1.25;
      threshold = 0.32;
    } else if (combo >= 18 || styleRank === 'S') {
      intensity += 0.95;
      threshold = 0.36;
    } else if (combo >= 12 || styleRank === 'A') {
      intensity += 0.65;
      threshold = 0.4;
    } else if (combo >= 7 || styleRank === 'B') {
      intensity += 0.4;
      threshold = 0.44;
    } else if (combo >= 3) {
      intensity += 0.2;
      threshold = 0.48;
    }

    // Active parry deflection window flare
    if (parryWindowActive) {
      intensity += 1.0;
      threshold = 0.28;
    }

    // Impact flash boost
    if (chromaticFlash > 0.05) {
      intensity += chromaticFlash * 0.8;
    }

    return { intensity, threshold };
  }, [combo, styleRank, parryWindowActive, chromaticFlash]);

  // Dynamic chromatic aberration offset based on heavy impact / parry
  const offset = useMemo(() => {
    const val = 0.001 + chromaticFlash * 0.007;
    return new THREE.Vector2(val, val);
  }, [chromaticFlash]);

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={bloomConfig.intensity}
        luminanceThreshold={bloomConfig.threshold}
        luminanceSmoothing={0.35}
        mipmapBlur
      />
      {chromaticFlash > 0.01 && (
        <ChromaticAberration
          offset={offset}
          radialModulation={false}
          modulationOffset={0}
        />
      )}
    </EffectComposer>
  );
};
