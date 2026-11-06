import React from 'react';
import { Home, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { getModeLabel, getShipLabel } from '../game/storage';
import { HighScoreEntry, HudSnapshot } from '../game/types';

interface GameOverOverlayProps {
  hud: HudSnapshot;
  callsign: string;
  highScores: HighScoreEntry[];
  latestScoreId: string | null;
  onChangeCallsign: (value: string) => void;
  onPlayAgain: () => void;
  onQuitToMenu: () => void;
}

export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({
  hud,
  callsign,
  highScores,
  latestScoreId,
  onChangeCallsign,
  onPlayAgain,
  onQuitToMenu,
}) => {
  const mins = Math.floor(hud.matchTime / 60);
  const secs = Math.floor(hud.matchTime % 60)
    .toString()
    .padStart(2, '0');

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-xs">
      <div className="glass-panel my-auto w-full max-w-xl rounded-2xl p-5 sm:p-6">
        {/* Outcome Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-[10px] font-extrabold tracking-widest ring-1 ring-inset bg-slate-900/80 text-slate-300 ring-slate-700">
            {hud.victory ? (
              <>
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span className="text-amber-300">SECTOR CONQUERED</span>
              </>
            ) : (
              <span className="text-rose-400">FLEET OVERRUN</span>
            )}
          </div>

          <h2
            className={`mt-2 font-display text-3xl font-black tracking-wider sm:text-4xl ${
              hud.victory ? 'text-sky-300' : 'text-rose-400'
            }`}
          >
            {hud.victory ? 'VICTORY' : 'DEFEAT'}
          </h2>

          {hud.isNewHighScore && (
            <div className="mt-1.5 inline-block rounded-md bg-amber-400/20 px-2.5 py-0.5 font-display text-[11px] font-black tracking-widest text-amber-300 ring-1 ring-amber-400/50">
              NEW ALL-TIME SECTOR RECORD!
            </div>
          )}
        </div>

        {/* Match Summary Stats */}
        <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3 text-center">
          <div>
            <div className="font-display text-[9px] font-bold tracking-wider text-slate-400">
              SCORE
            </div>
            <div className="mt-0.5 font-mono-num text-sm sm:text-base font-extrabold text-amber-300">
              {hud.score.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="font-display text-[9px] font-bold tracking-wider text-slate-400">
              KILLS
            </div>
            <div className="mt-0.5 font-mono-num text-sm sm:text-base font-extrabold text-sky-300">
              {hud.kills}
            </div>
          </div>
          <div>
            <div className="font-display text-[9px] font-bold tracking-wider text-slate-400">
              SIEGE DMG
            </div>
            <div className="mt-0.5 font-mono-num text-sm sm:text-base font-extrabold text-rose-300">
              {hud.planetDamageDealt.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="font-display text-[9px] font-bold tracking-wider text-slate-400">
              TIME
            </div>
            <div className="mt-0.5 font-mono-num text-sm sm:text-base font-extrabold text-slate-200">
              {mins}:{secs}
            </div>
          </div>
        </div>

        {/* Pilot Callsign Input */}
        <div className="mt-3.5 flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/55 px-3.5 py-2">
          <label
            htmlFor="pilot-callsign"
            className="font-display text-[10px] font-bold tracking-widest text-slate-400"
          >
            PILOT CALLSIGN
          </label>
          <input
            id="pilot-callsign"
            type="text"
            maxLength={12}
            value={callsign}
            onChange={(e) => onChangeCallsign(e.target.value)}
            placeholder="CMDR-01"
            className="w-36 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-right font-display text-xs font-bold uppercase tracking-wider text-sky-300 outline-none focus:border-sky-400"
          />
        </div>

        {/* Local High-Score Leaderboard */}
        <div className="mt-3.5 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-display text-[11px] font-bold tracking-wider text-slate-200">
                LOCAL HIGH SCORES
              </span>
            </div>
            <span className="font-mono-num text-[10px] text-slate-400">TOP 6</span>
          </div>

          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-0.5">
            {highScores.slice(0, 6).map((entry, idx) => {
              const isCurrent = entry.id === latestScoreId;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${
                    isCurrent
                      ? 'bg-sky-500/20 ring-1 ring-sky-400/60'
                      : 'bg-slate-900/55'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono-num text-[11px] font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    <span className="truncate font-display text-[11px] font-bold text-white">
                      {entry.callsign}
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono-num text-[9px] text-sky-300">
                      {getShipLabel(entry.shipClass)}
                    </span>
                    <span className="rounded bg-slate-800/70 px-1 py-0.5 font-mono-num text-[9px] text-slate-400">
                      {getModeLabel(entry.mode)}
                    </span>
                  </div>
                  <span className="font-mono-num text-xs font-extrabold text-amber-300">
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-400 py-3 font-display text-xs font-black tracking-widest text-slate-950 shadow-[0_0_24px_rgba(56,189,248,0.45)] transition hover:bg-sky-300 active:scale-[0.98]"
          >
            <RotateCcw className="h-4 w-4" />
            PLAY AGAIN
          </button>

          <button
            type="button"
            onClick={onQuitToMenu}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-5 py-3 font-display text-xs font-bold tracking-wider text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            <Home className="h-4 w-4" />
            HANGAR
          </button>
        </div>
      </div>
    </div>
  );
};
