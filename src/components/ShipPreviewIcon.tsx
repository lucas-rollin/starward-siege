import React from 'react';
import { ShipClassId } from '../game/types';

interface Props {
  shipClass: ShipClassId;
  color?: string;
  size?: number;
}

export const ShipPreviewIcon: React.FC<Props> = ({
  shipClass,
  color = '#38BDF8',
  size = 44,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-32 -32 64 64"
      className="overflow-visible drop-shadow-[0_0_8px_rgba(56,189,248,0.45)]"
    >
      <g transform="rotate(-45)">
        {shipClass === 'interceptor' && (
          <>
            <polygon
              points="22,0 4,7 12,15 -14,13 -10,4 -16,0 -10,-4 -14,-13 12,-15 4,-7"
              fill="#0B1222"
              stroke={color}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <ellipse cx="4" cy="0" rx="6" ry="2.6" fill="#7DD3FC" />
          </>
        )}

        {shipClass === 'dreadnought' && (
          <>
            <polygon
              points="24,-7 24,7 12,18 -18,18 -22,10 -22,-10 -18,-18 12,-18"
              fill="#0B1222"
              stroke={color}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <line x1="15" y1="-9" x2="-12" y2="-11" stroke="#7DD3FC" strokeWidth="1.6" />
            <line x1="15" y1="9" x2="-12" y2="11" stroke="#7DD3FC" strokeWidth="1.6" />
            <rect x="-2" y="-4" width="10" height="8" fill="#7DD3FC" />
          </>
        )}

        {shipClass === 'artillery' && (
          <>
            <polygon
              points="26,0 6,5 -8,16 -18,12 -13,4 -13,-4 -18,-12 -8,-16 6,-5"
              fill="#0B1222"
              stroke={color}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <line x1="10" y1="-4" x2="10" y2="4" stroke="#7DD3FC" strokeWidth="2.2" />
            <line x1="17" y1="-3" x2="17" y2="3" stroke="#7DD3FC" strokeWidth="2.2" />
          </>
        )}

        {shipClass === 'carrier' && (
          <>
            <polygon
              points="21,0 4,11 -14,19 -18,9 -12,0 -18,-9 -14,-19 4,-11"
              fill="#0B1222"
              stroke={color}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <circle cx="-4" cy="-9" r="2.6" fill="#7DD3FC" />
            <circle cx="-4" cy="9" r="2.6" fill="#7DD3FC" />
            <circle cx="6" cy="0" r="3" fill="#7DD3FC" />
          </>
        )}
      </g>
    </svg>
  );
};
