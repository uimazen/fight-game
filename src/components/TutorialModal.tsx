import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { soundEngine } from '../audio/soundEngine';
import { 
  Volume2, 
  VolumeX, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Play, 
  Gauge, 
  ShieldAlert, 
  Sparkles, 
  Flame, 
  Swords, 
  Zap, 
  Crosshair 
} from 'lucide-react';

interface TutorialStep {
  stepIndex: number;
  tag: string;
  title: string;
  subtitle: string;
  ttsScript: string;
  keybind: string;
  icon: React.ReactNode;
  tips: string[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    stepIndex: 0,
    tag: 'MODULE 01 // OVERVIEW',
    title: 'TACTICAL COMBAT PROTOCOL',
    subtitle: 'Welcome to Apex Arena, operative. Master rhythm, reaction speed, and fluid martial arts.',
    ttsScript: 'Welcome to Apex Arena, operative. In this combat simulation, survival depends on rhythm, reaction speed, and timing. We have engaged slow motion so you can analyze every movement with precision.',
    keybind: 'SURVIVAL BRIEFING',
    icon: <Sparkles className="w-6 h-6 text-cyan-400" />,
    tips: [
      'Eliminate all hostile combatants to advance through surviving waves.',
      'Clearing a wave grants a +25% HP restoration reward and brief recovery.',
      'Watch your Health bar and Posture gauge at the top-left of the screen.',
    ],
  },
  {
    stepIndex: 1,
    tag: 'MODULE 02 // MOBILITY',
    title: 'NEURAL LOCOMOTION & PHANTOM DASH',
    subtitle: 'Navigate the dojo arena and slip through hostile strikes with temporary invulnerability.',
    ttsScript: 'Use W, A, S, and D or arrow keys to move. Press Spacebar to trigger a high-velocity phantom dash. During the dash, you gain invulnerability frames that completely evade incoming attacks.',
    keybind: '[WASD] MOVE  •  [SPACE] PHANTOM DASH',
    icon: <Zap className="w-6 h-6 text-sky-400" />,
    tips: [
      'W advances forward into the arena; S backsteps toward the camera.',
      'Dash projection snaps to your movement keys or character facing angle.',
      'Phantom Dash grants I-Frames (Invulnerability) — evade directly through swings!',
    ],
  },
  {
    stepIndex: 2,
    tag: 'MODULE 03 // OFFENSE',
    title: '3-HIT MARTIAL COMBO & DYNAMIC MUSIC',
    subtitle: 'Left-Click to string Light 1, Light 2, and Light 3. Build combo streaks to unlock music layers!',
    ttsScript: 'Press Left Mouse Button to chain your three-hit martial combo. Snap slash, rising uppercut, and a 360-degree airborne spin cleave. As your combo streak climbs from Rank D to triple S, the adaptive soundtrack builds from sub-bass to combat drums, synth arpeggios, and overdrive lead.',
    keybind: '[LMB] 3-HIT LIGHT COMBO STRING',
    icon: <Swords className="w-6 h-6 text-cyan-400" />,
    tips: [
      'Input buffer lets you queue your next strike during recovery windows.',
      'Light 1 sweeps horizontally, Light 2 slashes diagonally upward, Light 3 spins airborne.',
      'Music dynamically adds Drums at 3+ hits, Synth Arps at 7+, and Overdrive Guitar at 14+!',
    ],
  },
  {
    stepIndex: 3,
    tag: 'MODULE 04 // BREAKER',
    title: 'GUARD BREAKER & POISE SHATTER',
    subtitle: 'Right-Click to coil into a heavy wind-up and crush hostile shields and defense.',
    ttsScript: 'Hold and release Right Mouse Button to unleash a heavy guard breaker. Watch the enemy posture meter. When posture reaches one hundred percent, their guard shatters, leaving them dazed and vulnerable.',
    keybind: '[RMB] HEAVY GUARD BREAKER',
    icon: <Flame className="w-6 h-6 text-orange-400" />,
    tips: [
      'Deals massive posture damage that quickly overfills enemy balance meters.',
      'Generates intense knockback and shockwaves, staggering standard foes.',
      'Essential against Brutes and shielded Elites who block light attacks.',
    ],
  },
  {
    stepIndex: 4,
    tag: 'MODULE 05 // DEFENSE',
    title: 'TIMED DEFLECTION & BULLET-TIME PARRY',
    subtitle: 'Press [F] just as an enemy weapon descends to deflect, counter, and slow time.',
    ttsScript: 'Timing is everything. Press F just before an enemy strike connects to perform a perfect deflection. Successful parries trigger bullet-time slow motion, shockwaves, and instant combo points while keeping your posture pristine.',
    keybind: '[F] DEFLECTION / PARRY',
    icon: <ShieldAlert className="w-6 h-6 text-blue-400" />,
    tips: [
      'Active parry window causes your visor and blade to flare with high-radiance bloom.',
      'A perfect deflect completely nullifies damage and triggers a matrix slow-mo window.',
      'Caution: Red unblockable beacon attacks from Brutes cannot be parried—Dodge with Space!',
    ],
  },
  {
    stepIndex: 5,
    tag: 'MODULE 06 // FINISHER',
    title: 'FATAL FINISHER & CINEMATIC EXECUTION',
    subtitle: 'When an enemy poise is broken, trigger an instant lethal execution.',
    ttsScript: 'When an enemy enters a poise-broken daze, an execution prompt will appear overhead. Step close and press E to deliver a devastating cinematic fatal finisher.',
    keybind: '[E] FATAL EXECUTION',
    icon: <Crosshair className="w-6 h-6 text-red-500" />,
    tips: [
      'Shattering an enemy posture bar puts them into a 4.5 second dazed stun halo.',
      'Press [E] when within proximity to execute them with guaranteed lethal damage.',
      'Executions grant massive bonus score, style rank boosts, and dynamic camera punch.',
    ],
  },
  {
    stepIndex: 6,
    tag: 'MODULE 07 // DEPLOYMENT',
    title: 'SYSTEMS CALIBRATED // COMMENCE COMBAT',
    subtitle: 'All training modules complete. Toggle slow-mo anytime or engage full speed.',
    ttsScript: 'All combat systems are calibrated and online. Step into the arena, maintain your rhythm, and claim victory. Good luck, operative.',
    keybind: 'PROTOCOL READY',
    icon: <Sparkles className="w-6 h-6 text-emerald-400" />,
    tips: [
      'Toggle Slow-Mo training mode on or off at any time using the HUD toggle.',
      'Press [R] at any point to instantly reset your run and retry.',
      'Audio layers are fully synthesized in real time via Web Audio API.',
    ],
  },
];

export const TutorialModal: React.FC = () => {
  const isTutorialActive = useGameStore((s) => s.isTutorialActive);
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const tutorialSlowMo = useGameStore((s) => s.tutorialSlowMo);
  const nextTutorialStep = useGameStore((s) => s.nextTutorialStep);
  const prevTutorialStep = useGameStore((s) => s.prevTutorialStep);
  const setTutorialStep = useGameStore((s) => s.setTutorialStep);
  const exitTutorial = useGameStore((s) => s.exitTutorial);
  const toggleTutorialSlowMo = useGameStore((s) => s.toggleTutorialSlowMo);

  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const currentStep = TUTORIAL_STEPS[tutorialStep] || TUTORIAL_STEPS[0];

  // Browser Native TTS Voice Speaker
  const speakText = useCallback(
    (text: string) => {
      if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      // Stop any current utterance
      window.speechSynthesis.cancel();

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.94;
        utterance.pitch = 1.05;

        // Try to pick an English voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(
          (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel'))
        ) || voices.find((v) => v.lang.startsWith('en'));

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis error:', err);
        setIsSpeaking(false);
      }
    },
    [ttsEnabled]
  );

  // Trigger TTS voice when tutorial step changes
  useEffect(() => {
    if (isTutorialActive) {
      speakText(currentStep.ttsScript);
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isTutorialActive, tutorialStep, currentStep, speakText]);

  if (!isTutorialActive) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 select-none font-['Rajdhani']">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0e1626] to-[#070b14] border border-cyan-500/40 rounded-xl shadow-[0_0_50px_rgba(14,165,233,0.3)] overflow-hidden flex flex-col pointer-events-auto">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-600/40 text-cyan-400">
              {currentStep.icon}
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-widest text-cyan-400 font-mono">
                {currentStep.tag}
              </div>
              <h2 className="text-lg md:text-xl font-black text-white font-['Chakra_Petch'] tracking-wide">
                {currentStep.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Slow-Mo Toggle Button */}
            <button
              id="tutorial-slowmo-toggle"
              onClick={toggleTutorialSlowMo}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                tutorialSlowMo
                  ? 'bg-cyan-950/90 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Toggle Slow-Mo Bullet Time"
            >
              <Gauge size={14} className={tutorialSlowMo ? 'animate-spin' : ''} />
              <span>{tutorialSlowMo ? 'SLOW-MO: 35%' : 'SPEED: 100%'}</span>
            </button>

            {/* TTS Voice Toggle Button */}
            <button
              id="tutorial-tts-toggle"
              onClick={() => {
                const next = !ttsEnabled;
                setTtsEnabled(next);
                if (!next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                  setIsSpeaking(false);
                } else if (next) {
                  speakText(currentStep.ttsScript);
                }
              }}
              className={`p-2 rounded-lg border text-xs transition ${
                ttsEnabled
                  ? 'bg-cyan-950/80 border-cyan-600/60 text-cyan-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
              title={ttsEnabled ? 'Mute AI Voice Coach' : 'Enable AI Voice Coach'}
            >
              {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Close / Skip Tutorial */}
            <button
              id="tutorial-exit-button"
              onClick={() => {
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                soundEngine.playWhoosh(1.0, false);
                exitTutorial();
              }}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-red-950/80 hover:border-red-500 border border-slate-700 text-slate-400 hover:text-white transition"
              title="Exit Briefing"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-4">
          {/* Subtitle / Objective */}
          <p className="text-sm md:text-base text-slate-300 leading-relaxed font-semibold">
            {currentStep.subtitle}
          </p>

          {/* Keybind Banner */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 shadow-inner">
            <span className="text-xs font-mono font-bold text-slate-400">CONTROL MAPPING:</span>
            <span className="text-xs md:text-sm font-mono font-extrabold text-cyan-300 tracking-wider bg-slate-950 px-3 py-1 rounded border border-cyan-900/80">
              {currentStep.keybind}
            </span>
          </div>

          {/* AI Voice Transcript & Audio Status */}
          <div className="relative p-3.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              {isSpeaking ? (
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
              ) : (
                <span className="inline-block h-3 w-3 rounded-full bg-slate-600"></span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 font-bold mb-1">
                <span>AI VOICE COACH [NATIVE TTS]</span>
                <button
                  id="replay-tts-button"
                  onClick={() => speakText(currentStep.ttsScript)}
                  className="text-[10px] text-slate-400 hover:text-cyan-300 underline transition cursor-pointer"
                >
                  REPLAY AUDIO
                </button>
              </div>
              <p className="text-xs text-slate-300 italic leading-relaxed">
                "{currentStep.ttsScript}"
              </p>
            </div>
          </div>

          {/* Tactical Tips List */}
          <div className="flex flex-col gap-2 mt-1">
            <div className="text-[11px] font-bold tracking-widest text-slate-400 font-mono">
              COMBAT INTELLIGENCE
            </div>
            <div className="grid grid-cols-1 gap-2">
              {currentStep.tips.map((tip, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-md border border-slate-800/80"
                >
                  <span className="text-cyan-400 font-mono font-bold">{idx + 1}.</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/90 border-t border-slate-800">
          {/* Step Pagination Dots */}
          <div className="flex items-center gap-1.5">
            {TUTORIAL_STEPS.map((step, idx) => (
              <button
                key={idx}
                onClick={() => setTutorialStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === tutorialStep
                    ? 'w-6 bg-cyan-400 shadow-[0_0_8px_#38bdf8]'
                    : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
                title={`Jump to step ${idx + 1}`}
              />
            ))}
            <span className="text-xs font-mono text-slate-500 ml-2">
              {tutorialStep + 1} / {TUTORIAL_STEPS.length}
            </span>
          </div>

          {/* Prev / Next / Complete Buttons */}
          <div className="flex items-center gap-2">
            {tutorialStep > 0 && (
              <button
                id="tutorial-prev-button"
                onClick={() => {
                  soundEngine.playWhoosh(1.2, false);
                  prevTutorialStep();
                }}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold font-['Chakra_Petch'] tracking-wider flex items-center gap-1 transition"
              >
                <ChevronLeft size={16} />
                <span>PREV</span>
              </button>
            )}

            {tutorialStep < TUTORIAL_STEPS.length - 1 ? (
              <button
                id="tutorial-next-button"
                onClick={() => {
                  soundEngine.playWhoosh(1.2, false);
                  nextTutorialStep();
                }}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-black font-['Chakra_Petch'] text-xs tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(14,165,233,0.4)] transition"
              >
                <span>NEXT STEP</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                id="tutorial-complete-button"
                onClick={() => {
                  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                  soundEngine.playWaveCleared();
                  exitTutorial();
                }}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black font-['Chakra_Petch'] text-xs tracking-wider flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.5)] transition"
              >
                <Play size={14} fill="currentColor" />
                <span>ENGAGE BATTLE</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
