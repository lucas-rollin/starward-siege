import React from 'react';
import { Pause, Shield, Volume2, VolumeX, Wrench, Zap } from 'lucide-react';
import {
  HudSnapshot,
  SHIP_CLASSES,
  ShipClassId,
  TEAMS,
} from '../game/types';
import { ShipPreviewIcon } from './ShipPreviewIcon';

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  isTouchDevice: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onSelectShip: (ship: ShipClassId) => void;
  onTriggerAbility: () => void;
}

const SHIP_ORDER: ShipClassId[] = [
  'interceptor',
  'dreadnought',
  'artillery',
  'carrier',
];

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  muted,
  isTouchDevice,
  onToggleMute,
  onPause,
  onSelectShip,
  onTriggerAbility,
}) => {
  const activeSpec = SHIP_CLASSES[hud.selectedShip];
  const hpPercent = hud.playerMaxHp > 0 ? Math.max(0, (hud.playerHp / hud.playerMaxHp) * 100) : 0;
  const abilityPercent = Math.round(hud.abilityReadyRatio * 100);
  const canSwapShip = hud.nearHomePlanet || !hud.playerAlive;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-4">
      {/* TOP BAR */}
      <div className="flex items-start justify-between gap-2">
        {/* TOP-LEFT: Player Ship Status */}
        <div className="pointer-events-auto flex flex-col gap-1.5">
          <div className="glass-pill flex items-center gap-2.5 rounded-xl px-3 py-2">
            <div className="hidden sm:block">
              <ShipPreviewIcon shipClass={hud.selectedShip} size={34} />
            </div>
            <div className="min-w-[132px] sm:min-w-[164px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[11px] font-bold tracking-wider text-sky-300">
                  {activeSpec.name}
                </span>
                <span className="font-mono-num text-[11px] font-bold text-slate-300">
                  {hud.playerAlive ? `${hud.playerHp}/${hud.playerMaxHp}` : 'DOWN'}
                </span>
              </div>

              {/* Hull Bar */}
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-900/90">
                <div
                  className={`h-full transition-all duration-100 ${
                    hpPercent > 40
                      ? 'bg-sky-400'
                      : hpPercent > 20
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>

              {/* Ability Cooldown Bar */}
              <button
                type="button"
                onClick={onTriggerAbility}
                className="mt-1.5 flex w-full items-center gap-1.5 text-left"
              >
                <Zap
                  className={`h-3.5 w-3.5 shrink-0 ${
                    abilityPercent >= 100 ? 'text-amber-300' : 'text-slate-400'
                  }`}
                />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-900/90">
                  <div
                    className={`h-full transition-all duration-75 ${
                      hud.abilityActive
                        ? 'bg-amber-300'
                        : abilityPercent >= 100
                        ? 'bg-sky-300'
                        : 'bg-slate-500'
                    }`}
                    style={{ width: `${abilityPercent}%` }}
                  />
                </div>
                {!isTouchDevice && (
                  <span className="font-mono-num text-[9px] font-bold text-slate-400">
                    {abilityPercent >= 100 ? 'SHIFT/RMB' : `${abilityPercent}%`}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Status Badges: Overcharge / Dock Repair / Sudden Death */}
          <div className="flex flex-wrap items-center gap-1.5">
            {hud.overchargeActive && (
              <span className="glass-pill rounded-md border-amber-400/40 px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-amber-300">
                OVERCHARGE
              </span>
            )}
            {hud.nearHomePlanet && hud.playerAlive && (
              <span className="glass-pill flex items-center gap-1 rounded-md border-emerald-400/40 px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-emerald-300">
                <Wrench className="h-3 w-3" /> DOCK REPAIR + SWAP
              </span>
            )}
            {!hud.homePlanetAlive && (
              <span className="glass-pill rounded-md border-rose-500/50 px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-rose-300">
                LAST STAND
              </span>
            )}
          </div>

          {/* Instant Ship Switcher when Docked at Home Planet or Respawning */}
          {canSwapShip && (
            <div className="glass-pill flex items-center gap-1 rounded-xl p-1">
              {SHIP_ORDER.map((id, idx) => {
                const selected = hud.selectedShip === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectShip(id)}
                    title={`${SHIP_CLASSES[id].name} (${SHIP_CLASSES[id].role})`}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                      selected
                        ? 'bg-sky-500/30 text-sky-200 ring-1 ring-sky-400/60'
                        : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-mono-num text-[9px] opacity-70">{idx + 1}</span>
                    <span className="font-display tracking-wide">
                      {SHIP_CLASSES[id].name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* TOP-CENTER: Planetary Bases Integrity & Score */}
        <div className="flex flex-col items-center gap-1.5">
          {/* Planets Strip */}
          <div className="glass-pill flex flex-wrap items-center justify-center gap-2 sm:gap-3 rounded-xl px-2.5 py-1.5 sm:px-3.5">
            {hud.planets.map((p) => {
              const team = TEAMS[p.teamId];
              const hpPct = p.alive ? Math.max(0, (p.hp / p.maxHp) * 100) : 0;
              const shPct = p.alive ? Math.max(0, (p.shieldHp / p.maxShieldHp) * 100) : 0;
              return (
                <div
                  key={p.teamId}
                  className={`flex min-w-[82px] sm:min-w-[108px] flex-col ${
                    !p.alive ? 'opacity-40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className="font-display text-[10px] font-bold tracking-wider"
                      style={{ color: team.primary }}
                    >
                      {team.shortName}
                    </span>
                    <span className="font-mono-num text-[10px] font-bold text-slate-300">
                      {p.alive ? `${Math.ceil(hpPct)}%` : 'LOST'}
                    </span>
                  </div>
                  {/* Combined Shield + Hull progress */}
                  <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full transition-all duration-150"
                      style={{
                        width: `${hpPct}%`,
                        backgroundColor: team.primary,
                      }}
                    />
                  </div>
                  {p.alive && p.shieldHp > 0 && (
                    <div className="mt-0.5 flex items-center gap-1">
                      <Shield className="h-2.5 w-2.5 text-sky-200/80" />
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-900">
                        <div
                          className="h-full bg-sky-200/90 transition-all duration-150"
                          style={{ width: `${shPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Score & Combo Pill */}
          <div className="glass-pill flex items-center gap-3 rounded-full px-3.5 py-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[9px] font-bold tracking-widest text-slate-400">
                SCORE
              </span>
              <span className="font-mono-num text-sm font-extrabold text-white">
                {hud.score.toLocaleString()}
              </span>
            </div>

            {hud.combo > 1 && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-400/20 px-2 py-0.5 ring-1 ring-amber-400/50">
                <span className="font-display text-[10px] font-black text-amber-300">
                  x{hud.combo}
                </span>
                <div className="h-1.5 w-8 overflow-hidden rounded-full bg-slate-900">
                  <div
                    className="h-full bg-amber-300"
                    style={{ width: `${hud.comboTimer * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TOP-RIGHT: Sound & Pause Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMute}
            className="glass-pill flex h-9 w-9 items-center justify-center rounded-xl text-slate-200 transition hover:border-sky-400/50 hover:text-sky-300"
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onPause}
            className="glass-pill flex h-9 w-9 items-center justify-center rounded-xl text-slate-200 transition hover:border-sky-400/50 hover:text-sky-300"
            aria-label="Pause Game"
          >
            <Pause className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* CENTER-TOP TRANSIENT EVENT BANNER */}
      {hud.bannerText && (
        <div className="mx-auto mt-2">
          <div
            className="glass-pill rounded-full px-4 py-1.5 font-display text-xs sm:text-sm font-extrabold tracking-widest shadow-lg"
            style={{
              color: hud.bannerColor,
              borderColor: `${hud.bannerColor}55`,
            }}
          >
            {hud.bannerText}
          </div>
        </div>
      )}

      {/* RESPAWN COUNTDOWN CENTER PROMPT */}
      {!hud.playerAlive && hud.homePlanetAlive && (
        <div className="pointer-events-auto mx-auto my-auto flex flex-col items-center gap-2 rounded-2xl glass-panel px-6 py-4 text-center">
          <span className="font-display text-xs font-bold tracking-widest text-rose-400">
            SHIP DESTROYED
          </span>
          <span className="font-mono-num text-2xl font-extrabold text-white">
            REDEPLOYING IN {hud.respawnTimer.toFixed(1)}s
          </span>
          <span className="text-xs text-slate-400">
            Select ship class top-left to switch before launch
          </span>
        </div>
      )}

      <div />
    </div>
  );
};
