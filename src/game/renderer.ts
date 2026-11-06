import {
  AsteroidEntity,
  BeamEffect,
  DroneEntity,
  FloatingText,
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

export interface RenderState {
  width: number;
  height: number;
  worldWidth: number;
  worldHeight: number;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  shakeX: number;
  shakeY: number;
  time: number;
  planets: PlanetEntity[];
  ships: ShipEntity[];
  projectiles: ProjectileEntity[];
  drones: DroneEntity[];
  asteroids: AsteroidEntity[];
  pickups: PickupEntity[];
  particles: Particle[];
  shockwaves: Shockwave[];
  floatingTexts: FloatingText[];
  beams: BeamEffect[];
  relay: SolarRelay;
  playerShip: ShipEntity | null;
  mouseScreenX: number;
  mouseScreenY: number;
  mouseActive: boolean;
  isTouchDevice: boolean;
  showHudDecorations: boolean;
}

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  phase: number;
  parallax: number;
  tint: string;
}

export class SpaceRenderer {
  private bgCanvas: HTMLCanvasElement;
  private stars: Star[] = [];

  constructor() {
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = 1400;
    this.bgCanvas.height = 1000;
    this.buildStaticBackdrop();
    this.initParallaxStars();
  }

  private buildStaticBackdrop(): void {
    const ctx = this.bgCanvas.getContext('2d');
    if (!ctx) return;

    const w = this.bgCanvas.width;
    const h = this.bgCanvas.height;

    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, w, h);

    // Subtle cosmic nebula clouds
    const clouds = [
      { x: w * 0.25, y: h * 0.3, r: 420, color: 'rgba(14, 116, 144, 0.11)' },
      { x: w * 0.75, y: h * 0.65, r: 460, color: 'rgba(159, 18, 57, 0.09)' },
      { x: w * 0.52, y: h * 0.22, r: 360, color: 'rgba(67, 56, 202, 0.09)' },
      { x: w * 0.18, y: h * 0.8, r: 340, color: 'rgba(6, 95, 70, 0.08)' },
    ];

    for (const c of clouds) {
      const grad = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, c.r);
      grad.addColorStop(0, c.color);
      grad.addColorStop(1, 'rgba(5, 8, 17, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // Distant micro-stars baked into backdrop
    for (let i = 0; i < 260; i++) {
      const sx = Math.random() * w;
      const sy = Math.random() * h;
      const r = Math.random() * 1.1 + 0.3;
      const alpha = 0.15 + Math.random() * 0.35;
      ctx.fillStyle = `rgba(203, 213, 225, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private initParallaxStars(): void {
    const tints = ['#E2E8F0', '#BAE6FD', '#FDE68A', '#DDD6FE'];
    for (let i = 0; i < 130; i++) {
      this.stars.push({
        x: (Math.random() - 0.5) * 3400,
        y: (Math.random() - 0.5) * 2600,
        size: 0.8 + Math.random() * 1.9,
        alpha: 0.35 + Math.random() * 0.65,
        twinkleSpeed: 1.5 + Math.random() * 3.0,
        phase: Math.random() * Math.PI * 2,
        parallax: 0.25 + Math.random() * 0.45,
        tint: tints[i % tints.length],
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const { width, height, cameraX, cameraY, cameraZoom, shakeX, shakeY, time } = state;

    ctx.save();

    // 1. Tiled Deep Space Nebula Backdrop with subtle parallax
    const bgW = this.bgCanvas.width;
    const bgH = this.bgCanvas.height;
    const paraX = ((-cameraX * 0.12) % bgW + bgW) % bgW - bgW;
    const paraY = ((-cameraY * 0.12) % bgH + bgH) % bgH - bgH;

    for (let x = paraX; x < width + bgW; x += bgW) {
      for (let y = paraY; y < height + bgH; y += bgH) {
        ctx.drawImage(this.bgCanvas, x, y);
      }
    }

    // 2. Twinkling Parallax Starfield
    for (const s of this.stars) {
      const sx = ((s.x - cameraX * s.parallax) % 2800 + 2800) % 2800 - 400;
      const sy = ((s.y - cameraY * s.parallax) % 2200 + 2200) % 2200 - 300;
      if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) continue;

      const twinkle = 0.65 + 0.35 * Math.sin(time * s.twinkleSpeed + s.phase);
      ctx.globalAlpha = s.alpha * twinkle;
      ctx.fillStyle = s.tint;
      ctx.beginPath();
      ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 3. Apply World Camera Transform
    ctx.translate(width * 0.5 + shakeX, height * 0.5 + shakeY);
    ctx.scale(cameraZoom, cameraZoom);
    ctx.translate(-cameraX, -cameraY);

    // 4. Sector Perimeter Tactical Grid & Boundary
    this.drawArenaBounds(ctx, state.worldWidth, state.worldHeight);

    // 5. Central Solar Relay Objective
    this.drawSolarRelay(ctx, state.relay, time);

    // 6. Pickups
    for (const p of state.pickups) {
      this.drawPickup(ctx, p, time);
    }

    // 7. Asteroids
    for (const ast of state.asteroids) {
      this.drawAsteroid(ctx, ast);
    }

    // 8. Planets (Bases)
    for (const planet of state.planets) {
      this.drawPlanet(ctx, planet, time);
    }

    // 9. Drones
    for (const drone of state.drones) {
      this.drawDrone(ctx, drone);
    }

    // 10. Starships
    for (const ship of state.ships) {
      this.drawShip(ctx, ship, time);
    }

    // 11. Ion Beams (Additive)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const beam of state.beams) {
      this.drawBeam(ctx, beam);
    }
    ctx.restore();

    // 12. Projectiles
    for (const proj of state.projectiles) {
      this.drawProjectile(ctx, proj);
    }

    // 13. Shockwaves
    for (const sw of state.shockwaves) {
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = Math.max(0, sw.alpha * (sw.life / sw.maxLife));
      ctx.lineWidth = sw.lineWidth;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 14. Particles (Normal & Additive)
    for (const pt of state.particles) {
      const ratio = Math.max(0, pt.life / pt.maxLife);
      const size = pt.endSize + (pt.size - pt.endSize) * ratio;
      ctx.save();
      if (pt.additive) ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = pt.alpha * ratio;
      ctx.fillStyle = pt.color;
      ctx.translate(pt.x, pt.y);
      if (pt.shape === 'shard') {
        ctx.rotate(pt.angle);
        ctx.beginPath();
        ctx.moveTo(size * 1.4, 0);
        ctx.lineTo(-size, size * 0.7);
        ctx.lineTo(-size * 0.6, -size * 0.8);
        ctx.closePath();
        ctx.fill();
      } else if (pt.shape === 'spark') {
        ctx.rotate(pt.angle);
        ctx.fillRect(-size * 1.8, -size * 0.35, size * 3.6, size * 0.7);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.5, size), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 15. Floating Combat Numbers & Callouts
    for (const ft of state.floatingTexts) {
      const ratio = Math.max(0, ft.life / ft.maxLife);
      ctx.save();
      ctx.globalAlpha = Math.min(1, ratio * 1.4);
      ctx.font = `700 ${Math.round(13 * ft.scale)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#050811';
      ctx.fillText(ft.text, ft.x + 1.5, ft.y + 1.5);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore(); // Back to Screen Space

    // 16. Screen-Space Tactical Overlays (Off-screen Planet Pointers, Mini-Radar, Aim Reticle)
    if (state.showHudDecorations) {
      this.drawOffscreenIndicators(ctx, state);
      this.drawMiniRadar(ctx, state);
      if (
        !state.isTouchDevice &&
        state.mouseActive &&
        state.playerShip &&
        state.playerShip.hp > 0
      ) {
        this.drawReticle(ctx, state);
      }
    }
  }

  private drawArenaBounds(ctx: CanvasRenderingContext2D, worldW: number, worldH: number): void {
    const hw = worldW * 0.5;
    const hh = worldH * 0.5;

    // Subtle tactical grid lines
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.045)';
    ctx.lineWidth = 1;
    const step = 220;
    ctx.beginPath();
    for (let x = -hw; x <= hw; x += step) {
      ctx.moveTo(x, -hh);
      ctx.lineTo(x, hh);
    }
    for (let y = -hh; y <= hh; y += step) {
      ctx.moveTo(-hw, y);
      ctx.lineTo(hw, y);
    }
    ctx.stroke();

    // Glowing sector boundary perimeter
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 12]);
    ctx.strokeRect(-hw, -hh, worldW, worldH);
    ctx.restore();
  }

  private drawSolarRelay(ctx: CanvasRenderingContext2D, relay: SolarRelay, time: number): void {
    const ownerColor =
      relay.ownerTeam !== null ? TEAMS[relay.ownerTeam].primary : '#FBBF24';

    ctx.save();
    ctx.translate(relay.x, relay.y);

    // Capture zone aura
    const auraGrad = ctx.createRadialGradient(0, 0, 12, 0, 0, relay.radius * 1.55);
    auraGrad.addColorStop(
      0,
      relay.ownerTeam !== null ? TEAMS[relay.ownerTeam].glow : 'rgba(251, 191, 36, 0.16)'
    );
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, relay.radius * 1.55, 0, Math.PI * 2);
    ctx.fill();

    // Outer dashed capture ring
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, relay.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Capture progress arc
    if (Math.abs(relay.captureProgress) > 0.02) {
      const activeTeam =
        relay.contestingTeam !== null ? relay.contestingTeam : relay.ownerTeam;
      const arcColor = activeTeam !== null ? TEAMS[activeTeam].primary : '#FBBF24';
      ctx.strokeStyle = arcColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        relay.radius,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * Math.min(1, Math.abs(relay.captureProgress))
      );
      ctx.stroke();
    }

    // Rotating core structure
    ctx.rotate(relay.rotation);
    ctx.strokeStyle = ownerColor;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(14, -5);
      ctx.lineTo(30, 0);
      ctx.lineTo(14, 5);
      ctx.closePath();
      ctx.stroke();
    }

    // Center crystal
    const pulse = 1 + 0.12 * Math.sin(time * 5);
    ctx.fillStyle = ownerColor;
    ctx.beginPath();
    ctx.arc(0, 0, 10 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Label below relay
    ctx.save();
    ctx.font = '700 10px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(251, 191, 36, 0.72)';
    const label =
      relay.ownerTeam !== null
        ? `${TEAMS[relay.ownerTeam].shortName} RELAY (+FIRE RATE)`
        : 'SOLAR RELAY (CONTEST)';
    ctx.fillText(label, relay.x, relay.y + relay.radius + 16);
    ctx.restore();
  }

  private drawPlanet(ctx: CanvasRenderingContext2D, planet: PlanetEntity, time: number): void {
    if (!planet.alive) {
      // Draw scorched asteroid remnants
      ctx.save();
      ctx.translate(planet.x, planet.y);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, planet.radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const team = TEAMS[planet.teamId];
    const r = planet.radius;

    ctx.save();
    ctx.translate(planet.x, planet.y);

    // 1. Atmospheric outer corona glow
    const corona = ctx.createRadialGradient(0, 0, r * 0.75, 0, 0, r * 1.75);
    corona.addColorStop(0, team.glow);
    corona.addColorStop(1, 'rgba(5, 8, 17, 0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.75, 0, Math.PI * 2);
    ctx.fill();

    // 2. Planet Sphere Clip & Atmospheric Bands
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();

    // Base sphere gradient (3D light from top-left)
    const sphereGrad = ctx.createRadialGradient(-r * 0.32, -r * 0.35, r * 0.1, 0, 0, r * 1.15);
    sphereGrad.addColorStop(0, team.secondary);
    sphereGrad.addColorStop(0.45, team.planetCore);
    sphereGrad.addColorStop(1, '#060B19');
    ctx.fillStyle = sphereGrad;
    ctx.fillRect(-r, -r, r * 2, r * 2);

    // Rotating surface latitude bands
    ctx.rotate(planet.rotation * 0.25);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = -2; i <= 2; i++) {
      const bandY = i * (r * 0.32) + Math.sin(time * 0.6 + i) * 4;
      ctx.fillRect(-r * 1.2, bandY, r * 2.4, r * 0.11);
    }

    // Hit flash overlay on hull
    if (planet.hitFlash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${planet.hitFlash * 0.55})`;
      ctx.fillRect(-r, -r, r * 2, r * 2);
    }
    ctx.restore();

    // 3. Rim lighting stroke
    ctx.strokeStyle = team.primary;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Orbital Defense Ring & 2 Planetary Turrets
    const orbitR = r + 18;
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, orbitR, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 2; i++) {
      const mountAngle = planet.rotation + i * Math.PI;
      const tx = Math.cos(mountAngle) * orbitR;
      const ty = Math.sin(mountAngle) * orbitR;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(planet.turretAngles[i]);

      // Turret base
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = team.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Twin barrels
      ctx.fillStyle = team.secondary;
      ctx.fillRect(4, -4, 11, 2.5);
      ctx.fillRect(4, 1.5, 11, 2.5);
      ctx.restore();
    }

    // 5. Planetary Energy Shield Dome (if shieldHp > 0)
    if (planet.shieldHp > 0) {
      const shieldRatio = planet.shieldHp / planet.maxShieldHp;
      const shieldR = r + 30;
      ctx.save();
      ctx.strokeStyle = team.secondary;
      ctx.globalAlpha = 0.22 + shieldRatio * 0.35 + planet.shieldFlash * 0.4;
      ctx.lineWidth = 2.5 + planet.shieldFlash * 3;
      ctx.beginPath();
      ctx.arc(0, 0, shieldR, 0, Math.PI * 2);
      ctx.stroke();

      // Highlight arc where shield was recently hit
      if (planet.shieldFlash > 0.05) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.globalAlpha = planet.shieldFlash * 0.85;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          shieldR,
          planet.shieldHitAngle - 0.55,
          planet.shieldHitAngle + 0.55
        );
        ctx.stroke();
      }
      ctx.restore();
    }

    // 6. Diegetic Curved HP & Shield Arcs below Planet
    const barR = r + 44;
    const startA = Math.PI * 0.22;
    const endA = Math.PI * 0.78;
    const spanA = endA - startA;

    // Background track
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, barR, startA, endA);
    ctx.stroke();

    // Hull HP arc
    const hpRatio = Math.max(0, planet.hp / planet.maxHp);
    ctx.strokeStyle = team.primary;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, barR, endA - spanA * hpRatio, endA);
    ctx.stroke();

    // Shield arc (slightly outside)
    if (planet.shieldHp > 0) {
      const shRatio = Math.max(0, planet.shieldHp / planet.maxShieldHp);
      ctx.strokeStyle = '#E0F2FE';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, barR + 6, endA - spanA * shRatio, endA);
      ctx.stroke();
    }

    // Planet Name & HP Text
    ctx.font = '800 11px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = team.secondary;
    ctx.fillText(team.planetName, 0, -r - 38);

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#E2E8F0';
    ctx.fillText(`${Math.ceil(planet.hp)} HP`, 0, r + 62);

    ctx.restore();
  }

  private drawAsteroid(ctx: CanvasRenderingContext2D, ast: AsteroidEntity): void {
    ctx.save();
    ctx.translate(ast.x, ast.y);
    ctx.rotate(ast.rotation);

    ctx.beginPath();
    const count = ast.vertices.length;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const rad = ast.radius * ast.vertices[i];
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(
      -ast.radius * 0.3,
      -ast.radius * 0.3,
      ast.radius * 0.1,
      0,
      0,
      ast.radius
    );
    grad.addColorStop(0, ast.hitFlash > 0 ? '#64748B' : '#334155');
    grad.addColorStop(1, '#0F172A');

    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = ast.hitFlash > 0 ? '#94A3B8' : 'rgba(148, 163, 184, 0.32)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  private drawPickup(ctx: CanvasRenderingContext2D, p: PickupEntity, time: number): void {
    const isRepair = p.kind === 'repair';
    const color = isRepair ? '#34D399' : '#FBBF24';
    const bob = Math.sin(time * 5 + p.pulse) * 3;

    ctx.save();
    ctx.translate(p.x, p.y + bob);

    // Glow
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    grad.addColorStop(0, isRepair ? 'rgba(52, 211, 153, 0.45)' : 'rgba(251, 191, 36, 0.45)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();

    // Diamond container
    ctx.rotate(Math.sin(time * 2.5 + p.pulse) * 0.25);
    ctx.fillStyle = '#090E1C';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(11, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-11, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner cross or bolt
    ctx.fillStyle = color;
    if (isRepair) {
      ctx.fillRect(-2, -6, 4, 12);
      ctx.fillRect(-6, -2, 12, 4);
    } else {
      ctx.beginPath();
      ctx.moveTo(2, -6);
      ctx.lineTo(-4, 1);
      ctx.lineTo(0, 1);
      ctx.lineTo(-2, 6);
      ctx.lineTo(4, -1);
      ctx.lineTo(0, -1);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  private drawDrone(ctx: CanvasRenderingContext2D, drone: DroneEntity): void {
    const team = TEAMS[drone.teamId];
    ctx.save();
    ctx.translate(drone.x, drone.y);
    ctx.rotate(drone.angle);

    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = team.primary;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, 6);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing core
    ctx.fillStyle = team.secondary;
    ctx.beginPath();
    ctx.arc(1, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  public drawShipSilhouette(
    ctx: CanvasRenderingContext2D,
    shipClass: ShipClassId,
    primaryColor: string,
    secondaryColor: string,
    isThrusting: boolean,
    time: number
  ): void {
    // Thruster flame
    if (isThrusting) {
      const flicker = 0.8 + Math.random() * 0.45;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      if (shipClass === 'dreadnought') {
        ctx.moveTo(-18, -8);
        ctx.lineTo(-32 * flicker, -5);
        ctx.lineTo(-18, -2);
        ctx.moveTo(-18, 2);
        ctx.lineTo(-32 * flicker, 5);
        ctx.lineTo(-18, 8);
      } else {
        ctx.moveTo(-13, -5);
        ctx.lineTo(-28 * flicker, 0);
        ctx.lineTo(-13, 5);
      }
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#0B1222';
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';

    if (shipClass === 'interceptor') {
      // Sleek forward-swept twin-prong starfighter
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(4, 7);
      ctx.lineTo(12, 15);
      ctx.lineTo(-14, 13);
      ctx.lineTo(-10, 4);
      ctx.lineTo(-16, 0);
      ctx.lineTo(-10, -4);
      ctx.lineTo(-14, -13);
      ctx.lineTo(12, -15);
      ctx.lineTo(4, -7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.ellipse(4, 0, 6, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (shipClass === 'dreadnought') {
      // Heavy armored siege cruiser with plasma sponsons
      ctx.beginPath();
      ctx.moveTo(25, -7);
      ctx.lineTo(25, 7);
      ctx.lineTo(12, 18);
      ctx.lineTo(-18, 18);
      ctx.lineTo(-22, 10);
      ctx.lineTo(-22, -10);
      ctx.lineTo(-18, -18);
      ctx.lineTo(12, -18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner armor plates
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(16, -9);
      ctx.lineTo(-12, -11);
      ctx.moveTo(16, 9);
      ctx.lineTo(-12, 11);
      ctx.stroke();

      // Bridge core
      ctx.fillStyle = secondaryColor;
      ctx.fillRect(-2, -4, 10, 8);
    } else if (shipClass === 'artillery') {
      // Elongated railgun lance with accelerator rings
      ctx.beginPath();
      ctx.moveTo(27, 0);
      ctx.lineTo(6, 5);
      ctx.lineTo(-8, 16);
      ctx.lineTo(-18, 12);
      ctx.lineTo(-13, 4);
      ctx.lineTo(-13, -4);
      ctx.lineTo(-18, -12);
      ctx.lineTo(-8, -16);
      ctx.lineTo(6, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Railgun accelerator coil pulse
      const pulse = 0.65 + 0.35 * Math.sin(time * 8);
      ctx.strokeStyle = secondaryColor;
      ctx.globalAlpha = pulse;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, -4);
      ctx.lineTo(10, 4);
      ctx.moveTo(17, -3);
      ctx.lineTo(17, 3);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      // Carrier ("Valkyrie") - wide delta command ship
      ctx.beginPath();
      ctx.moveTo(21, 0);
      ctx.lineTo(4, 11);
      ctx.lineTo(-14, 19);
      ctx.lineTo(-18, 9);
      ctx.lineTo(-12, 0);
      ctx.lineTo(-18, -9);
      ctx.lineTo(-14, -19);
      ctx.lineTo(4, -11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Drone bay lights
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.arc(-4, -9, 2.5, 0, Math.PI * 2);
      ctx.arc(-4, 9, 2.5, 0, Math.PI * 2);
      ctx.arc(6, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawShip(ctx: CanvasRenderingContext2D, ship: ShipEntity, time: number): void {
    const team = TEAMS[ship.teamId];
    const speedSq = ship.vx * ship.vx + ship.vy * ship.vy;
    const isThrusting = speedSq > 1600;

    ctx.save();
    ctx.translate(ship.x, ship.y);

    // Player identification ring underneath ship
    if (ship.isPlayer) {
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, ship.radius + 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Overcharge aura
    if (ship.overchargeTimer > 0) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, ship.radius + 7, time * 3, time * 3 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Rotate and draw ship hull
    ctx.save();
    ctx.rotate(ship.angle);
    if (ship.invulnTimer > 0 && Math.floor(time * 20) % 2 === 0) {
      ctx.globalAlpha = 0.55;
    }
    this.drawShipSilhouette(
      ctx,
      ship.shipClass,
      ship.hitFlash > 0 ? '#FFFFFF' : team.primary,
      ship.hitFlash > 0 ? '#FFFFFF' : team.secondary,
      isThrusting,
      time
    );
    ctx.restore();

    // Dreadnought Aegis Deflector Shield Dome
    if (ship.shipClass === 'dreadnought' && ship.abilityActiveTimer > 0) {
      ctx.save();
      const domeR = ship.radius + 18;
      const grad = ctx.createRadialGradient(0, 0, domeR * 0.4, 0, 0, domeR);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.05)');
      grad.addColorStop(1, 'rgba(125, 211, 252, 0.38)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, domeR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#7DD3FC';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, domeR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Compact floating HP bar above damaged non-player ships
    if (!ship.isPlayer && ship.hp < ship.maxHp) {
      const barW = 30;
      const barH = 4;
      const ratio = Math.max(0, ship.hp / ship.maxHp);
      ctx.fillStyle = 'rgba(9, 14, 28, 0.85)';
      ctx.fillRect(-barW * 0.5, -ship.radius - 13, barW, barH);
      ctx.fillStyle = team.primary;
      ctx.fillRect(-barW * 0.5, -ship.radius - 13, barW * ratio, barH);
    }

    ctx.restore();
  }

  private drawBeam(ctx: CanvasRenderingContext2D, beam: BeamEffect): void {
    const ratio = Math.max(0, beam.life / beam.maxLife);
    ctx.save();
    ctx.strokeStyle = beam.color;
    ctx.globalAlpha = ratio * 0.85;
    ctx.lineWidth = beam.width * (0.6 + 0.4 * ratio);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();

    // Hot white inner core
    ctx.strokeStyle = '#FFFFFF';
    ctx.globalAlpha = ratio;
    ctx.lineWidth = beam.width * 0.32;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();
    ctx.restore();
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, proj: ProjectileEntity): void {
    const team = TEAMS[proj.teamId];
    ctx.save();
    ctx.translate(proj.x, proj.y);
    ctx.rotate(proj.angle);

    if (proj.kind === 'pulse' || proj.kind === 'turret') {
      ctx.fillStyle = team.primary;
      ctx.fillRect(-9, -2.2, 18, 4.4);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-5, -1, 11, 2);
    } else if (proj.kind === 'plasma') {
      ctx.fillStyle = team.primary;
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius * 0.48, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.kind === 'rail') {
      ctx.fillStyle = team.secondary;
      ctx.fillRect(-18, -2.5, 36, 5);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-14, -1.2, 28, 2.4);
    } else if (proj.kind === 'missile') {
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-5, 3.5);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-5, -3.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = team.primary;
      ctx.fillRect(-7, -1.5, 4, 3);
    }

    ctx.restore();
  }

  private drawOffscreenIndicators(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const { width, height, cameraX, cameraY, cameraZoom, planets, relay } = state;
    const pad = state.isTouchDevice ? 44 : 52;
    const halfW = width * 0.5;
    const halfH = height * 0.5;

    const targets: Array<{
      x: number;
      y: number;
      color: string;
      label: string;
      hpRatio?: number;
      isPlanet: boolean;
    }> = [];

    for (const p of planets) {
      if (!p.alive) continue;
      targets.push({
        x: p.x,
        y: p.y,
        color: TEAMS[p.teamId].primary,
        label: TEAMS[p.teamId].shortName,
        hpRatio: p.hp / p.maxHp,
        isPlanet: true,
      });
    }

    targets.push({
      x: relay.x,
      y: relay.y,
      color: relay.ownerTeam !== null ? TEAMS[relay.ownerTeam].primary : '#FBBF24',
      label: 'RELAY',
      isPlanet: false,
    });

    for (const t of targets) {
      const sx = (t.x - cameraX) * cameraZoom + halfW;
      const sy = (t.y - cameraY) * cameraZoom + halfH;

      // Skip if comfortably on-screen
      if (sx >= 30 && sx <= width - 30 && sy >= 30 && sy <= height - 30) {
        continue;
      }

      const dx = sx - halfW;
      const dy = sy - halfH;
      const angle = Math.atan2(dy, dx);

      // Clamp to screen edge rectangle
      const maxX = halfW - pad;
      const maxY = halfH - pad;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const scaleX = Math.abs(cos) > 0.001 ? maxX / Math.abs(cos) : 99999;
      const scaleY = Math.abs(sin) > 0.001 ? maxY / Math.abs(sin) : 99999;
      const d = Math.min(scaleX, scaleY);

      const ix = halfW + cos * d;
      const iy = halfH + sin * d;

      ctx.save();
      ctx.translate(ix, iy);

      // Pill badge
      ctx.fillStyle = 'rgba(9, 14, 28, 0.84)';
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, t.isPlanet ? 16 : 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // HP ring for planets
      if (t.isPlanet && t.hpRatio !== undefined) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t.hpRatio);
        ctx.stroke();
      }

      // Directional pointer arrow outside badge
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.moveTo(t.isPlanet ? 27 : 21, 0);
      ctx.lineTo(t.isPlanet ? 20 : 15, -5);
      ctx.lineTo(t.isPlanet ? 20 : 15, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Short code inside
      ctx.font = '800 8px "Orbitron", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = t.color;
      ctx.fillText(t.label.slice(0, 3), 0, 0.5);

      ctx.restore();
    }
  }

  private drawMiniRadar(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const { width, height, worldWidth, worldHeight, planets, ships, relay, isTouchDevice } = state;
    const radius = isTouchDevice ? 46 : 62;
    const cx = isTouchDevice ? width - radius - 14 : radius + 18;
    const cy = isTouchDevice ? radius + 62 : height - radius - 18;

    ctx.save();
    ctx.translate(cx, cy);

    // Radar dish background
    ctx.fillStyle = 'rgba(9, 14, 28, 0.78)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner range ring
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    const maxSpan = Math.max(worldWidth, worldHeight) * 0.54;
    const toRadar = (wx: number, wy: number): [number, number] => [
      (wx / maxSpan) * (radius - 6),
      (wy / maxSpan) * (radius - 6),
    ];

    // Solar Relay dot
    const [rx, ry] = toRadar(relay.x, relay.y);
    ctx.fillStyle = relay.ownerTeam !== null ? TEAMS[relay.ownerTeam].primary : '#FBBF24';
    ctx.beginPath();
    ctx.arc(rx, ry, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Planets
    for (const p of planets) {
      if (!p.alive) continue;
      const [px, py] = toRadar(p.x, p.y);
      ctx.fillStyle = TEAMS[p.teamId].primary;
      ctx.beginPath();
      ctx.arc(px, py, 5.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ships
    for (const s of ships) {
      const [sx, sy] = toRadar(s.x, s.y);
      if (sx * sx + sy * sy > (radius - 3) * (radius - 3)) continue;
      ctx.fillStyle = s.isPlayer ? '#FFFFFF' : TEAMS[s.teamId].primary;
      ctx.beginPath();
      ctx.arc(sx, sy, s.isPlayer ? 3.2 : 1.9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawReticle(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const { mouseScreenX: x, mouseScreenY: y, playerShip } = state;
    if (!playerShip) return;

    const spec = SHIP_CLASSES[playerShip.shipClass];
    const readyRatio = Math.max(
      0,
      Math.min(1, 1 - playerShip.abilityTimer / spec.abilityCooldown)
    );

    ctx.save();
    ctx.translate(x, y);

    // Outer subtle ring
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();

    // Ability readiness arc
    ctx.strokeStyle = readyRatio >= 0.999 ? '#38BDF8' : 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * readyRatio);
    ctx.stroke();

    // Crosshair ticks
    ctx.strokeStyle = '#E0F2FE';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.lineTo(-11, 0);
    ctx.moveTo(11, 0);
    ctx.lineTo(22, 0);
    ctx.moveTo(0, -22);
    ctx.lineTo(0, -11);
    ctx.moveTo(0, 11);
    ctx.lineTo(0, 22);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
