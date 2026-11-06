import React, { useRef, useState } from 'react';
import { Crosshair, Zap } from 'lucide-react';

interface TouchControlsProps {
  abilityReadyRatio: number;
  abilityActive: boolean;
  onMoveVector: (nx: number, ny: number) => void;
  onFireChange: (firing: boolean) => void;
  onTriggerAbility: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  abilityReadyRatio,
  abilityActive,
  onMoveVector,
  onFireChange,
  onTriggerAbility,
}) => {
  const stickTouchId = useRef<number | null>(null);
  const [stickOrigin, setStickOrigin] = useState<{ x: number; y: number } | null>(null);
  const [stickPos, setStickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [firing, setFiring] = useState(false);

  const maxRadius = 46;

  const handleStickStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (stickTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    stickTouchId.current = touch.identifier;
    setStickOrigin({ x: touch.clientX, y: touch.clientY });
    setStickPos({ x: 0, y: 0 });
    onMoveVector(0, 0);
  };

  const handleStickMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (stickTouchId.current === null || !stickOrigin) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === stickTouchId.current) {
        const dx = t.clientX - stickOrigin.x;
        const dy = t.clientY - stickOrigin.y;
        const dist = Math.hypot(dx, dy);
        const clamped = Math.min(maxRadius, dist);
        const angle = Math.atan2(dy, dx);
        const cx = Math.cos(angle) * clamped;
        const cy = Math.sin(angle) * clamped;
        setStickPos({ x: cx, y: cy });
        onMoveVector(cx / maxRadius, cy / maxRadius);
        break;
      }
    }
  };

  const handleStickEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (stickTouchId.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === stickTouchId.current) {
        stickTouchId.current = null;
        setStickOrigin(null);
        setStickPos({ x: 0, y: 0 });
        onMoveVector(0, 0);
        break;
      }
    }
  };

  const isAbilityReady = abilityReadyRatio >= 0.999;
  const ringCircumference = 2 * Math.PI * 26;
  const strokeDashoffset = ringCircumference * (1 - abilityReadyRatio);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none">
      {/* Left Half: Virtual Flight Stick Zone */}
      <div
        className="pointer-events-auto absolute bottom-0 left-0 top-14 w-[52%]"
        onTouchStart={handleStickStart}
        onTouchMove={handleStickMove}
        onTouchEnd={handleStickEnd}
        onTouchCancel={handleStickEnd}
      >
        {!stickOrigin && (
          <div className="absolute bottom-7 left-7 flex h-24 w-24 items-center justify-center rounded-full border border-sky-400/25 bg-slate-950/35 backdrop-blur-xs">
            <div className="h-9 w-9 rounded-full border border-sky-300/40 bg-sky-400/15" />
          </div>
        )}

        {stickOrigin && (
          <div
            style={{
              left: stickOrigin.x - 48,
              top: stickOrigin.y - 48,
            }}
            className="pointer-events-none fixed flex h-24 w-24 items-center justify-center rounded-full border border-sky-400/45 bg-slate-950/45"
          >
            <div
              style={{
                transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
              }}
              className="h-10 w-10 rounded-full border border-sky-200 bg-sky-400/40 shadow-[0_0_16px_rgba(56,189,248,0.6)]"
            />
          </div>
        )}
      </div>

      {/* Right Bottom: Ability + Fire Buttons */}
      <div className="pointer-events-auto absolute bottom-6 right-6 flex items-end gap-4">
        {/* Special Ability Button */}
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            onTriggerAbility();
          }}
          className={`relative flex h-16 w-16 items-center justify-center rounded-full border transition-transform active:scale-90 ${
            abilityActive
              ? 'border-amber-300 bg-amber-500/30 text-amber-200 shadow-[0_0_24px_rgba(251,191,36,0.6)]'
              : isAbilityReady
              ? 'border-sky-300 bg-sky-500/25 text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.45)]'
              : 'border-slate-600/50 bg-slate-950/60 text-slate-400'
          }`}
          aria-label="Special Ability"
        >
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 60 60">
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke="rgba(148,163,184,0.18)"
              strokeWidth="3"
            />
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke={isAbilityReady ? '#38BDF8' : '#94A3B8'}
              strokeWidth="3"
              strokeDasharray={ringCircumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <Zap className="h-6 w-6" />
        </button>

        {/* Primary Fire Button */}
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            setFiring(true);
            onFireChange(true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            setFiring(false);
            onFireChange(false);
          }}
          onTouchCancel={() => {
            setFiring(false);
            onFireChange(false);
          }}
          className={`flex h-22 w-22 items-center justify-center rounded-full border-2 transition-transform ${
            firing
              ? 'scale-95 border-rose-300 bg-rose-500/35 text-white shadow-[0_0_28px_rgba(251,113,133,0.65)]'
              : 'border-sky-400/60 bg-slate-950/65 text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.3)]'
          }`}
          aria-label="Fire Weapons"
        >
          <Crosshair className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
};
