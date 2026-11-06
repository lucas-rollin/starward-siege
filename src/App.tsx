import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { GameOverOverlay } from './components/GameOverOverlay';
import { PauseOverlay } from './components/PauseOverlay';
import { StartOverlay } from './components/StartOverlay';
import { TouchControls } from './components/TouchControls';
import { SpaceBattleEngine } from './game/engine';
import { sound } from './game/sound';
import {
  loadHighScores,
  loadSavedCallsign,
  saveCallsign,
  saveHighScore,
  updateScoreCallsign,
} from './game/storage';
import {
  BattleMode,
  HighScoreEntry,
  HudSnapshot,
  ShipClassId,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  phase: 'menu',
  battleMode: 2,
  selectedShip: 'interceptor',
  score: 0,
  combo: 1,
  comboTimer: 0,
  kills: 0,
  planetDamageDealt: 0,
  matchTime: 0,
  playerAlive: false,
  respawnTimer: 0,
  playerHp: 115,
  playerMaxHp: 115,
  abilityReadyRatio: 1,
  abilityActive: false,
  overchargeActive: false,
  nearHomePlanet: false,
  homePlanetAlive: true,
  relayOwner: null,
  planets: [],
  victory: false,
  isNewHighScore: false,
  bannerText: null,
  bannerColor: '#38BDF8',
};

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SpaceBattleEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [highScores, setHighScores] = useState<HighScoreEntry[]>(() =>
    loadHighScores()
  );
  const [callsign, setCallsign] = useState<string>(() => loadSavedCallsign());
  const [latestScoreId, setLatestScoreId] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(() => sound.isMuted());
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  const callsignRef = useRef(callsign);
  callsignRef.current = callsign;
  const phaseRef = useRef(hud.phase);
  phaseRef.current = hud.phase;

  // Detect touch capability
  useEffect(() => {
    const checkTouch = () => {
      const hasTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches;
      setIsTouchDevice(hasTouch);
    };
    checkTouch();
    window.addEventListener('touchstart', () => setIsTouchDevice(true), {
      once: true,
      passive: true,
    });
  }, []);

  // Initialize Simulation Engine & 60fps Loop
  useEffect(() => {
    const engine = new SpaceBattleEngine(
      (snapshot) => {
        setHud(snapshot);
      },
      (result) => {
        const saved = saveHighScore({
          callsign: callsignRef.current,
          score: result.score,
          shipClass: result.shipClass,
          mode: result.mode,
          kills: result.kills,
          victory: result.victory,
        });
        setHighScores(saved.list);
        setLatestScoreId(saved.savedId);
        if (saved.isTopRecord) {
          engine.setIsNewHighScore(true);
        }
      }
    );
    engineRef.current = engine;

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const touch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches;
      engine.setViewport(w, h, touch);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const onKeyDown = (e: KeyboardEvent) => {
      // Avoid interfering when typing pilot callsign in GameOver input
      if (
        document.activeElement &&
        document.activeElement.tagName === 'INPUT'
      ) {
        if (e.code === 'Enter') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (
        ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
          e.code
        )
      ) {
        e.preventDefault();
      }
      if (
        e.code === 'Enter' &&
        (phaseRef.current === 'menu' || phaseRef.current === 'gameover')
      ) {
        setLatestScoreId(null);
        engine.startNewMatch();
        return;
      }
      engine.handleKeyDown(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      engine.handleKeyUp(e.code);
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);

    let rafId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      engine.step(dt);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          ctx.save();
          ctx.scale(dpr, dpr);
          engine.render(ctx);
          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const handleSelectMode = useCallback((mode: BattleMode) => {
    engineRef.current?.setBattleMode(mode);
  }, []);

  const handleSelectShip = useCallback((ship: ShipClassId) => {
    engineRef.current?.setSelectedShip(ship);
  }, []);

  const handleStartBattle = useCallback(() => {
    setLatestScoreId(null);
    engineRef.current?.startNewMatch();
  }, []);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleQuitToMenu = useCallback(() => {
    setLatestScoreId(null);
    engineRef.current?.returnToMenu();
  }, []);

  const handleToggleMute = useCallback(() => {
    const next = sound.toggleMute();
    setMuted(next);
  }, []);

  const handleCallsignChange = useCallback(
    (value: string) => {
      const upper = value.toUpperCase().slice(0, 12);
      setCallsign(upper);
      saveCallsign(upper);
      if (latestScoreId) {
        const updated = updateScoreCallsign(latestScoreId, upper);
        setHighScores(updated);
      }
    },
    [latestScoreId]
  );

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-[#050811]"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Full-Viewport 60fps HTML5 Game Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={(e) =>
          engineRef.current?.handleMouseMove(e.clientX, e.clientY)
        }
        onMouseDown={(e) => engineRef.current?.handleMouseDown(e.button)}
        onMouseUp={(e) => engineRef.current?.handleMouseUp(e.button)}
        className={`block h-full w-full ${
          hud.phase === 'playing' && !isTouchDevice ? 'cursor-none' : 'cursor-default'
        }`}
      />

      {/* Active Gameplay Minimal Glass HUD */}
      {hud.phase === 'playing' && (
        <GameHud
          hud={hud}
          muted={muted}
          isTouchDevice={isTouchDevice}
          onToggleMute={handleToggleMute}
          onPause={handleTogglePause}
          onSelectShip={handleSelectShip}
          onTriggerAbility={() => engineRef.current?.triggerPlayerAbility()}
        />
      )}

      {/* Mobile / Touch Dual-Stick & Action Buttons */}
      {hud.phase === 'playing' && isTouchDevice && hud.playerAlive && (
        <TouchControls
          abilityReadyRatio={hud.abilityReadyRatio}
          abilityActive={hud.abilityActive}
          onMoveVector={(nx, ny) => engineRef.current?.setTouchJoystick(nx, ny)}
          onFireChange={(firing) => engineRef.current?.setTouchFiring(firing)}
          onTriggerAbility={() => engineRef.current?.triggerPlayerAbility()}
        />
      )}

      {/* Title & Hangar Start Overlay */}
      {hud.phase === 'menu' && (
        <StartOverlay
          battleMode={hud.battleMode}
          selectedShip={hud.selectedShip}
          highScores={highScores}
          muted={muted}
          onSelectMode={handleSelectMode}
          onSelectShip={handleSelectShip}
          onStart={handleStartBattle}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Pause Overlay */}
      {hud.phase === 'paused' && (
        <PauseOverlay
          selectedShip={hud.selectedShip}
          score={hud.score}
          kills={hud.kills}
          onResume={handleTogglePause}
          onSelectShip={handleSelectShip}
          onRestart={handleStartBattle}
          onQuitToMenu={handleQuitToMenu}
        />
      )}

      {/* Game Over / Victory Overlay */}
      {hud.phase === 'gameover' && (
        <GameOverOverlay
          hud={hud}
          callsign={callsign}
          highScores={highScores}
          latestScoreId={latestScoreId}
          onChangeCallsign={handleCallsignChange}
          onPlayAgain={handleStartBattle}
          onQuitToMenu={handleQuitToMenu}
        />
      )}
    </main>
  );
}

export default App;
