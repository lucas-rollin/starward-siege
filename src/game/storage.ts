import { BattleMode, HighScoreEntry, ShipClassId } from './types';

const SCORES_KEY = 'starward_siege_highscores_v1';
const CALLSIGN_KEY = 'starward_siege_callsign_v1';

const DEFAULT_SCORES: HighScoreEntry[] = [
  {
    id: 'seed-1',
    callsign: 'NOVA-ACE',
    score: 14800,
    shipClass: 'artillery',
    mode: 3,
    kills: 18,
    victory: true,
    date: 'SECTOR 09',
  },
  {
    id: 'seed-2',
    callsign: 'VALKYRIE',
    score: 11250,
    shipClass: 'interceptor',
    mode: 2,
    kills: 14,
    victory: true,
    date: 'SECTOR 07',
  },
  {
    id: 'seed-3',
    callsign: 'IRONCLAD',
    score: 8900,
    shipClass: 'dreadnought',
    mode: 3,
    kills: 11,
    victory: true,
    date: 'SECTOR 05',
  },
  {
    id: 'seed-4',
    callsign: 'SWARM-04',
    score: 6400,
    shipClass: 'carrier',
    mode: 2,
    kills: 9,
    victory: true,
    date: 'SECTOR 03',
  },
  {
    id: 'seed-5',
    callsign: 'ORION-X',
    score: 4100,
    shipClass: 'interceptor',
    mode: 2,
    kills: 6,
    victory: false,
    date: 'SECTOR 01',
  },
];

export function loadHighScores(): HighScoreEntry[] {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) {
      localStorage.setItem(SCORES_KEY, JSON.stringify(DEFAULT_SCORES));
      return [...DEFAULT_SCORES];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.sort((a, b) => b.score - a.score).slice(0, 8);
    }
  } catch {
    // ignore storage errors
  }
  return [...DEFAULT_SCORES];
}

export function saveHighScore(entry: Omit<HighScoreEntry, 'id' | 'date'>): {
  list: HighScoreEntry[];
  savedId: string;
  isTopRecord: boolean;
} {
  const existing = loadHighScores();
  const prevTop = existing.length > 0 ? existing[0].score : 0;
  const savedId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date();
  const dateLabel = `${now.toLocaleString('en-US', { month: 'short' }).toUpperCase()} ${now.getDate()}`;

  const newEntry: HighScoreEntry = {
    ...entry,
    id: savedId,
    callsign: (entry.callsign.trim() || 'CMDR-01').toUpperCase().slice(0, 12),
    date: dateLabel,
  };

  const updated = [...existing, newEntry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return {
    list: updated,
    savedId,
    isTopRecord: newEntry.score > prevTop,
  };
}

export function updateScoreCallsign(id: string, callsign: string): HighScoreEntry[] {
  const existing = loadHighScores();
  const clean = (callsign.trim() || 'CMDR-01').toUpperCase().slice(0, 12);
  const updated = existing.map((item) =>
    item.id === id ? { ...item, callsign: clean } : item
  );
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(updated));
    localStorage.setItem(CALLSIGN_KEY, clean);
  } catch {
    // ignore
  }
  return updated;
}

export function loadSavedCallsign(): string {
  try {
    const val = localStorage.getItem(CALLSIGN_KEY);
    if (val && val.trim().length > 0) return val.trim().toUpperCase().slice(0, 12);
  } catch {
    // ignore
  }
  return 'CMDR-01';
}

export function saveCallsign(callsign: string): void {
  try {
    const clean = (callsign.trim() || 'CMDR-01').toUpperCase().slice(0, 12);
    localStorage.setItem(CALLSIGN_KEY, clean);
  } catch {
    // ignore
  }
}

export function getShipLabel(ship: ShipClassId): string {
  switch (ship) {
    case 'interceptor':
      return 'VIPER';
    case 'dreadnought':
      return 'BASTION';
    case 'artillery':
      return 'NOVA';
    case 'carrier':
      return 'VALKYRIE';
  }
}

export function getModeLabel(mode: BattleMode): string {
  return mode === 2 ? '2-TEAM' : '3-TEAM';
}
