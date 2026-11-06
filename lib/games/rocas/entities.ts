import {
  ASTEROID_MAX_ROT_SPEED,
  ASTEROID_MAX_VERTS,
  ASTEROID_MIN_VERTS,
  ASTEROID_SPEED_VARIANCE,
  BULLET_RADIUS,
  BULLET_SPEED,
  BULLET_TTL,
  COLOR_ASTEROID,
  COLOR_BULLET,
  COLOR_PARTICLE,
  COLOR_POWERUP,
  COLOR_SHIP,
  COLOR_THRUST,
  DRAG_BASE,
  DRAG_REFERENCE_FPS,
  GLOW_BLUR,
  INVINCIBILITY_TIME,
  PARTICLE_MAX_LIFE,
  PARTICLE_MAX_SPEED,
  PARTICLE_MIN_LIFE,
  PARTICLE_MIN_SPEED,
  PARTICLE_TAIL_TIME,
  POWERUP_MAX_SPEED,
  POWERUP_MIN_SPEED,
  POWERUP_RADIUS,
  POWERUP_TTL,
  RADII,
  SHIP_NOSE_OFFSET,
  SHIP_RADIUS,
  SHIP_ROTATION_SPEED,
  SHIP_THRUST,
  SHOOT_COOLDOWN,
  SPEEDS,
  TRIPLE_SPREAD,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  rand,
  randInt,
  wrap,
} from "./constants";

export class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = BULLET_TTL;
  radius = BULLET_RADIUS;
  dead = false;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * BULLET_SPEED;
    this.vy = Math.sin(angle) * BULLET_SPEED;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, WORLD_WIDTH);
    this.y = wrap(this.y + this.vy * dt, WORLD_HEIGHT);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = COLOR_BULLET;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  vx: number;
  vy: number;
  rot: number;
  rotSpeed: number;
  verts: [number, number][] = [];
  dead = false;

  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];

    const angle = rand(0, Math.PI * 2);
    const speed =
      SPEEDS[size] + rand(-ASTEROID_SPEED_VARIANCE, ASTEROID_SPEED_VARIANCE);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-ASTEROID_MAX_ROT_SPEED, ASTEROID_MAX_ROT_SPEED);
    this.rot = rand(0, Math.PI * 2);

    const n = randInt(ASTEROID_MIN_VERTS, ASTEROID_MAX_VERTS);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, WORLD_WIDTH);
    this.y = wrap(this.y + this.vy * dt, WORLD_HEIGHT);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = COLOR_ASTEROID;
    ctx.shadowColor = COLOR_ASTEROID;
    ctx.shadowBlur = GLOW_BLUR;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++) {
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

export class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = POWERUP_RADIUS;
  ttl = POWERUP_TTL;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(POWERUP_MIN_SPEED, POWERUP_MAX_SPEED);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, WORLD_WIDTH);
    this.y = wrap(this.y + this.vy * dt, WORLD_HEIGHT);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    // Pulso derivado de ttl, no del reloj, para que se congele en pausa.
    const pulse = 0.85 + Math.sin((this.ttl * 1000) / 150) * 0.15;
    const r = this.radius * pulse;

    ctx.save();
    ctx.shadowColor = COLOR_POWERUP;
    ctx.shadowBlur = GLOW_BLUR;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = COLOR_POWERUP;
    ctx.lineWidth = 2;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();

    ctx.fillStyle = COLOR_POWERUP;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3x", this.x, this.y);
    ctx.restore();
  }
}

export type ShipInput = {
  left: boolean;
  right: boolean;
  thrust: boolean;
};

export class Ship {
  x = WORLD_WIDTH / 2;
  y = WORLD_HEIGHT / 2;
  angle = -Math.PI / 2;
  vx = 0;
  vy = 0;
  radius = SHIP_RADIUS;
  thrusting = false;
  flameLength = 0; // decidida en update para que la llama se congele en pausa
  invincible = INVINCIBILITY_TIME;
  shootCooldown = 0;
  tripleShot = 0; // no se reinicia en reset(), como en el original
  dead = false;

  reset() {
    this.x = WORLD_WIDTH / 2;
    this.y = WORLD_HEIGHT / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.thrusting = false;
    this.flameLength = 0;
    this.invincible = INVINCIBILITY_TIME;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt: number, input: ShipInput) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;

    if (input.left) this.angle -= SHIP_ROTATION_SPEED * dt;
    if (input.right) this.angle += SHIP_ROTATION_SPEED * dt;

    this.thrusting = input.thrust;
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * SHIP_THRUST * dt;
      this.vy += Math.sin(this.angle) * SHIP_THRUST * dt;
    }
    this.flameLength = this.thrusting && Math.random() > 0.35 ? rand(6, 14) : 0;

    const drag = Math.pow(DRAG_BASE, dt * DRAG_REFERENCE_FPS);
    this.vx *= drag;
    this.vy *= drag;
    this.x = wrap(this.x + this.vx * dt, WORLD_WIDTH);
    this.y = wrap(this.y + this.vy * dt, WORLD_HEIGHT);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = SHOOT_COOLDOWN;
    const ox = this.x + Math.cos(this.angle) * SHIP_NOSE_OFFSET;
    const oy = this.y + Math.sin(this.angle) * SHIP_NOSE_OFFSET;
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;
    // Parpadeo durante la invencibilidad
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0)
      return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = COLOR_SHIP;
    ctx.shadowColor = COLOR_SHIP;
    ctx.shadowBlur = GLOW_BLUR;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(20, 0); // nariz
    ctx.lineTo(-12, -9); // ala izquierda
    ctx.lineTo(-7, 0); // muesca trasera
    ctx.lineTo(-12, 9); // ala derecha
    ctx.closePath();
    ctx.stroke();

    if (this.flameLength > 0) {
      ctx.strokeStyle = COLOR_THRUST;
      ctx.shadowColor = COLOR_THRUST;
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - this.flameLength, 0);
      ctx.lineTo(-8, 4);
      ctx.stroke();
    }

    ctx.restore();
  }
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(PARTICLE_MIN_SPEED, PARTICLE_MAX_SPEED);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(PARTICLE_MIN_LIFE, PARTICLE_MAX_LIFE);
    this.ttl = this.life;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = Math.max(this.ttl / this.life, 0);
    ctx.strokeStyle = COLOR_PARTICLE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(
      this.x - this.vx * PARTICLE_TAIL_TIME,
      this.y - this.vy * PARTICLE_TAIL_TIME,
    );
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
