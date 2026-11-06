import React from 'react';
import { Home, Play, RotateCcw } from 'lucide-react';
import { SHIP_CLASSES, ShipClassId } from '../game/types';
import { ShipPreviewIcon } from './ShipPreviewIcon';

interface PauseOverlayProps {
  selectedShip: ShipClassId;
  score: number;
  kills: number;
  onResume: () => void;
  onSelectShip: (ship: ShipClassId) => void;
  onRestart: () => void;
  onQuitToMenu: () => void;
}

const SHIP_LIST: ShipClassId[] = [
  'interceptor',
  'dreadnought',
  'artillery',
  'carrier',
];

export const PauseOverlay: React.FC<PauseOverlayProps> = ({
  selectedShip,
  score,
  kills,
  onResume,
  onSelectShip,
  onRestart,
  onQuitToMenu,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 text-center">
        <span className="rounded-md bg-amber-400/15 px-2.5 py-0.5 font-display text-[10px] font-bold tracking-widest text-amber-300 ring-1 ring-amber-400/35">
          TACTICAL PAUSE
        </span>
        <h2 className="mt-2 font-display text-2xl font-black tracking-wider text-white">
          BATTLE PAUSED
        </h2>

        <div className="mt-3 flex justify-center gap-6 rounded-xl bg-slate-950/70 py-2.5">
          <div>
            <div className="font-display text-[10px] font-bold text-slate-400">SCORE</div>
            <div className="font-mono-num text-base font-extrabold text-white">
              {score.toLocaleString()}
            </div>
          </div>
          <div className="w-px bg-slate-800" />
          <div>
            <div className="font-display text-[10px] font-bold text-slate-400">KILLS</div>
            <div className="font-mono-num text-base font-extrabold text-sky-300">{kills}</div>
          </div>
        </div>

        {/* Next / Docked Ship Selection */}
        <div className="mt-4 text-left">
          <div className="font-display text-[10px] font-bold tracking-widest text-slate-400">
            ACTIVE / NEXT DEPLOYMENT SHIP
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {SHIP_LIST.map((id) => {
              const spec = SHIP_CLASSES[id];
              const active = selectedShip === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectShip(id)}
                  className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                    active
                      ? 'border-sky-400 bg-sky-500/15 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <ShipPreviewIcon shipClass={id} size={28} />
                  <div className="min-w-0">
                    <div className="truncate font-display text-[11px] font-bold">
                      {spec.name.split(' ')[0]}
                    </div>
                    <div className="truncate text-[10px] text-slate-400">{spec.codename}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-400 py-3 font-display text-xs font-black tracking-widest text-slate-950 shadow-[0_0_22px_rgba(56,189,248,0.4)] transition hover:bg-sky-300"
          >
            <Play className="h-4 w-4 fill-current" />
            RESUME BATTLE
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 font-display text-xs font-bold tracking-wider text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              RESTART
            </button>
            <button
              type="button"
              onClick={onQuitToMenu}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 font-display text-xs font-bold tracking-wider text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              <Home className="h-3.5 w-3.5" />
              HANGAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
