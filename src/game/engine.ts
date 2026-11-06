import { SpaceRenderer } from './renderer';
import { sound } from './sound';
import {
  AsteroidEntity,
  BattleMode,
  BeamEffect,
  DroneEntity,
  FloatingText,
  GamePhase,
  HudSnapshot,
  Particle,
  PickupEntity,
  PlanetEntity,
  ProjectileEntity,
  SHIP_CLASSES,
  ShipClassId,
  ShipEntity,
  Shockwave,
  SolarRelay,
  TEAMS,
} from './types';

export class SpaceBattleEngine {
  private renderer: SpaceRenderer;
  private phase: GamePhase = 'menu';
  private battleMode: BattleMode = 2;
  private selectedShip: ShipClassId = 'interceptor';

  private worldWidth = 2500;
  private worldHeight = 1650;
  private viewportWidth = 1280;
  private viewportHeight = 720;

  private cameraX = 0;
  private cameraY = 0;
  private cameraZoom = 1;
  private shakeIntensity = 0;
  private hitStopTimer = 0;
  private time = 0;
  private matchTime = 0;

  private nextUid = 1;
  private planets: PlanetEntity[] = [];
  private ships: ShipEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private drones: DroneEntity[] = [];
  private asteroids: AsteroidEntity[] = [];
  private pickups: PickupEntity[] = [];
  private particles: Particle[] = [];
  private shockwaves: Shockwave[] = [];
  private floatingTexts: FloatingText[] = [];
  private beams: BeamEffect[] = [];

  private relay: SolarRelay = {
    x: 0,
    y: 0,
    radius: 82,
    ownerTeam: null,
    captureProgress: 0,
    contestingTeam: null,
    pulseTimer: 0,
    rotation: 0,
  };

  // Player state & stats
  private playerRespawnTimer = 0;
  private score = 0;
  private combo = 1;
  private comboTimer = 0;
  private kills = 0;
  private planetDamageDealt = 0;
  private victory = false;
  private isNewHighScore = false;

  // Banner callout
  private bannerText: string | null = null;
  private bannerColor = '#38BDF8';
  private bannerTimer = 0;

  // Input states
  private keys = new Set<string>();
  private mouseScreenX = 0;
  private mouseScreenY = 0;
  private mouseDown = false;
  private mouseActive = false;
  private isTouchDevice = false;
  private touchMoveX = 0;
  private touchMoveY = 0;
  private touchFiring = false;

  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private onMatchEnd?: (result: {
    score: number;
    kills: number;
    victory: boolean;
    shipClass: ShipClassId;
    mode: BattleMode;
  }) => void;
  private hudSyncAccum = 0;

  constructor(
    onHudUpdate: (snapshot: HudSnapshot) => void,
    onMatchEnd?: (result: {
      score: number;
      kills: number;
      victory: boolean;
      shipClass: ShipClassId;
      mode: BattleMode;
    }) => void
  ) {
    this.renderer = new SpaceRenderer();
    this.onHudUpdate = onHudUpdate;
    this.onMatchEnd = onMatchEnd;
    this.setupDemoBattle();
  }

  public setViewport(width: number, height: number, isTouch: boolean): void {
    this.viewportWidth = Math.max(320, width);
    this.viewportHeight = Math.max(320, height);
    this.isTouchDevice = isTouch;
    // Slightly wider camera on smaller screens so tactical awareness remains high
    const minDim = Math.min(this.viewportWidth, this.viewportHeight);
    this.cameraZoom = minDim < 620 ? 0.78 : minDim < 860 ? 0.9 : 1.0;
  }

  public setSelectedShip(shipClass: ShipClassId): void {
    this.selectedShip = shipClass;
    // If playing and near home planet, hot-swap immediately!
    const player = this.getPlayerShip();
    if (this.phase === 'playing' && player && this.isNearHomePlanet(player)) {
      const hpRatio = player.hp / player.maxHp;
      const spec = SHIP_CLASSES[shipClass];
      player.shipClass = shipClass;
      player.maxHp = spec.maxHp;
      player.hp = Math.max(30, Math.round(spec.maxHp * hpRatio));
      player.radius = spec.radius;
      player.abilityTimer = Math.min(player.abilityTimer, spec.abilityCooldown * 0.4);
      this.spawnShockwave(player.x, player.y, 65, '#38BDF8', 3, 0.3);
      this.addFloatingText(player.x, player.y - 28, `DEPLOYED ${spec.name}`, '#7DD3FC', 1.05);
      sound.playPickup();
    }
    this.emitHud();
  }

  public setBattleMode(mode: BattleMode): void {
    this.battleMode = mode;
    if (this.phase === 'menu') {
      this.setupDemoBattle();
    }
    this.emitHud();
  }

  public startNewMatch(mode?: BattleMode, shipClass?: ShipClassId): void {
    sound.unlock();
    if (mode) this.battleMode = mode;
    if (shipClass) this.selectedShip = shipClass;

    this.phase = 'playing';
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.kills = 0;
    this.planetDamageDealt = 0;
    this.matchTime = 0;
    this.victory = false;
    this.isNewHighScore = false;
    this.playerRespawnTimer = 0;
    this.hitStopTimer = 0;
    this.shakeIntensity = 0;

    this.buildArena(this.battleMode, true);
    this.showBanner(
      this.battleMode === 2
        ? 'DESTROY CRIMSON HOMEWORLD!'
        : 'CONQUER ALL RIVAL PLANETS!',
      '#38BDF8',
      2.6
    );
    this.emitHud();
  }

  public togglePause(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.keys.clear();
      this.mouseDown = false;
      this.touchFiring = false;
      this.emitHud();
    } else if (this.phase === 'paused') {
      this.phase = 'playing';
      this.emitHud();
    }
  }

  public returnToMenu(): void {
    this.phase = 'menu';
    this.keys.clear();
    this.mouseDown = false;
    this.touchFiring = false;
    this.setupDemoBattle();
    this.emitHud();
  }

  private setupDemoBattle(): void {
    this.buildArena(this.battleMode, false);
    this.cameraX = 0;
    this.cameraY = 0;
  }

  private buildArena(mode: BattleMode, spawnHumanPlayer: boolean): void {
    this.nextUid = 1;
    this.planets = [];
    this.ships = [];
    this.projectiles = [];
    this.drones = [];
    this.asteroids = [];
    this.pickups = [];
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.beams = [];

    if (mode === 2) {
      this.worldWidth = 2400;
      this.worldHeight = 1520;

      this.planets.push(this.createPlanet(0, -840, 0));
      this.planets.push(this.createPlanet(1, 840, 0));
    } else {
      this.worldWidth = 2500;
      this.worldHeight = 2150;

      // Equilateral triangle around (0, 0)
      const dist = 860;
      const angles = [(Math.PI * 5) / 6, -Math.PI / 2, Math.PI / 6];
      for (let t = 0; t < 3; t++) {
        this.planets.push(
          this.createPlanet(t, Math.cos(angles[t]) * dist, Math.sin(angles[t]) * dist)
        );
      }
    }

    this.relay = {
      x: 0,
      y: 0,
      radius: 82,
      ownerTeam: null,
      captureProgress: 0,
      contestingTeam: null,
      pulseTimer: 0,
      rotation: 0,
    };

    // Place symmetrical tactical asteroid cover around mid-field (away from planets & center relay)
    this.generateAsteroids(mode);

    // Spawn player at Team 0 planet
    if (spawnHumanPlayer) {
      const home = this.planets[0];
      const launchAngle = Math.atan2(-home.y, -home.x);
      const px = home.x + Math.cos(launchAngle) * (home.radius + 54);
      const py = home.y + Math.sin(launchAngle) * (home.radius + 54);
      const player = this.spawnShip(0, this.selectedShip, px, py, launchAngle, true);
      player.vx = Math.cos(launchAngle) * 180;
      player.vy = Math.sin(launchAngle) * 180;
      player.invulnTimer = 2.0;
      this.cameraX = player.x;
      this.cameraY = player.y;
    }

    // Spawn initial vanguard squadrons for each team so combat is active within seconds!
    const roster: ShipClassId[] = ['interceptor', 'dreadnought', 'artillery', 'carrier'];
    for (const planet of this.planets) {
      const toCenter = Math.atan2(-planet.y, -planet.x);
      const initialCount = spawnHumanPlayer && planet.teamId === 0 ? 2 : 3;
      for (let i = 0; i < initialCount; i++) {
        const spread = (i - (initialCount - 1) * 0.5) * 0.42;
        const a = toCenter + spread;
        const distOut = planet.radius + 115 + i * 35;
        const sx = planet.x + Math.cos(a) * distOut;
        const sy = planet.y + Math.sin(a) * distOut;
        const cls = roster[(planet.teamId + i) % roster.length];
        const ai = this.spawnShip(planet.teamId, cls, sx, sy, toCenter, false);
        ai.vx = Math.cos(toCenter) * 140;
        ai.vy = Math.sin(toCenter) * 140;
      }
    }
  }

  private createPlanet(teamId: number, x: number, y: number): PlanetEntity {
    return {
      id: teamId,
      teamId,
      x,
      y,
      radius: 92,
      hp: 1500,
      maxHp: 1500,
      shieldHp: 600,
      maxShieldHp: 600,
      shieldRegenDelay: 0,
      hitFlash: 0,
      shieldFlash: 0,
      shieldHitAngle: 0,
      rotation: Math.random() * Math.PI * 2,
      turretAngles: [0, Math.PI],
      turretCooldowns: [0.4, 0.9],
      spawnTimer: 5.5,
      alive: true,
      explosionStage: 0,
    };
  }

  private generateAsteroids(mode: BattleMode): void {
    const spots: Array<{ x: number; y: number; r: number }> =
      mode === 2
        ? [
            { x: -340, y: -270, r: 44 },
            { x: 340, y: 270, r: 44 },
            { x: -340, y: 270, r: 38 },
            { x: 340, y: -270, r: 38 },
            { x: 0, y: -430, r: 52 },
            { x: 0, y: 430, r: 52 },
            { x: -520, y: 0, r: 34 },
            { x: 520, y: 0, r: 34 },
          ]
        : [
            { x: -310, y: -180, r: 42 },
            { x: 310, y: -180, r: 42 },
            { x: 0, y: 340, r: 44 },
            { x: -460, y: 120, r: 36 },
            { x: 460, y: 120, r: 36 },
            { x: 0, y: -440, r: 38 },
          ];

    spots.forEach((s, idx) => {
      const verts: number[] = [];
      const sides = 9;
      for (let i = 0; i < sides; i++) {
        verts.push(0.78 + Math.sin(idx * 3.1 + i * 2.3) * 0.14 + Math.random() * 0.14);
      }
      this.asteroids.push({
        id: idx + 1,
        x: s.x,
        y: s.y,
        radius: s.r,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.25,
        vertices: verts,
        hitFlash: 0,
      });
    });
  }

  private spawnShip(
    teamId: number,
    shipClass: ShipClassId,
    x: number,
    y: number,
    angle: number,
    isPlayer: boolean
  ): ShipEntity {
    const spec = SHIP_CLASSES[shipClass];
    const ship: ShipEntity = {
      uid: this.nextUid++,
      teamId,
      shipClass,
      isPlayer,
      x,
      y,
      vx: 0,
      vy: 0,
      angle,
      hp: spec.maxHp,
      maxHp: spec.maxHp,
      radius: spec.radius,
      fireTimer: 0,
      abilityTimer: 0,
      abilityActiveTimer: 0,
      invulnTimer: isPlayer ? 1.5 : 0.6,
      hitFlash: 0,
      overchargeTimer: 0,
      trailTimer: 0,
      aiState: 'engage',
      aiTargetUid: null,
      aiTargetPlanetId: null,
      aiStrafeDir: Math.random() < 0.5 ? -1 : 1,
      aiDecisionTimer: 0.4 + Math.random() * 0.6,
    };
    this.ships.push(ship);
    return ship;
  }

  // Input handlers
  public handleKeyDown(code: string): void {
    this.keys.add(code);
    if (code === 'KeyP' || code === 'Escape') {
      if (this.phase === 'playing' || this.phase === 'paused') {
        this.togglePause();
      }
      return;
    }

    if (this.phase === 'playing') {
      if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyE') {
        this.triggerPlayerAbility();
      } else if (code === 'Digit1') {
        this.setSelectedShip('interceptor');
      } else if (code === 'Digit2') {
        this.setSelectedShip('dreadnought');
      } else if (code === 'Digit3') {
        this.setSelectedShip('artillery');
      } else if (code === 'Digit4') {
        this.setSelectedShip('carrier');
      }
    }
  }

  public handleKeyUp(code: string): void {
    this.keys.delete(code);
  }

  public handleMouseMove(screenX: number, screenY: number): void {
    this.mouseScreenX = screenX;
    this.mouseScreenY = screenY;
    this.mouseActive = true;
  }

  public handleMouseDown(button: number): void {
    sound.unlock();
    if (this.phase !== 'playing') return;
    if (button === 0) {
      this.mouseDown = true;
    } else if (button === 2) {
      this.triggerPlayerAbility();
    }
  }

  public handleMouseUp(button: number): void {
    if (button === 0) {
      this.mouseDown = false;
    }
  }

  public setTouchJoystick(nx: number, ny: number): void {
    this.touchMoveX = nx;
    this.touchMoveY = ny;
  }

  public setTouchFiring(firing: boolean): void {
    sound.unlock();
    this.touchFiring = firing;
  }

  public triggerPlayerAbility(): void {
    sound.unlock();
    if (this.phase !== 'playing') return;
    const player = this.getPlayerShip();
    if (!player) return;
    this.activateShipAbility(player);
  }

  private getPlayerShip(): ShipEntity | null {
    return this.ships.find((s) => s.isPlayer) || null;
  }

  private isNearHomePlanet(ship: ShipEntity): boolean {
    const home = this.planets.find((p) => p.teamId === ship.teamId && p.alive);
    if (!home) return false;
    const dx = ship.x - home.x;
    const dy = ship.y - home.y;
    return dx * dx + dy * dy <= (home.radius + 115) * (home.radius + 115);
  }

  public step(rawDt: number): void {
    const dt = Math.min(0.05, Math.max(0.001, rawDt));
    this.time += dt;

    if (this.phase === 'paused') {
      return;
    }

    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      this.updateVisualEffects(dt * 0.25);
      return;
    }

    if (this.phase === 'playing') {
      this.matchTime += dt;
    }

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.bannerText = null;
    }

    // Combo decay
    if (this.combo > 1) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.comboTimer = 0;
      }
    }

    // Handle player respawn if dead while home planet alive
    if (this.phase === 'playing') {
      const player = this.getPlayerShip();
      const homePlanet = this.planets.find((p) => p.teamId === 0);
      if (!player && homePlanet && homePlanet.alive) {
        this.playerRespawnTimer -= dt;
        if (this.playerRespawnTimer <= 0) {
          const launchAngle = Math.atan2(-homePlanet.y, -homePlanet.x);
          const px = homePlanet.x + Math.cos(launchAngle) * (homePlanet.radius + 54);
          const py = homePlanet.y + Math.sin(launchAngle) * (homePlanet.radius + 54);
          const respawned = this.spawnShip(
            0,
            this.selectedShip,
            px,
            py,
            launchAngle,
            true
          );
          respawned.vx = Math.cos(launchAngle) * 180;
          respawned.vy = Math.sin(launchAngle) * 180;
          respawned.invulnTimer = 2.4;
          this.spawnShockwave(px, py, 75, '#38BDF8', 3, 0.35);
          this.showBanner('SHIP REDEPLOYED!', '#7DD3FC', 1.4);
        }
      }
    }

    // Update entities
    this.updateSolarRelay(dt);
    this.updatePlanets(dt);
    this.updateShips(dt);
    this.updateDrones(dt);
    this.updateProjectiles(dt);
    this.updateAsteroids(dt);
    this.updatePickups(dt);
    this.updateVisualEffects(dt);
    this.updateCamera(dt);

    // Check victory / defeat conditions
    if (this.phase === 'playing') {
      this.checkMatchOutcome();
    } else if (this.phase === 'menu') {
      // Keep demo battle running endlessly
      const alivePlanets = this.planets.filter((p) => p.alive);
      if (alivePlanets.length <= 1) {
        this.setupDemoBattle();
      }
    }

    // Periodic HUD snapshot emission (~20Hz for crisp React UI without frame drops)
    this.hudSyncAccum += dt;
    if (this.hudSyncAccum >= 0.05) {
      this.hudSyncAccum = 0;
      this.emitHud();
    }
  }

  private updateSolarRelay(dt: number): void {
    const r = this.relay;
    r.rotation += dt * 0.9;

    // Count ships inside capture radius per team
    const counts = new Map<number, number>();
    for (const s of this.ships) {
      const dx = s.x - r.x;
      const dy = s.y - r.y;
      if (dx * dx + dy * dy <= (r.radius + 25) * (r.radius + 25)) {
        counts.set(s.teamId, (counts.get(s.teamId) || 0) + 1);
      }
    }

    const presentTeams = Array.from(counts.keys());
    if (presentTeams.length === 1) {
      const teamId = presentTeams[0];
      r.contestingTeam = teamId;
      if (r.ownerTeam === teamId) {
        r.captureProgress = Math.min(1, r.captureProgress + dt * 0.4);
      } else {
        r.captureProgress += dt * 0.34;
        if (r.captureProgress >= 1) {
          r.ownerTeam = teamId;
          r.captureProgress = 1;
          this.spawnShockwave(r.x, r.y, 180, TEAMS[teamId].primary, 4, 0.55);
          if (this.phase === 'playing') {
            if (teamId === 0) {
              this.addScore(400, r.x, r.y - 25, 'RELAY CAPTURED! +400', '#FBBF24');
              this.showBanner('SOLAR RELAY CAPTURED! (+25% FIRE RATE)', '#FBBF24', 2.2);
              sound.playPickup();
            } else {
              this.showBanner(
                `${TEAMS[teamId].shortName} CAPTURED SOLAR RELAY!`,
                TEAMS[teamId].primary,
                2.0
              );
            }
          }
        }
      }
    } else if (presentTeams.length === 0) {
      r.contestingTeam = null;
      if (r.ownerTeam === null && r.captureProgress > 0) {
        r.captureProgress = Math.max(0, r.captureProgress - dt * 0.15);
      }
    }

    // Periodic bonus pulses from owned relay
    if (r.ownerTeam !== null) {
      r.pulseTimer += dt;
      if (r.pulseTimer >= 3.0) {
        r.pulseTimer = 0;
        this.spawnShockwave(r.x, r.y, 130, TEAMS[r.ownerTeam].primary, 2, 0.45);
        if (r.ownerTeam === 0 && this.phase === 'playing') {
          this.score += 50;
        }
      }
    }
  }

  private updatePlanets(dt: number): void {
    const fleetCapPerTeam = this.battleMode === 2 ? 4 : 3;
    const roster: ShipClassId[] = ['interceptor', 'dreadnought', 'artillery', 'carrier'];

    for (const planet of this.planets) {
      if (!planet.alive) continue;

      planet.rotation += dt * 0.18;
      if (planet.hitFlash > 0) planet.hitFlash = Math.max(0, planet.hitFlash - dt * 4);
      if (planet.shieldFlash > 0)
        planet.shieldFlash = Math.max(0, planet.shieldFlash - dt * 3.5);

      // Shield regeneration after 4.5s without taking damage
      if (planet.shieldRegenDelay > 0) {
        planet.shieldRegenDelay -= dt;
      } else if (planet.shieldHp < planet.maxShieldHp) {
        planet.shieldHp = Math.min(planet.maxShieldHp, planet.shieldHp + dt * 28);
      }

      // Planetary Defense Turrets
      const orbitR = planet.radius + 18;
      for (let i = 0; i < 2; i++) {
        const mountAngle = planet.rotation + i * Math.PI;
        const tx = planet.x + Math.cos(mountAngle) * orbitR;
        const ty = planet.y + Math.sin(mountAngle) * orbitR;

        // Find nearest enemy ship within 520px
        let nearest: ShipEntity | null = null;
        let bestDistSq = 520 * 520;
        for (const s of this.ships) {
          if (s.teamId === planet.teamId) continue;
          const dx = s.x - tx;
          const dy = s.y - ty;
          const dSq = dx * dx + dy * dy;
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            nearest = s;
          }
        }

        if (nearest) {
          const desiredAngle = Math.atan2(nearest.y - ty, nearest.x - tx);
          planet.turretAngles[i] = this.lerpAngle(
            planet.turretAngles[i],
            desiredAngle,
            dt * 5.5
          );
          planet.turretCooldowns[i] -= dt;
          if (planet.turretCooldowns[i] <= 0) {
            planet.turretCooldowns[i] = 1.15;
            const aim = planet.turretAngles[i];
            this.projectiles.push({
              uid: this.nextUid++,
              teamId: planet.teamId,
              ownerUid: -planet.id - 10,
              kind: 'turret',
              x: tx + Math.cos(aim) * 14,
              y: ty + Math.sin(aim) * 14,
              vx: Math.cos(aim) * 620,
              vy: Math.sin(aim) * 620,
              angle: aim,
              damage: 14,
              planetDamage: 0,
              radius: 4,
              splashRadius: 0,
              life: 0.95,
              maxLife: 0.95,
              pierceLeft: 0,
              hitUids: new Set(),
              turnRate: 0,
            });
          }
        } else {
          planet.turretAngles[i] = mountAngle;
        }
      }

      // Spawn AI reinforcement ships periodically
      const teamShipCount = this.ships.filter((s) => s.teamId === planet.teamId).length;
      if (teamShipCount < fleetCapPerTeam) {
        planet.spawnTimer -= dt;
        if (planet.spawnTimer <= 0) {
          planet.spawnTimer = 6.2;
          const launchA =
            Math.atan2(-planet.y, -planet.x) + (Math.random() - 0.5) * 0.9;
          const sx = planet.x + Math.cos(launchA) * (planet.radius + 45);
          const sy = planet.y + Math.sin(launchA) * (planet.radius + 45);
          const cls = roster[Math.floor(Math.random() * roster.length)];
          const ai = this.spawnShip(planet.teamId, cls, sx, sy, launchA, false);
          ai.vx = Math.cos(launchA) * 160;
          ai.vy = Math.sin(launchA) * 160;
          this.spawnShockwave(sx, sy, 48, TEAMS[planet.teamId].primary, 2, 0.3);
        }
      }
    }
  }

  private updateShips(dt: number): void {
    const hw = this.worldWidth * 0.5 - 35;
    const hh = this.worldHeight * 0.5 - 35;

    for (let i = this.ships.length - 1; i >= 0; i--) {
      const ship = this.ships[i];
      const spec = SHIP_CLASSES[ship.shipClass];

      if (ship.fireTimer > 0) ship.fireTimer -= dt;
      if (ship.abilityTimer > 0) ship.abilityTimer -= dt;
      if (ship.abilityActiveTimer > 0) ship.abilityActiveTimer -= dt;
      if (ship.invulnTimer > 0) ship.invulnTimer -= dt;
      if (ship.hitFlash > 0) ship.hitFlash = Math.max(0, ship.hitFlash - dt * 5);
      if (ship.overchargeTimer > 0) ship.overchargeTimer -= dt;

      // Home planet docking auto-repair
      if (this.isNearHomePlanet(ship) && ship.hp < ship.maxHp) {
        ship.hp = Math.min(ship.maxHp, ship.hp + dt * 26);
        if (Math.random() < 0.25) {
          this.spawnParticle({
            x: ship.x + (Math.random() - 0.5) * 24,
            y: ship.y + (Math.random() - 0.5) * 24,
            vx: 0,
            vy: -35,
            size: 2.5,
            endSize: 0.5,
            alpha: 0.85,
            life: 0.45,
            maxLife: 0.45,
            color: '#34D399',
            additive: true,
            shape: 'circle',
            angle: 0,
            spin: 0,
          });
        }
      }

      // Artillery active Ion Beam continuous tick
      if (ship.shipClass === 'artillery' && ship.abilityActiveTimer > 0) {
        this.processIonBeam(ship, dt);
      }

      if (ship.isPlayer && this.phase === 'playing') {
        this.controlPlayerShip(ship, spec, dt);
      } else {
        this.controlAiShip(ship, spec, dt);
      }

      // Apply velocity & smooth space drag
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
      const damping = Math.pow(0.16, dt);
      ship.vx *= damping;
      ship.vy *= damping;

      // Clamp speed
      const speed = Math.hypot(ship.vx, ship.vy);
      const maxSpd =
        spec.maxSpeed * (ship.overchargeTimer > 0 ? 1.18 : 1.0);
      if (speed > maxSpd) {
        ship.vx = (ship.vx / speed) * maxSpd;
        ship.vy = (ship.vy / speed) * maxSpd;
      }

      // Arena perimeter soft bounce
      if (ship.x < -hw) {
        ship.x = -hw;
        ship.vx = Math.abs(ship.vx) * 0.5;
      } else if (ship.x > hw) {
        ship.x = hw;
        ship.vx = -Math.abs(ship.vx) * 0.5;
      }
      if (ship.y < -hh) {
        ship.y = -hh;
        ship.vy = Math.abs(ship.vy) * 0.5;
      } else if (ship.y > hh) {
        ship.y = hh;
        ship.vy = -Math.abs(ship.vy) * 0.5;
      }

      // Collide ships with planets & asteroids (smooth sliding deflection)
      this.resolveBodyObstacles(ship);

      // Engine thruster trail particles
      ship.trailTimer -= dt;
      if (speed > 75 && ship.trailTimer <= 0) {
        ship.trailTimer = 0.032;
        const backX = ship.x - Math.cos(ship.angle) * (ship.radius + 4);
        const backY = ship.y - Math.sin(ship.angle) * (ship.radius + 4);
        this.spawnParticle({
          x: backX + (Math.random() - 0.5) * 4,
          y: backY + (Math.random() - 0.5) * 4,
          vx: -Math.cos(ship.angle) * 60 + (Math.random() - 0.5) * 20,
          vy: -Math.sin(ship.angle) * 60 + (Math.random() - 0.5) * 20,
          size: ship.shipClass === 'dreadnought' ? 4.5 : 3.2,
          endSize: 0.4,
          alpha: 0.65,
          life: 0.24,
          maxLife: 0.24,
          color: TEAMS[ship.teamId].secondary,
          additive: true,
          shape: 'circle',
          angle: 0,
          spin: 0,
        });
      }

      // Low-HP smoke wisps
      if (ship.hp < ship.maxHp * 0.35 && Math.random() < 0.25) {
        this.spawnParticle({
          x: ship.x + (Math.random() - 0.5) * 12,
          y: ship.y + (Math.random() - 0.5) * 12,
          vx: (Math.random() - 0.5) * 24,
          vy: (Math.random() - 0.5) * 24 - 14,
          size: 4,
          endSize: 8,
          alpha: 0.35,
          life: 0.5,
          maxLife: 0.5,
          color: '#64748B',
          additive: false,
          shape: 'circle',
          angle: 0,
          spin: 0,
        });
      }
    }
  }

  private controlPlayerShip(
    ship: ShipEntity,
    spec: (typeof SHIP_CLASSES)[ShipClassId],
    dt: number
  ): void {
    // 1. Movement vector
    let moveX = 0;
    let moveY = 0;

    if (this.isTouchDevice) {
      moveX = this.touchMoveX;
      moveY = this.touchMoveY;
    } else {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveY -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveY += 1;
      if (this.keys.has('KeyA')) moveX -= 1;
      if (this.keys.has('KeyD')) moveX += 1;

      // Keyboard-only turning with ArrowLeft / ArrowRight when mouse isn't aiming
      if (this.keys.has('ArrowLeft')) {
        ship.angle -= spec.turnSpeed * 0.85 * dt;
        this.mouseActive = false;
      }
      if (this.keys.has('ArrowRight')) {
        ship.angle += spec.turnSpeed * 0.85 * dt;
        this.mouseActive = false;
      }
    }

    const mag = Math.hypot(moveX, moveY);
    if (mag > 0.05) {
      const norm = Math.min(1, mag);
      const nx = moveX / mag;
      const ny = moveY / mag;
      ship.vx += nx * spec.accel * norm * dt;
      ship.vy += ny * spec.accel * norm * dt;
    }

    // 2. Aiming
    if (this.isTouchDevice) {
      // Soft auto-aim toward nearest hostile ship or enemy planet in forward arc when firing
      if (this.touchFiring) {
        const autoTarget = this.findNearestHostileTarget(ship, 680);
        if (autoTarget) {
          const desired = Math.atan2(autoTarget.y - ship.y, autoTarget.x - ship.x);
          ship.angle = this.lerpAngle(ship.angle, desired, spec.turnSpeed * 1.4 * dt);
        } else if (mag > 0.1) {
          ship.angle = this.lerpAngle(
            ship.angle,
            Math.atan2(moveY, moveX),
            spec.turnSpeed * dt
          );
        }
      } else if (mag > 0.1) {
        ship.angle = this.lerpAngle(
          ship.angle,
          Math.atan2(moveY, moveX),
          spec.turnSpeed * dt
        );
      }
    } else if (this.mouseActive) {
      const worldMouseX =
        (this.mouseScreenX - this.viewportWidth * 0.5) / this.cameraZoom + this.cameraX;
      const worldMouseY =
        (this.mouseScreenY - this.viewportHeight * 0.5) / this.cameraZoom + this.cameraY;
      const desiredAngle = Math.atan2(worldMouseY - ship.y, worldMouseX - ship.x);
      ship.angle = this.lerpAngle(ship.angle, desiredAngle, spec.turnSpeed * 1.65 * dt);
    }

    // 3. Firing
    const wantsFire =
      this.mouseDown || this.keys.has('Space') || this.touchFiring;
    if (wantsFire && ship.fireTimer <= 0) {
      this.fireShipWeapon(ship);
    }
  }

  private controlAiShip(
    ship: ShipEntity,
    spec: (typeof SHIP_CLASSES)[ShipClassId],
    dt: number
  ): void {
    ship.aiDecisionTimer -= dt;

    // Select target periodically
    if (ship.aiDecisionTimer <= 0) {
      ship.aiDecisionTimer = 0.55 + Math.random() * 0.55;
      if (Math.random() < 0.25) ship.aiStrafeDir *= -1;

      // Look for nearby hostile ship
      let bestShip: ShipEntity | null = null;
      let bestShipDist = 660;
      for (const other of this.ships) {
        if (other.teamId === ship.teamId) continue;
        const d = Math.hypot(other.x - ship.x, other.y - ship.y);
        if (d < bestShipDist) {
          bestShipDist = d;
          bestShip = other;
        }
      }

      if (bestShip) {
        ship.aiState = 'engage';
        ship.aiTargetUid = bestShip.uid;
      } else if (
        this.relay.ownerTeam !== ship.teamId &&
        Math.hypot(this.relay.x - ship.x, this.relay.y - ship.y) < 620 &&
        Math.random() < 0.45
      ) {
        ship.aiState = 'relay';
      } else {
        ship.aiState = 'siege';
        const enemyPlanets = this.planets.filter(
          (p) => p.teamId !== ship.teamId && p.alive
        );
        if (enemyPlanets.length > 0) {
          const chosen =
            enemyPlanets[Math.floor(Math.random() * enemyPlanets.length)];
          ship.aiTargetPlanetId = chosen.id;
        }
      }
    }

    let goalX = 0;
    let goalY = 0;
    let preferredRange = 250;
    let shouldFire = false;

    if (ship.aiState === 'engage') {
      const target = this.ships.find((s) => s.uid === ship.aiTargetUid);
      if (target) {
        goalX = target.x;
        goalY = target.y;
        preferredRange = ship.shipClass === 'artillery' ? 420 : 230;
        const dist = Math.hypot(goalX - ship.x, goalY - ship.y);
        shouldFire = dist < 600;
      } else {
        ship.aiState = 'siege';
      }
    }

    if (ship.aiState === 'relay') {
      goalX = this.relay.x;
      goalY = this.relay.y;
      preferredRange = 30;
    } else if (ship.aiState === 'siege') {
      const targetPlanet =
        this.planets.find((p) => p.id === ship.aiTargetPlanetId && p.alive) ||
        this.planets.find((p) => p.teamId !== ship.teamId && p.alive);
      if (targetPlanet) {
        goalX = targetPlanet.x;
        goalY = targetPlanet.y;
        preferredRange =
          ship.shipClass === 'artillery'
            ? 450
            : targetPlanet.radius + 195;
        const dist = Math.hypot(goalX - ship.x, goalY - ship.y);
        shouldFire = dist < 560;
      }
    }

    const dx = goalX - ship.x;
    const dy = goalY - ship.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const toGoalAngle = Math.atan2(dy, dx);

    // Steering & orbital strafe around target
    let desiredMoveAngle = toGoalAngle;
    if (dist < preferredRange) {
      desiredMoveAngle = toGoalAngle + (Math.PI * 0.58) * ship.aiStrafeDir;
    }

    // Gentle asteroid avoidance
    for (const ast of this.asteroids) {
      const adx = ship.x - ast.x;
      const ady = ship.y - ast.y;
      const adist = Math.hypot(adx, ady);
      const safe = ast.radius + ship.radius + 55;
      if (adist < safe && adist > 0.1) {
        ship.vx += (adx / adist) * spec.accel * 1.15 * dt;
        ship.vy += (ady / adist) * spec.accel * 1.15 * dt;
      }
    }

    ship.vx += Math.cos(desiredMoveAngle) * spec.accel * 0.85 * dt;
    ship.vy += Math.sin(desiredMoveAngle) * spec.accel * 0.85 * dt;
    ship.angle = this.lerpAngle(ship.angle, toGoalAngle, spec.turnSpeed * dt);

    if (shouldFire && ship.fireTimer <= 0) {
      const angleDiff = Math.abs(this.normalizeAngle(toGoalAngle - ship.angle));
      if (angleDiff < 0.34) {
        this.fireShipWeapon(ship);
      }
    }

    // AI occasionally uses special abilities in combat
    if (shouldFire && ship.abilityTimer <= 0 && dist < 440 && Math.random() < 0.015) {
      this.activateShipAbility(ship);
    }
  }

  private fireShipWeapon(ship: ShipEntity): void {
    const spec = SHIP_CLASSES[ship.shipClass];
    const hasRelayBonus = this.relay.ownerTeam === ship.teamId;
    const hasOvercharge = ship.overchargeTimer > 0;
    const rateMult = (hasRelayBonus ? 1.25 : 1.0) * (hasOvercharge ? 1.35 : 1.0);
    const dmgMult = hasOvercharge ? 1.25 : 1.0;

    ship.fireTimer = spec.fireCooldown / rateMult;

    const volScale = ship.isPlayer
      ? 1.0
      : Math.max(0, 1 - Math.hypot(ship.x - this.cameraX, ship.y - this.cameraY) / 1100) *
        0.35;

    const cos = Math.cos(ship.angle);
    const sin = Math.sin(ship.angle);
    const perpX = -sin;
    const perpY = cos;

    if (ship.shipClass === 'interceptor') {
      // Twin rapid pulse blasters
      for (const side of [-1, 1]) {
        const ox = ship.x + cos * 14 + perpX * side * 9;
        const oy = ship.y + sin * 14 + perpY * side * 9;
        const spread = (Math.random() - 0.5) * 0.04;
        const a = ship.angle + spread;
        this.projectiles.push({
          uid: this.nextUid++,
          teamId: ship.teamId,
          ownerUid: ship.uid,
          kind: 'pulse',
          x: ox,
          y: oy,
          vx: Math.cos(a) * 860 + ship.vx * 0.2,
          vy: Math.sin(a) * 860 + ship.vy * 0.2,
          angle: a,
          damage: 14 * dmgMult,
          planetDamage: 12 * dmgMult,
          radius: 4.5,
          splashRadius: 0,
          life: 0.85,
          maxLife: 0.85,
          pierceLeft: 0,
          hitUids: new Set(),
          turnRate: 0,
        });
      }
      if (volScale > 0.05) sound.playLaser('pulse', volScale);
    } else if (ship.shipClass === 'dreadnought') {
      // Heavy explosive siege plasma shell
      const ox = ship.x + cos * 22;
      const oy = ship.y + sin * 22;
      this.projectiles.push({
        uid: this.nextUid++,
        teamId: ship.teamId,
        ownerUid: ship.uid,
        kind: 'plasma',
        x: ox,
        y: oy,
        vx: cos * 580 + ship.vx * 0.2,
        vy: sin * 580 + ship.vy * 0.2,
        angle: ship.angle,
        damage: 46 * dmgMult,
        planetDamage: 56 * dmgMult,
        radius: 8,
        splashRadius: 92,
        life: 1.25,
        maxLife: 1.25,
        pierceLeft: 0,
        hitUids: new Set(),
        turnRate: 0,
      });
      // Subtle recoil kick
      ship.vx -= cos * 38;
      ship.vy -= sin * 38;
      if (volScale > 0.05) sound.playLaser('plasma', volScale);
    } else if (ship.shipClass === 'artillery') {
      // Hyper-velocity piercing railgun slug
      const ox = ship.x + cos * 25;
      const oy = ship.y + sin * 25;
      this.projectiles.push({
        uid: this.nextUid++,
        teamId: ship.teamId,
        ownerUid: ship.uid,
        kind: 'rail',
        x: ox,
        y: oy,
        vx: cos * 1280,
        vy: sin * 1280,
        angle: ship.angle,
        damage: 58 * dmgMult,
        planetDamage: 54 * dmgMult,
        radius: 5,
        splashRadius: 0,
        life: 0.88,
        maxLife: 0.88,
        pierceLeft: 2,
        hitUids: new Set(),
        turnRate: 0,
      });
      ship.vx -= cos * 26;
      ship.vy -= sin * 26;
      if (volScale > 0.05) sound.playLaser('rail', volScale);
    } else {
      // Carrier: twin homing micro-missiles
      for (const side of [-1, 1]) {
        const ox = ship.x + cos * 10 + perpX * side * 12;
        const oy = ship.y + sin * 10 + perpY * side * 12;
        const a = ship.angle + side * 0.16;
        this.projectiles.push({
          uid: this.nextUid++,
          teamId: ship.teamId,
          ownerUid: ship.uid,
          kind: 'missile',
          x: ox,
          y: oy,
          vx: Math.cos(a) * 540,
          vy: Math.sin(a) * 540,
          angle: a,
          damage: 22 * dmgMult,
          planetDamage: 24 * dmgMult,
          radius: 5,
          splashRadius: 42,
          life: 1.45,
          maxLife: 1.45,
          pierceLeft: 0,
          hitUids: new Set(),
          turnRate: 4.4,
        });
      }
      if (volScale > 0.05) sound.playLaser('missile', volScale);
    }
  }

  private activateShipAbility(ship: ShipEntity): void {
    const spec = SHIP_CLASSES[ship.shipClass];
    if (ship.abilityTimer > 0) return;

    ship.abilityTimer = spec.abilityCooldown;
    const team = TEAMS[ship.teamId];

    if (ship.shipClass === 'interceptor') {
      // PHASE DASH + EMP BURST
      const dashDist = 210;
      const startX = ship.x;
      const startY = ship.y;
      const cos = Math.cos(ship.angle);
      const sin = Math.sin(ship.angle);

      // Spawn afterimage trail along dash vector
      for (let step = 1; step <= 5; step++) {
        const t = step / 5;
        this.spawnParticle({
          x: startX + cos * dashDist * t,
          y: startY + sin * dashDist * t,
          vx: 0,
          vy: 0,
          size: 11,
          endSize: 2,
          alpha: 0.75,
          life: 0.32,
          maxLife: 0.32,
          color: team.secondary,
          additive: true,
          shape: 'circle',
          angle: 0,
          spin: 0,
        });
      }

      ship.x += cos * dashDist;
      ship.y += sin * dashDist;
      ship.vx = cos * 420;
      ship.vy = sin * 420;
      ship.invulnTimer = 0.6;
      this.resolveBodyObstacles(ship);

      // EMP shockwave clears enemy projectiles & damages nearby enemies
      const empR = 165;
      this.spawnShockwave(ship.x, ship.y, empR, team.secondary, 4, 0.35);
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        if (p.teamId !== ship.teamId) {
          if (Math.hypot(p.x - ship.x, p.y - ship.y) <= empR) {
            this.projectiles.splice(i, 1);
          }
        }
      }
      for (const other of this.ships) {
        if (other.teamId === ship.teamId) continue;
        const dx = other.x - ship.x;
        const dy = other.y - ship.y;
        const d = Math.hypot(dx, dy);
        if (d <= empR && d > 0.1) {
          other.vx += (dx / d) * 340;
          other.vy += (dy / d) * 340;
          this.damageShip(other, 42, ship.uid, ship.teamId);
        }
      }

      if (ship.isPlayer) {
        sound.playAbility('dash');
        this.addShake(7);
      }
    } else if (ship.shipClass === 'dreadnought') {
      // AEGIS DEFLECTOR DOME + NOVA
      ship.abilityActiveTimer = 2.6;
      this.spawnShockwave(ship.x, ship.y, 175, '#7DD3FC', 4, 0.45);
      // Immediate blast against nearby foes
      for (const other of this.ships) {
        if (other.teamId === ship.teamId) continue;
        const dx = other.x - ship.x;
        const dy = other.y - ship.y;
        const d = Math.hypot(dx, dy);
        if (d <= 185 && d > 0.1) {
          other.vx += (dx / d) * 380;
          other.vy += (dy / d) * 380;
          this.damageShip(other, 65, ship.uid, ship.teamId);
        }
      }
      for (const planet of this.planets) {
        if (planet.teamId === ship.teamId || !planet.alive) continue;
        if (Math.hypot(planet.x - ship.x, planet.y - ship.y) <= planet.radius + 185) {
          this.damagePlanet(planet, 85, ship.angle, ship.teamId);
        }
      }
      if (ship.isPlayer) {
        sound.playAbility('shield');
        this.addShake(9);
      }
    } else if (ship.shipClass === 'artillery') {
      // ORBITAL ION BEAM
      ship.abilityActiveTimer = 0.85;
      if (ship.isPlayer) {
        sound.playAbility('beam');
        this.addShake(8);
      }
    } else {
      // CARRIER: DEPLOY 4 ATTACK DRONES
      for (let i = 0; i < 4; i++) {
        const a = ship.angle + (i / 4) * Math.PI * 2;
        this.drones.push({
          uid: this.nextUid++,
          teamId: ship.teamId,
          ownerUid: ship.uid,
          x: ship.x + Math.cos(a) * 28,
          y: ship.y + Math.sin(a) * 28,
          vx: Math.cos(a) * 240,
          vy: Math.sin(a) * 240,
          angle: a,
          hp: 28,
          life: 11.0,
          fireTimer: 0.25 + i * 0.1,
          orbitOffset: (i / 4) * Math.PI * 2,
        });
      }
      this.spawnShockwave(ship.x, ship.y, 75, team.primary, 2.5, 0.3);
      if (ship.isPlayer) {
        sound.playAbility('drones');
      }
    }
  }

  private processIonBeam(ship: ShipEntity, dt: number): void {
    const beamLen = 780;
    const cos = Math.cos(ship.angle);
    const sin = Math.sin(ship.angle);
    const x1 = ship.x + cos * 24;
    const y1 = ship.y + sin * 24;
    let x2 = x1 + cos * beamLen;
    let y2 = y1 + sin * beamLen;

    // Stop beam on asteroid
    for (const ast of this.asteroids) {
      const hitT = this.segmentCircleIntersect(x1, y1, x2, y2, ast.x, ast.y, ast.radius);
      if (hitT !== null) {
        x2 = x1 + (x2 - x1) * hitT;
        y2 = y1 + (y2 - y1) * hitT;
      }
    }

    // Check enemy planets
    for (const planet of this.planets) {
      if (planet.teamId === ship.teamId || !planet.alive) continue;
      const hitT = this.segmentCircleIntersect(
        x1,
        y1,
        x2,
        y2,
        planet.x,
        planet.y,
        planet.radius + 16
      );
      if (hitT !== null) {
        x2 = x1 + (x2 - x1) * hitT;
        y2 = y1 + (y2 - y1) * hitT;
        this.damagePlanet(planet, 145 * dt, ship.angle + Math.PI, ship.teamId);
        if (Math.random() < 0.5) {
          this.spawnExplosionParticles(x2, y2, TEAMS[ship.teamId].secondary, 2, 90);
        }
      }
    }

    // Check enemy ships along beam
    for (const other of this.ships) {
      if (other.teamId === ship.teamId) continue;
      const hitT = this.segmentCircleIntersect(
        x1,
        y1,
        x2,
        y2,
        other.x,
        other.y,
        other.radius + 8
      );
      if (hitT !== null) {
        this.damageShip(other, 130 * dt, ship.uid, ship.teamId);
        if (Math.random() < 0.4) {
          this.spawnExplosionParticles(other.x, other.y, '#7DD3FC', 2, 100);
        }
      }
    }

    this.beams.push({
      teamId: ship.teamId,
      x1,
      y1,
      x2,
      y2,
      color: TEAMS[ship.teamId].primary,
      width: 14,
      life: 0.06,
      maxLife: 0.06,
    });
  }

  private updateDrones(dt: number): void {
    for (let i = this.drones.length - 1; i >= 0; i--) {
      const d = this.drones[i];
      d.life -= dt;
      d.fireTimer -= dt;
      if (d.life <= 0 || d.hp <= 0) {
        this.spawnExplosionParticles(d.x, d.y, TEAMS[d.teamId].primary, 6, 90);
        this.drones.splice(i, 1);
        continue;
      }

      // Find nearest hostile ship or enemy planet
      const target = this.findNearestHostileForTeam(d.teamId, d.x, d.y, 750);
      if (target) {
        const toAngle = Math.atan2(target.y - d.y, target.x - d.x);
        d.angle = this.lerpAngle(d.angle, toAngle, 6.5 * dt);
        d.vx += Math.cos(d.angle) * 760 * dt;
        d.vy += Math.sin(d.angle) * 760 * dt;

        const dist = Math.hypot(target.x - d.x, target.y - d.y);
        if (dist < 420 && d.fireTimer <= 0) {
          d.fireTimer = 0.42;
          this.projectiles.push({
            uid: this.nextUid++,
            teamId: d.teamId,
            ownerUid: d.ownerUid,
            kind: 'pulse',
            x: d.x + Math.cos(d.angle) * 10,
            y: d.y + Math.sin(d.angle) * 10,
            vx: Math.cos(d.angle) * 720,
            vy: Math.sin(d.angle) * 720,
            angle: d.angle,
            damage: 9,
            planetDamage: 11,
            radius: 3.5,
            splashRadius: 0,
            life: 0.65,
            maxLife: 0.65,
            pierceLeft: 0,
            hitUids: new Set(),
            turnRate: 0,
          });
        }
      } else {
        // Orbit owner if alive
        const owner = this.ships.find((s) => s.uid === d.ownerUid);
        if (owner) {
          const orbitA = this.time * 2.6 + d.orbitOffset;
          const gx = owner.x + Math.cos(orbitA) * 58;
          const gy = owner.y + Math.sin(orbitA) * 58;
          const a = Math.atan2(gy - d.y, gx - d.x);
          d.angle = a;
          d.vx += Math.cos(a) * 680 * dt;
          d.vy += Math.sin(a) * 680 * dt;
        }
      }

      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= Math.pow(0.15, dt);
      d.vy *= Math.pow(0.15, dt);
    }
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Homing behavior for Carrier micro-missiles
      if (p.turnRate > 0) {
        const target = this.findNearestHostileForTeam(p.teamId, p.x, p.y, 560);
        if (target) {
          const desired = Math.atan2(target.y - p.y, target.x - p.x);
          p.angle = this.lerpAngle(p.angle, desired, p.turnRate * dt);
          const spd = Math.hypot(p.vx, p.vy);
          p.vx = Math.cos(p.angle) * spd;
          p.vy = Math.sin(p.angle) * spd;
        }
        if (Math.random() < 0.45) {
          this.spawnParticle({
            x: p.x,
            y: p.y,
            vx: (Math.random() - 0.5) * 18,
            vy: (Math.random() - 0.5) * 18,
            size: 2.2,
            endSize: 0.3,
            alpha: 0.55,
            life: 0.2,
            maxLife: 0.2,
            color: TEAMS[p.teamId].secondary,
            additive: true,
            shape: 'circle',
            angle: 0,
            spin: 0,
          });
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      let destroyed = false;

      // 1. Asteroid impact
      for (const ast of this.asteroids) {
        const dx = p.x - ast.x;
        const dy = p.y - ast.y;
        if (dx * dx + dy * dy <= (ast.radius + p.radius) * (ast.radius + p.radius)) {
          ast.hitFlash = 0.6;
          this.spawnExplosionParticles(p.x, p.y, '#94A3B8', 5, 95);
          destroyed = true;
          break;
        }
      }
      if (destroyed) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // 2. Hostile Planet impact
      for (const planet of this.planets) {
        if (planet.teamId === p.teamId || !planet.alive) continue;
        const hitRadius =
          planet.shieldHp > 0 ? planet.radius + 30 : planet.radius;
        const dx = p.x - planet.x;
        const dy = p.y - planet.y;
        if (dx * dx + dy * dy <= (hitRadius + p.radius) * (hitRadius + p.radius)) {
          const hitAngle = Math.atan2(dy, dx);
          this.damagePlanet(planet, p.planetDamage, hitAngle, p.teamId);
          this.spawnExplosionParticles(
            p.x,
            p.y,
            planet.shieldHp > 0 ? TEAMS[planet.teamId].secondary : TEAMS[p.teamId].primary,
            p.kind === 'plasma' ? 14 : 7,
            p.kind === 'plasma' ? 170 : 110
          );
          if (p.splashRadius > 0) {
            this.spawnShockwave(p.x, p.y, p.splashRadius, TEAMS[p.teamId].primary, 2.5, 0.28);
          }
          destroyed = true;
          break;
        }
      }
      if (destroyed) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // 3. Hostile Ship impact
      for (const ship of this.ships) {
        if (ship.teamId === p.teamId) continue;
        if (p.hitUids.has(ship.uid)) continue;

        // Generous hit radius for enemy ships, fair hurtbox for player
        const hurtR = ship.isPlayer ? ship.radius * 0.85 : ship.radius * 1.12;
        const dx = p.x - ship.x;
        const dy = p.y - ship.y;
        if (dx * dx + dy * dy <= (hurtR + p.radius) * (hurtR + p.radius)) {
          // Check Dreadnought Aegis Deflector Shield
          if (ship.shipClass === 'dreadnought' && ship.abilityActiveTimer > 0) {
            this.spawnExplosionParticles(p.x, p.y, '#7DD3FC', 6, 120);
            if (ship.isPlayer) sound.playHit(true, 0.7);
            destroyed = true;
            break;
          }

          p.hitUids.add(ship.uid);
          this.damageShip(ship, p.damage, p.ownerUid, p.teamId);
          this.spawnExplosionParticles(
            p.x,
            p.y,
            TEAMS[p.teamId].primary,
            p.kind === 'plasma' ? 14 : 6,
            120
          );

          // Splash damage (Dreadnought Plasma & Carrier Missiles)
          if (p.splashRadius > 0) {
            this.spawnShockwave(p.x, p.y, p.splashRadius, TEAMS[p.teamId].primary, 2.5, 0.26);
            for (const nearby of this.ships) {
              if (nearby.teamId === p.teamId || nearby.uid === ship.uid) continue;
              if (Math.hypot(nearby.x - p.x, nearby.y - p.y) <= p.splashRadius) {
                this.damageShip(nearby, p.damage * 0.65, p.ownerUid, p.teamId);
              }
            }
          }

          if (p.pierceLeft > 0) {
            p.pierceLeft -= 1;
          } else {
            destroyed = true;
          }
          break;
        }
      }

      if (destroyed) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private damageShip(
    ship: ShipEntity,
    amount: number,
    attackerUid: number,
    attackerTeamId: number
  ): void {
    if (ship.invulnTimer > 0) return;

    ship.hp -= amount;
    ship.hitFlash = 1.0;

    const player = this.getPlayerShip();
    const attackerIsPlayer = player !== null && attackerUid === player.uid;

    if (ship.isPlayer) {
      sound.playHit(false, 0.9);
      this.addShake(Math.min(6, amount * 0.14));
    } else if (attackerIsPlayer) {
      sound.playHit(false, 0.65);
    }

    if (ship.hp <= 0) {
      const idx = this.ships.indexOf(ship);
      if (idx !== -1) this.ships.splice(idx, 1);

      const team = TEAMS[ship.teamId];
      this.spawnExplosionParticles(ship.x, ship.y, team.primary, 24, 220);
      this.spawnExplosionParticles(ship.x, ship.y, '#FFFFFF', 10, 150);
      this.spawnShockwave(ship.x, ship.y, 75, team.primary, 3, 0.36);

      const distToCam = Math.hypot(ship.x - this.cameraX, ship.y - this.cameraY);
      const vol = Math.max(0, 1 - distToCam / 1150);
      if (vol > 0.05) {
        sound.playExplosion('medium', vol);
      }

      if (ship.isPlayer) {
        this.addShake(15);
        this.hitStopTimer = 0.04;
        const home = this.planets.find((p) => p.teamId === 0);
        if (home && home.alive) {
          this.playerRespawnTimer = 2.4;
          this.showBanner('HULL BREACHED — REDEPLOYING IN 2.4s', '#FB7185', 2.2);
        } else {
          this.showBanner('SHIP LOST — HOMEWORLD DESTROYED!', '#FB7185', 2.5);
        }
      } else {
        if (distToCam < 700) {
          this.addShake(6);
        }
        // Drop repair or overcharge pickup!
        if (Math.random() < 0.55) {
          this.pickups.push({
            uid: this.nextUid++,
            kind: Math.random() < 0.65 ? 'repair' : 'overcharge',
            x: ship.x,
            y: ship.y,
            vx: (Math.random() - 0.5) * 40,
            vy: (Math.random() - 0.5) * 40,
            life: 16,
            pulse: Math.random() * Math.PI * 2,
          });
        }

        // Award points & combo if player or player's team got the kill
        if (attackerIsPlayer && this.phase === 'playing') {
          this.kills += 1;
          this.combo = Math.min(8, this.combo + 1);
          this.comboTimer = 4.6;
          const pts = 250 * this.combo;
          this.hitStopTimer = 0.028;
          this.addScore(
            pts,
            ship.x,
            ship.y - 22,
            this.combo > 1 ? `+${pts} (x${this.combo})` : `+${pts}`,
            '#38BDF8'
          );
        } else if (attackerTeamId === 0 && this.phase === 'playing') {
          this.score += 75;
        }
      }
    }
  }

  private damagePlanet(
    planet: PlanetEntity,
    amount: number,
    hitAngle: number,
    attackerTeamId: number
  ): void {
    if (!planet.alive) return;

    planet.shieldRegenDelay = 4.5;
    if (attackerTeamId === 0 && this.phase === 'playing') {
      this.planetDamageDealt += amount;
      this.score += Math.round(amount * 0.8);
    }

    if (planet.shieldHp > 0) {
      planet.shieldHp = Math.max(0, planet.shieldHp - amount);
      planet.shieldFlash = 1.0;
      planet.shieldHitAngle = hitAngle;
      if (attackerTeamId === 0 && this.phase === 'playing') {
        sound.playHit(true, 0.5);
      }
      if (planet.shieldHp === 0) {
        this.spawnShockwave(
          planet.x,
          planet.y,
          planet.radius + 75,
          TEAMS[planet.teamId].secondary,
          4,
          0.5
        );
        this.addFloatingText(
          planet.x,
          planet.y - planet.radius - 18,
          'SHIELD BROKEN!',
          '#FBBF24',
          1.2
        );
        if (this.phase === 'playing') {
          this.showBanner(
            `${TEAMS[planet.teamId].planetName} SHIELDS COLLAPSED!`,
            '#FBBF24',
            2.1
          );
        }
      }
      return;
    }

    planet.hp -= amount;
    planet.hitFlash = 1.0;
    if (attackerTeamId === 0 && this.phase === 'playing') {
      sound.playHit(false, 0.55);
    }

    if (planet.hp <= 0) {
      planet.hp = 0;
      planet.alive = false;

      const team = TEAMS[planet.teamId];
      // Massive planetary supernova sequence!
      this.spawnExplosionParticles(planet.x, planet.y, team.primary, 65, 360);
      this.spawnExplosionParticles(planet.x, planet.y, '#FFFFFF', 30, 260);
      this.spawnExplosionParticles(planet.x, planet.y, '#FBBF24', 28, 300);
      this.spawnShockwave(planet.x, planet.y, 340, team.primary, 6, 0.85);
      this.spawnShockwave(planet.x, planet.y, 220, '#FFFFFF', 4, 0.65);

      sound.playExplosion('planet', 1.0);
      this.addShake(24);
      this.hitStopTimer = 0.065;

      // Eliminate remaining ships belonging to the destroyed planet
      for (let i = this.ships.length - 1; i >= 0; i--) {
        if (this.ships[i].teamId === planet.teamId && !this.ships[i].isPlayer) {
          const s = this.ships[i];
          this.spawnExplosionParticles(s.x, s.y, team.primary, 14, 160);
          this.ships.splice(i, 1);
        }
      }

      if (this.phase === 'playing') {
        if (planet.teamId !== 0) {
          this.addScore(
            2000,
            planet.x,
            planet.y - 30,
            'PLANET DESTROYED! +2000',
            '#FBBF24'
          );
          this.showBanner(
            `${team.planetName} OBLITERATED! (+2000)`,
            team.primary,
            2.6
          );
        } else {
          this.showBanner(
            'AURELIA PRIME DESTROYED — LAST STAND!',
            '#FB7185',
            2.8
          );
        }
      }
    }
  }

  private updateAsteroids(dt: number): void {
    for (const ast of this.asteroids) {
      ast.rotation += ast.rotSpeed * dt;
      if (ast.hitFlash > 0) ast.hitFlash = Math.max(0, ast.hitFlash - dt * 4);
    }
  }

  private updatePickups(dt: number): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;

      if (p.life <= 0) {
        this.pickups.splice(i, 1);
        continue;
      }

      // Magnetic pull toward nearby player ship
      const player = this.getPlayerShip();
      if (player) {
        const dx = player.x - p.x;
        const dy = player.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 160 && dist > 1) {
          p.x += (dx / dist) * 260 * dt;
          p.y += (dy / dist) * 260 * dt;
        }
        if (dist <= player.radius + 18) {
          if (p.kind === 'repair') {
            const heal = Math.round(player.maxHp * 0.35);
            player.hp = Math.min(player.maxHp, player.hp + heal);
            this.addFloatingText(player.x, player.y - 24, `+${heal} HULL`, '#34D399', 1.0);
          } else {
            player.overchargeTimer = 7.0;
            this.addFloatingText(
              player.x,
              player.y - 24,
              'WEAPON OVERCHARGE!',
              '#FBBF24',
              1.05
            );
          }
          if (this.phase === 'playing') this.score += 100;
          sound.playPickup();
          this.spawnShockwave(p.x, p.y, 44, p.kind === 'repair' ? '#34D399' : '#FBBF24', 2, 0.25);
          this.pickups.splice(i, 1);
        }
      }
    }
  }

  private resolveBodyObstacles(ship: ShipEntity): void {
    // Planets
    for (const p of this.planets) {
      if (!p.alive) continue;
      const dx = ship.x - p.x;
      const dy = ship.y - p.y;
      const dist = Math.hypot(dx, dy);
      const minDist = p.radius + ship.radius + 6;
      if (dist < minDist && dist > 0.001) {
        const nx = dx / dist;
        const ny = dy / dist;
        ship.x = p.x + nx * minDist;
        ship.y = p.y + ny * minDist;
        const dot = ship.vx * nx + ship.vy * ny;
        if (dot < 0) {
          ship.vx -= nx * dot * 1.3;
          ship.vy -= ny * dot * 1.3;
        }
      }
    }

    // Asteroids
    for (const ast of this.asteroids) {
      const dx = ship.x - ast.x;
      const dy = ship.y - ast.y;
      const dist = Math.hypot(dx, dy);
      const minDist = ast.radius + ship.radius;
      if (dist < minDist && dist > 0.001) {
        const nx = dx / dist;
        const ny = dy / dist;
        ship.x = ast.x + nx * minDist;
        ship.y = ast.y + ny * minDist;
        const dot = ship.vx * nx + ship.vy * ny;
        if (dot < 0) {
          ship.vx -= nx * dot * 1.35;
          ship.vy -= ny * dot * 1.35;
        }
      }
    }
  }

  private updateVisualEffects(dt: number): void {
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 36);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.96;
      pt.vy *= 0.96;
      pt.angle += pt.spin * dt;
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      const progress = 1 - sw.life / sw.maxLife;
      sw.radius = sw.maxRadius * (1 - Math.pow(1 - progress, 3));
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      ft.y += ft.vy * dt;
    }

    for (let i = this.beams.length - 1; i >= 0; i--) {
      this.beams[i].life -= dt;
      if (this.beams[i].life <= 0) {
        this.beams.splice(i, 1);
      }
    }
  }

  private updateCamera(dt: number): void {
    if (this.phase === 'menu') {
      // Gentle orbital sweep over the live AI skirmish
      const targetX = Math.cos(this.time * 0.22) * 260;
      const targetY = Math.sin(this.time * 0.18) * 140;
      this.cameraX += (targetX - this.cameraX) * 2.5 * dt;
      this.cameraY += (targetY - this.cameraY) * 2.5 * dt;
      return;
    }

    const player = this.getPlayerShip();
    if (player) {
      // Lead camera slightly in velocity & aim direction for great forward sightlines
      const leadX = player.x + player.vx * 0.22 + Math.cos(player.angle) * 45;
      const leadY = player.y + player.vy * 0.22 + Math.sin(player.angle) * 45;
      this.cameraX += (leadX - this.cameraX) * Math.min(1, 8.5 * dt);
      this.cameraY += (leadY - this.cameraY) * Math.min(1, 8.5 * dt);
    } else {
      const home = this.planets.find((p) => p.teamId === 0);
      if (home) {
        this.cameraX += (home.x - this.cameraX) * 4 * dt;
        this.cameraY += (home.y - this.cameraY) * 4 * dt;
      }
    }
  }

  private checkMatchOutcome(): void {
    const enemyPlanetsAlive = this.planets.filter(
      (p) => p.teamId !== 0 && p.alive
    );
    const homePlanet = this.planets.find((p) => p.teamId === 0);
    const player = this.getPlayerShip();

    if (enemyPlanetsAlive.length === 0) {
      // VICTORY!
      this.victory = true;
      const speedBonus = Math.max(0, Math.round((240 - this.matchTime) * 12));
      this.score += 1500 + speedBonus;
      this.phase = 'gameover';
      this.keys.clear();
      this.mouseDown = false;
      this.touchFiring = false;
      this.emitHud();
      this.onMatchEnd?.({
        score: this.score,
        kills: this.kills,
        victory: true,
        shipClass: this.selectedShip,
        mode: this.battleMode,
      });
      return;
    }

    if ((!homePlanet || !homePlanet.alive) && !player) {
      // DEFEAT
      this.victory = false;
      this.phase = 'gameover';
      this.keys.clear();
      this.mouseDown = false;
      this.touchFiring = false;
      this.emitHud();
      this.onMatchEnd?.({
        score: this.score,
        kills: this.kills,
        victory: false,
        shipClass: this.selectedShip,
        mode: this.battleMode,
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const shakeX =
      this.shakeIntensity > 0 ? (Math.random() - 0.5) * this.shakeIntensity * 2 : 0;
    const shakeY =
      this.shakeIntensity > 0 ? (Math.random() - 0.5) * this.shakeIntensity * 2 : 0;

    this.renderer.render(ctx, {
      width: this.viewportWidth,
      height: this.viewportHeight,
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      cameraX: this.cameraX,
      cameraY: this.cameraY,
      cameraZoom: this.cameraZoom,
      shakeX,
      shakeY,
      time: this.time,
      planets: this.planets,
      ships: this.ships,
      projectiles: this.projectiles,
      drones: this.drones,
      asteroids: this.asteroids,
      pickups: this.pickups,
      particles: this.particles,
      shockwaves: this.shockwaves,
      floatingTexts: this.floatingTexts,
      beams: this.beams,
      relay: this.relay,
      playerShip: this.getPlayerShip(),
      mouseScreenX: this.mouseScreenX,
      mouseScreenY: this.mouseScreenY,
      mouseActive: this.mouseActive,
      isTouchDevice: this.isTouchDevice,
      showHudDecorations: this.phase === 'playing',
    });
  }

  public setIsNewHighScore(flag: boolean): void {
    this.isNewHighScore = flag;
    this.emitHud();
  }

  private emitHud(): void {
    const player = this.getPlayerShip();
    const spec = SHIP_CLASSES[this.selectedShip];
    const home = this.planets.find((p) => p.teamId === 0);

    const abilityReadyRatio = player
      ? Math.max(
          0,
          Math.min(
            1,
            1 - player.abilityTimer / SHIP_CLASSES[player.shipClass].abilityCooldown
          )
        )
      : 1;

    this.onHudUpdate({
      phase: this.phase,
      battleMode: this.battleMode,
      selectedShip: this.selectedShip,
      score: this.score,
      combo: this.combo,
      comboTimer: Math.max(0, Math.min(1, this.comboTimer / 4.6)),
      kills: this.kills,
      planetDamageDealt: Math.round(this.planetDamageDealt),
      matchTime: this.matchTime,
      playerAlive: Boolean(player),
      respawnTimer: Math.max(0, this.playerRespawnTimer),
      playerHp: player ? Math.ceil(player.hp) : 0,
      playerMaxHp: player ? player.maxHp : spec.maxHp,
      abilityReadyRatio,
      abilityActive: player ? player.abilityActiveTimer > 0 : false,
      overchargeActive: player ? player.overchargeTimer > 0 : false,
      nearHomePlanet: player ? this.isNearHomePlanet(player) : false,
      homePlanetAlive: Boolean(home && home.alive),
      relayOwner: this.relay.ownerTeam,
      planets: this.planets.map((p) => ({
        teamId: p.teamId,
        name: TEAMS[p.teamId].planetName,
        hp: Math.ceil(p.hp),
        maxHp: p.maxHp,
        shieldHp: Math.ceil(p.shieldHp),
        maxShieldHp: p.maxShieldHp,
        alive: p.alive,
      })),
      victory: this.victory,
      isNewHighScore: this.isNewHighScore,
      bannerText: this.bannerText,
      bannerColor: this.bannerColor,
    });
  }

  // Helper utilities
  private addScore(
    points: number,
    x: number,
    y: number,
    label: string,
    color: string
  ): void {
    this.score += points;
    this.addFloatingText(x, y, label, color, 1.05);
  }

  private addFloatingText(
    x: number,
    y: number,
    text: string,
    color: string,
    scale = 1
  ): void {
    this.floatingTexts.push({
      x,
      y,
      vy: -38,
      text,
      color,
      scale,
      life: 0.95,
      maxLife: 0.95,
    });
  }

  private showBanner(text: string, color: string, duration: number): void {
    this.bannerText = text;
    this.bannerColor = color;
    this.bannerTimer = duration;
  }

  private addShake(amount: number): void {
    this.shakeIntensity = Math.min(26, this.shakeIntensity + amount);
  }

  private spawnParticle(p: Particle): void {
    if (this.particles.length > 420) return;
    this.particles.push(p);
  }

  private spawnExplosionParticles(
    x: number,
    y: number,
    color: string,
    count: number,
    maxSpeed: number
  ): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 25 + Math.random() * maxSpeed;
      const life = 0.25 + Math.random() * 0.42;
      this.spawnParticle({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 2.5 + Math.random() * 3.5,
        endSize: 0.2,
        alpha: 0.95,
        life,
        maxLife: life,
        color,
        additive: true,
        shape: i % 3 === 0 ? 'shard' : 'spark',
        angle: a,
        spin: (Math.random() - 0.5) * 14,
      });
    }
  }

  private spawnShockwave(
    x: number,
    y: number,
    maxRadius: number,
    color: string,
    lineWidth: number,
    duration: number
  ): void {
    this.shockwaves.push({
      x,
      y,
      radius: 8,
      maxRadius,
      color,
      alpha: 0.9,
      lineWidth,
      life: duration,
      maxLife: duration,
    });
  }

  private findNearestHostileTarget(
    ship: ShipEntity,
    maxRange: number
  ): { x: number; y: number } | null {
    return this.findNearestHostileForTeam(ship.teamId, ship.x, ship.y, maxRange);
  }

  private findNearestHostileForTeam(
    teamId: number,
    x: number,
    y: number,
    maxRange: number
  ): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let bestDistSq = maxRange * maxRange;

    for (const s of this.ships) {
      if (s.teamId === teamId) continue;
      const dx = s.x - x;
      const dy = s.y - y;
      const dSq = dx * dx + dy * dy;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = { x: s.x, y: s.y };
      }
    }

    if (!best) {
      for (const p of this.planets) {
        if (p.teamId === teamId || !p.alive) continue;
        const dx = p.x - x;
        const dy = p.y - y;
        const dSq = dx * dx + dy * dy;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          best = { x: p.x, y: p.y };
        }
      }
    }

    return best;
  }

  private segmentCircleIntersect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    cx: number,
    cy: number,
    r: number
  ): number | null {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const fx = x1 - cx;
    const fy = y1 - cy;
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    let disc = b * b - 4 * a * c;
    if (disc < 0 || a < 0.0001) return null;
    disc = Math.sqrt(disc);
    const t1 = (-b - disc) / (2 * a);
    const t2 = (-b + disc) / (2 * a);
    if (t1 >= 0 && t1 <= 1) return t1;
    if (t2 >= 0 && t2 <= 1) return t2;
    return null;
  }

  private normalizeAngle(a: number): number {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  private lerpAngle(current: number, target: number, t: number): number {
    const diff = this.normalizeAngle(target - current);
    return current + diff * Math.min(1, t);
  }
}
