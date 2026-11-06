import {
  ASTEROID_PARTICLES_PER_SIZE,
  ASTEROID_SPAWN_SAFE_DIST,
  INITIAL_ASTEROIDS,
  LEVEL_ASTEROIDS_BASE,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  POWERUP_GUARANTEED_KILLS,
  RESPAWN_TIME,
  SHIP_COLLISION_FACTOR,
  SHIP_EXPLOSION_PARTICLES,
  STARTING_LIVES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  dist,
  rand,
} from "./constants";
import { Asteroid, Bullet, Particle, PowerUp, Ship } from "./entities";

export type RocasPhase = "ready" | "playing" | "dead" | "gameover";

export type RocasSnapshot = {
  phase: RocasPhase;
  paused: boolean;
  score: number;
  lives: number;
  level: number;
};

export class RocasEngine {
  private canvas: HTMLCanvasElement;
  private onChange: (s: RocasSnapshot) => void;

  private keys: Record<string, boolean> = {};
  private justPressed: Record<string, boolean> = {};

  private ship = new Ship();
  private bullets: Bullet[] = [];
  private asteroids: Asteroid[] = [];
  private particles: Particle[] = [];
  private powerUps: PowerUp[] = [];

  private phase: RocasPhase = "ready";
  private paused = false;
  private score = 0;
  private lives = STARTING_LIVES;
  private level = 1;
  private deadTimer = 0;
  private powerUpSpawned = false;
  private killsSinceSpawn = 0;

  constructor(canvas: HTMLCanvasElement, onChange: (s: RocasSnapshot) => void) {
    this.canvas = canvas;
    this.onChange = onChange;
    this.initGame("ready");
  }

  start() {
    if (this.phase !== "ready") return;
    this.phase = "playing";
  }

  end() {
    this.phase = "gameover";
    this.paused = false;
  }

  restart() {
    this.initGame("playing");
  }

  private initGame(phase: RocasPhase) {
    this.ship = new Ship();
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.powerUps = [];
    this.powerUpSpawned = false;
    this.killsSinceSpawn = 0;
    this.score = 0;
    this.lives = STARTING_LIVES;
    this.level = 1;
    this.deadTimer = 0;
    this.paused = false;
    this.phase = phase;
    this.spawnAsteroids(INITIAL_ASTEROIDS);
  }

  private spawnAsteroids(count: number) {
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, WORLD_WIDTH);
        y = rand(0, WORLD_HEIGHT);
      } while (
        Math.hypot(x - WORLD_WIDTH / 2, y - WORLD_HEIGHT / 2) <
        ASTEROID_SPAWN_SAFE_DIST
      );
      this.asteroids.push(new Asteroid(x, y, 3));
    }
  }

  private nextLevel() {
    this.level++;
    this.bullets = [];
    this.particles = [];
    this.powerUps = [];
    this.powerUpSpawned = false;
    this.killsSinceSpawn = 0;
    this.ship.reset();
    this.spawnAsteroids(LEVEL_ASTEROIDS_BASE + this.level);
  }

  private explode(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) this.particles.push(new Particle(x, y));
  }

  private killShip() {
    this.explode(this.ship.x, this.ship.y, SHIP_EXPLOSION_PARTICLES);
    this.ship.dead = true;
    this.lives--;
    if (this.lives <= 0) {
      this.phase = "gameover";
    } else {
      this.phase = "dead";
      this.deadTimer = RESPAWN_TIME;
    }
  }

  private pressed(code: string) {
    const val = this.justPressed[code];
    this.justPressed[code] = false;
    return val;
  }

  private updateParticles(dt: number) {
    this.particles.forEach((p) => p.update(dt));
    this.particles = this.particles.filter((p) => !p.dead);
  }

  private update(dt: number) {
    if (this.phase === "gameover") {
      this.updateParticles(dt);
      return;
    }

    // Las rocas flotan detrás del overlay; la nave aún no existe para ellas.
    if (this.phase === "ready") {
      this.asteroids.forEach((a) => a.update(dt));
      return;
    }

    if (this.phase === "dead") {
      this.deadTimer -= dt;
      this.updateParticles(dt);
      this.asteroids.forEach((a) => a.update(dt));
      if (this.deadTimer <= 0) {
        this.phase = "playing";
        this.ship.reset();
      }
      return;
    }

    if (this.pressed("Space")) {
      this.bullets.push(...this.ship.tryShoot());
    }

    this.ship.update(dt, {
      left: !!this.keys.ArrowLeft,
      right: !!this.keys.ArrowRight,
      thrust: !!this.keys.ArrowUp,
    });
    this.bullets.forEach((b) => b.update(dt));
    this.asteroids.forEach((a) => a.update(dt));
    this.particles.forEach((p) => p.update(dt));
    this.powerUps.forEach((p) => p.update(dt));

    this.bullets = this.bullets.filter((b) => !b.dead);
    this.particles = this.particles.filter((p) => !p.dead);
    this.powerUps = this.powerUps.filter((p) => !p.dead);

    for (const p of this.powerUps) {
      if (!p.dead && dist(this.ship, p) < this.ship.radius + p.radius) {
        p.dead = true;
        this.ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala contra roca
    const newAsteroids: Asteroid[] = [];
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          this.score += POINTS[a.size];
          this.explode(a.x, a.y, a.size * ASTEROID_PARTICLES_PER_SIZE);
          newAsteroids.push(...a.split());
          if (!this.powerUpSpawned) {
            this.killsSinceSpawn++;
            const guaranteed = this.killsSinceSpawn >= POWERUP_GUARANTEED_KILLS;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              this.powerUps.push(new PowerUp(a.x, a.y));
              this.powerUpSpawned = true;
            }
          }
        }
      }
    }
    this.asteroids = this.asteroids.filter((a) => !a.dead).concat(newAsteroids);
    this.bullets = this.bullets.filter((b) => !b.dead);

    // Nave contra roca
    if (this.ship.invincible <= 0) {
      for (const a of this.asteroids) {
        if (
          dist(this.ship, a) <
          this.ship.radius + a.radius * SHIP_COLLISION_FACTOR
        ) {
          this.killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (this.asteroids.length === 0) this.nextLevel();
  }
}
