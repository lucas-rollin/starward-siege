export type ShipClassId = 'interceptor' | 'dreadnought' | 'artillery' | 'carrier';

export type BattleMode = 2 | 3;

export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameover';

export interface ShipClassSpec {
  id: ShipClassId;
  name: string;
  codename: string;
  role: string;
  tagline: string;
  primaryName: string;
  abilityName: string;
  abilityDesc: string;
  maxHp: number;
  maxSpeed: number;
  accel: number;
  turnSpeed: number;
  fireCooldown: number;
  abilityCooldown: number;
  radius: number;
  stats: {
    speed: number;     // 1-5
    firepower: number; // 1-5
    armor: number;     // 1-5
  };
}

export const SHIP_CLASSES: Record<ShipClassId, ShipClassSpec> = {
  interceptor: {
    id: 'interceptor',
    name: 'VIPER MK-IV',
    codename: 'INTERCEPTOR',
    role: 'Rapid Dogfighter',
    tagline: 'Blistering twin-pulse cannons & phase-dash EMP.',
    primaryName: 'Twin Pulse Blasters',
    abilityName: 'Phase Dash + EMP',
    abilityDesc: 'Blink forward with invulnerability and emit an EMP shockwave that clears enemy bolts.',
    maxHp: 115,
    maxSpeed: 490,
    accel: 1180,
    turnSpeed: 9.5,
    fireCooldown: 0.13,
    abilityCooldown: 4.5,
    radius: 17,
    stats: { speed: 5, firepower: 3, armor: 2 },
  },
  dreadnought: {
    id: 'dreadnought',
    name: 'BASTION-IX',
    codename: 'DREADNOUGHT',
    role: 'Heavy Siege Cruiser',
    tagline: 'Explosive siege plasma & damage-absorbing Aegis dome.',
    primaryName: 'Siege Plasma Mortar',
    abilityName: 'Aegis Deflector Nova',
    abilityDesc: 'Projects an impenetrable barrier for 2.6s, releasing a massive shockwave on expiry.',
    maxHp: 210,
    maxSpeed: 315,
    accel: 760,
    turnSpeed: 6.2,
    fireCooldown: 0.42,
    abilityCooldown: 7.0,
    radius: 23,
    stats: { speed: 2, firepower: 5, armor: 5 },
  },
  artillery: {
    id: 'artillery',
    name: 'NOVA LANCE',
    codename: 'ARTILLERY',
    role: 'Long-Range Sniper',
    tagline: 'Piercing railgun slugs & planet-searing Ion Beam.',
    primaryName: 'Hyper-Velocity Railgun',
    abilityName: 'Orbital Ion Beam',
    abilityDesc: 'Fires a continuous high-energy beam that pierces ships and melts planetary armor.',
    maxHp: 135,
    maxSpeed: 390,
    accel: 920,
    turnSpeed: 7.6,
    fireCooldown: 0.34,
    abilityCooldown: 6.5,
    radius: 19,
    stats: { speed: 3, firepower: 5, armor: 3 },
  },
  carrier: {
    id: 'carrier',
    name: 'VALKYRIE',
    codename: 'SWARM CARRIER',
    role: 'Tactical Drone Wing',
    tagline: 'Homing micro-missiles & autonomous attack drone swarm.',
    primaryName: 'Seeker Micro-Missiles',
    abilityName: 'Deploy Drone Squadron',
    abilityDesc: 'Launches 4 autonomous interceptor drones that hunt enemy ships and bombard planets.',
    maxHp: 155,
    maxSpeed: 375,
    accel: 890,
    turnSpeed: 7.4,
    fireCooldown: 0.28,
    abilityCooldown: 6.0,
    radius: 20,
    stats: { speed: 3, firepower: 4, armor: 3 },
  },
};

export interface TeamConfig {
  id: number;
  name: string;
  shortName: string;
  primary: string;
  secondary: string;
  glow: string;
  planetName: string;
  planetCore: string;
  planetBand: string;
}

export const TEAMS: TeamConfig[] = [
  {
    id: 0,
    name: 'SOLARI VANGUARD',
    shortName: 'SOLARI',
    primary: '#38BDF8',
    secondary: '#7DD3FC',
    glow: 'rgba(56, 189, 248, 0.45)',
    planetName: 'AURELIA PRIME',
    planetCore: '#0284C7',
    planetBand: '#38BDF8',
  },
  {
    id: 1,
    name: 'CRIMSON DOMINION',
    shortName: 'CRIMSON',
    primary: '#FB7185',
    secondary: '#FDA4AF',
    glow: 'rgba(251, 113, 133, 0.45)',
    planetName: 'KRYOS-IV',
    planetCore: '#BE123C',
    planetBand: '#FB7185',
  },
  {
    id: 2,
    name: 'VERDANT SYNDICATE',
    shortName: 'VERDANT',
    primary: '#34D399',
    secondary: '#6EE7B7',
    glow: 'rgba(52, 211, 153, 0.45)',
    planetName: 'XYLOS NEXUS',
    planetCore: '#047857',
    planetBand: '#34D399',
  },
];

export interface PlanetEntity {
  id: number;
  teamId: number;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  shieldHp: number;
  maxShieldHp: number;
  shieldRegenDelay: number;
  hitFlash: number;
  shieldFlash: number;
  shieldHitAngle: number;
  rotation: number;
  turretAngles: [number, number];
  turretCooldowns: [number, number];
  spawnTimer: number;
  alive: boolean;
  explosionStage: number;
}

export interface ShipEntity {
  uid: number;
  teamId: number;
  shipClass: ShipClassId;
  isPlayer: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  radius: number;
  fireTimer: number;
  abilityTimer: number;
  abilityActiveTimer: number;
  invulnTimer: number;
  hitFlash: number;
  overchargeTimer: number;
  trailTimer: number;
  // AI fields
  aiState: 'patrol' | 'engage' | 'siege' | 'relay';
  aiTargetUid: number | null;
  aiTargetPlanetId: number | null;
  aiStrafeDir: number;
  aiDecisionTimer: number;
}

export interface ProjectileEntity {
  uid: number;
  teamId: number;
  ownerUid: number;
  kind: 'pulse' | 'plasma' | 'rail' | 'missile' | 'turret';
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  damage: number;
  planetDamage: number;
  radius: number;
  splashRadius: number;
  life: number;
  maxLife: number;
  pierceLeft: number;
  hitUids: Set<number>;
  turnRate: number;
}

export interface DroneEntity {
  uid: number;
  teamId: number;
  ownerUid: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  life: number;
  fireTimer: number;
  orbitOffset: number;
}

export interface AsteroidEntity {
  id: number;
  x: number;
  y: number;
  radius: number;
  rotation: number;
  rotSpeed: number;
  vertices: number[]; // radial multipliers
  hitFlash: number;
}

export interface PickupEntity {
  uid: number;
  kind: 'repair' | 'overcharge';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  pulse: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  endSize: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  additive: boolean;
  shape: 'circle' | 'spark' | 'shard';
  angle: number;
  spin: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  lineWidth: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
}

export interface BeamEffect {
  teamId: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  life: number;
  maxLife: number;
}

export interface SolarRelay {
  x: number;
  y: number;
  radius: number;
  ownerTeam: number | null; // null = neutral
  captureProgress: number;  // -1 to 1 or per-team tension
  contestingTeam: number | null;
  pulseTimer: number;
  rotation: number;
}

export interface HudSnapshot {
  phase: GamePhase;
  battleMode: BattleMode;
  selectedShip: ShipClassId;
  score: number;
  combo: number;
  comboTimer: number; // 0..1
  kills: number;
  planetDamageDealt: number;
  matchTime: number;
  playerAlive: boolean;
  respawnTimer: number;
  playerHp: number;
  playerMaxHp: number;
  abilityReadyRatio: number; // 0..1 (1 = ready)
  abilityActive: boolean;
  overchargeActive: boolean;
  nearHomePlanet: boolean;
  homePlanetAlive: boolean;
  relayOwner: number | null;
  planets: Array<{
    teamId: number;
    name: string;
    hp: number;
    maxHp: number;
    shieldHp: number;
    maxShieldHp: number;
    alive: boolean;
  }>;
  victory: boolean;
  isNewHighScore: boolean;
  bannerText: string | null;
  bannerColor: string;
}

export interface HighScoreEntry {
  id: string;
  callsign: string;
  score: number;
  shipClass: ShipClassId;
  mode: BattleMode;
  kills: number;
  victory: boolean;
  date: string;
}
