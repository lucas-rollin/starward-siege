import React from 'react';
import { Play, Rocket, Shield, Swords, Trophy, Users, Volume2, VolumeX } from 'lucide-react';
import { getModeLabel, getShipLabel } from '../game/storage';
import {
  BattleMode,
  HighScoreEntry,
  SHIP_CLASSES,
  ShipClassId,
} from '../game/types';
import { ShipPreviewIcon } from './ShipPreviewIcon';

interface StartOverlayProps {
  battleMode: BattleMode;
  selectedShip: ShipClassId;
  highScores: HighScoreEntry[];
  muted: boolean;
  onSelectMode: (mode: BattleMode) => void;
  onSelectShip: (ship: ShipClassId) => void;
  onStart: () => void;
  onToggleMute: () => void;
}

const SHIP_LIST: ShipClassId[] = [
  'interceptor',
  'dreadnought',
  'artillery',
  'carrier',
];

const StatBar: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div className="flex items-center gap-2 text-[10px]">
    <span className="w-12 font-semibold uppercase tracking-wider text-slate-400">
      {label}
    </span>
    <div className="flex flex-1 gap-1">
      {[1, 2, 3, 4, 5].map((step) => (
        <div
          key={step}
          className="h-1.5 flex-1 rounded-xs transition-colors"
          style={{
            backgroundColor: step <= value ? color : 'rgba(30, 41, 59, 0.9)',
          }}
        />
      ))}
    </div>
  </div>
);

export const StartOverlay: React.FC<StartOverlayProps> = ({
  battleMode,
  selectedShip,
  highScores,
  muted,
  onSelectMode,
  onSelectShip,
  onStart,
  onToggleMute,
}) => {
  const activeSpec = SHIP_CLASSES[selectedShip];

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-3 sm:p-6">
      <div className="glass-panel relative my-auto w-full max-w-5xl rounded-2xl p-4 sm:p-6">
        {/* Top Audio Mute Button */}
        <button
          type="button"
          onClick={onToggleMute}
          className="glass-pill absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition hover:border-sky-400/50 hover:text-sky-300"
          aria-label="Toggle Sound"
        >
          {muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {/* Header & Mode Selector */}
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-800/80 pb-4 pr-10 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-sky-500/15 px-2 py-0.5 font-display text-[10px] font-bold tracking-widest text-sky-300 ring-1 ring-sky-400/30">
                ORBITAL FLEET COMMAND
              </span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-black tracking-wider text-white sm:text-4xl">
              STARWARD <span className="text-sky-400">SIEGE</span>
            </h1>
            <p className="mt-0.5 text-xs text-slate-300 sm:text-sm">
              Command your starship, capture the Solar Relay, and shatter enemy homeworlds.
            </p>
          </div>

          {/* Battle Mode Selector (2 Teams vs 3 Teams) */}
          <div className="flex flex-col gap-1">
            <span className="font-display text-[10px] font-bold tracking-widest text-slate-400">
              BATTLE SECTOR
            </span>
            <div className="flex rounded-xl bg-slate-950/80 p-1 ring-1 ring-slate-800">
              <button
                type="button"
                onClick={() => onSelectMode(2)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-display text-xs font-bold tracking-wider transition ${
                  battleMode === 2
                    ? 'bg-sky-500/25 text-sky-200 ring-1 ring-sky-400/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Swords className="h-3.5 w-3.5" />2 TEAMS
              </button>
              <button
                type="button"
                onClick={() => onSelectMode(3)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-display text-xs font-bold tracking-wider transition ${
                  battleMode === 3
                    ? 'bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="h-3.5 w-3.5" />3 TEAMS
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid: Ship Hangar (Left/Center) + Local High Scores (Right) */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Ship Hangar Selection (8 cols) */}
          <div className="flex flex-col gap-3 lg:col-span-8">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold tracking-widest text-slate-300">
                SELECT STARSHIP CLASS
              </span>
              <span className="text-[11px] text-slate-400">
                Swap anytime when docked at Home Planet
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {SHIP_LIST.map((id) => {
                const spec = SHIP_CLASSES[id];
                const isSelected = selectedShip === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectShip(id)}
                    className={`group flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-sky-400 bg-sky-500/12 shadow-[0_0_25px_rgba(56,189,248,0.18)]'
                        : 'border-slate-800/90 bg-slate-900/55 hover:border-slate-700 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-display text-[10px] font-bold tracking-widest text-sky-400">
                          {spec.codename}
                        </span>
                        <h3 className="font-display text-sm font-extrabold tracking-wide text-white">
                          {spec.name}
                        </h3>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-300">
                          {spec.tagline}
                        </p>
                      </div>
                      <div className="shrink-0 pt-0.5 transition-transform group-hover:scale-110">
                        <ShipPreviewIcon
                          shipClass={id}
                          color={isSelected ? '#38BDF8' : '#7DD3FC'}
                          size={42}
                        />
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-1 border-t border-slate-800/70 pt-2">
                      <StatBar label="Speed" value={spec.stats.speed} color="#38BDF8" />
                      <StatBar label="Power" value={spec.stats.firepower} color="#FB7185" />
                      <StatBar label="Armor" value={spec.stats.armor} color="#34D399" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Ship Loadout Detail Bar */}
            <div className="flex flex-col justify-between gap-2 rounded-xl border border-slate-800/90 bg-slate-950/65 px-3.5 py-2.5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-xs">
                <Rocket className="h-4 w-4 shrink-0 text-sky-400" />
                <span className="font-semibold text-slate-400">PRIMARY:</span>
                <span className="font-bold text-slate-100">{activeSpec.primaryName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Shield className="h-4 w-4 shrink-0 text-amber-400" />
                <span className="font-semibold text-slate-400">ABILITY:</span>
                <span className="font-bold text-amber-200">{activeSpec.abilityName}</span>
              </div>
            </div>
          </div>

          {/* Local High-Score Table (4 cols) */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-800/90 bg-slate-950/60 p-3.5 lg:col-span-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  <span className="font-display text-xs font-bold tracking-wider text-slate-200">
                    TOP COMMANDERS
                  </span>
                </div>
                <span className="font-mono-num text-[10px] text-slate-400">LOCAL BEST</span>
              </div>

              <div className="mt-2 space-y-1.5">
                {highScores.slice(0, 6).map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg bg-slate-900/60 px-2.5 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`font-mono-num text-[11px] font-extrabold ${
                          idx === 0
                            ? 'text-amber-300'
                            : idx === 1
                            ? 'text-slate-200'
                            : idx === 2
                            ? 'text-amber-600'
                            : 'text-slate-500'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <span className="truncate font-display text-[11px] font-bold text-slate-100">
                        {entry.callsign}
                      </span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono-num text-[9px] text-sky-300">
                        {getShipLabel(entry.shipClass)}
                      </span>
                      <span className="hidden sm:inline rounded bg-slate-800/70 px-1 py-0.5 font-mono-num text-[9px] text-slate-400">
                        {getModeLabel(entry.mode)}
                      </span>
                    </div>
                    <span className="font-mono-num text-xs font-extrabold text-amber-300">
                      {entry.score.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Concise Controls Legend */}
            <div className="mt-3 border-t border-slate-800/80 pt-2.5 text-[11px] text-slate-400">
              <div className="flex items-center justify-between">
                <span>Desktop:</span>
                <span className="font-mono-num text-slate-300">WASD + Mouse / Space / Shift</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>Touch:</span>
                <span className="font-mono-num text-slate-300">Left Stick + Fire / Ability</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Launch CTA */}
        <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-slate-800/80 pt-4 sm:flex-row">
          <div className="text-xs text-slate-400">
            Selected:{' '}
            <span className="font-display font-bold text-sky-300">{activeSpec.name}</span>{' '}
            in{' '}
            <span className="font-display font-bold text-slate-200">
              {battleMode === 2 ? '2-Team Planetary Duel' : '3-Team Galactic Clash'}
            </span>
          </div>

          <button
            type="button"
            onClick={onStart}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-sky-400 px-7 py-3 font-display text-sm font-black tracking-widest text-slate-950 shadow-[0_0_28px_rgba(56,189,248,0.5)] transition hover:bg-sky-300 active:scale-[0.98] sm:w-auto"
          >
            <Play className="h-4 w-4 fill-current" />
            LAUNCH FLEET
          </button>
        </div>
      </div>
    </div>
  );
};
