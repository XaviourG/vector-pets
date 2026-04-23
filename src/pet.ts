import {
  colorFromName,
  GridCell,
  iterateCells,
  makeShape,
  renderShape,
  Shape,
} from './sprite';
import { BOUND_MAX_X, BOUND_MAX_Y, BOUND_MIN_X, BOUND_MIN_Y } from './world';

export type PetState = 'wandering' | 'greeting';

export interface Pet {
  id: string;
  name: string;
  color: string;
  age: number;
  health: number;
  shape: Shape;
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  facing: 1 | -1;
  state: PetState;
  stateTimer: number;
  greetCooldown: number;
  bouncePhase: number;
  partnerId: string | null;
}

const SPEED = 16;
const GREET_RADIUS = 10;
const GREET_DURATION = 1.2;
const GREET_COOLDOWN = 3.0;
const TARGET_REACHED = 2.0;
const DROOP_THRESHOLD = 60;
const FLASH_THRESHOLD = 25;

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickTarget(pet: Pet): void {
  pet.tx = randRange(BOUND_MIN_X, BOUND_MAX_X);
  pet.ty = randRange(BOUND_MIN_Y, BOUND_MAX_Y);
}

function rebuildSprite(pet: Pet): void {
  pet.shape = makeShape(pet.name, pet.age);
  pet.sprite = renderShape(pet.shape, pet.color);
}

export function createPet(id: string, name: string, age: number, health: number): Pet {
  const color = colorFromName(name);
  const shape = makeShape(name, age);
  const sprite = renderShape(shape, color);
  const pet: Pet = {
    id,
    name,
    color,
    age,
    health,
    shape,
    sprite,
    x: randRange(BOUND_MIN_X, BOUND_MAX_X),
    y: randRange(BOUND_MIN_Y, BOUND_MAX_Y),
    vx: 0,
    vy: 0,
    tx: 0,
    ty: 0,
    facing: 1,
    state: 'wandering',
    stateTimer: 0,
    greetCooldown: 0,
    bouncePhase: 0,
    partnerId: null,
  };
  pickTarget(pet);
  return pet;
}

export function renamePet(pet: Pet, newName: string): void {
  pet.name = newName;
  pet.color = colorFromName(newName);
  rebuildSprite(pet);
}

export function setAge(pet: Pet, age: number): void {
  pet.age = age;
  rebuildSprite(pet);
}

export function setHealth(pet: Pet, health: number): void {
  pet.health = health;
}

function healthSpeedMultiplier(health: number): number {
  const t = Math.max(0, health) / 100;
  return Math.max(0.05, Math.pow(t, 1.5));
}

function startGreeting(a: Pet, b: Pet): void {
  a.state = 'greeting';
  b.state = 'greeting';
  a.stateTimer = GREET_DURATION;
  b.stateTimer = GREET_DURATION;
  a.partnerId = b.id;
  b.partnerId = a.id;
  a.vx = 0; a.vy = 0;
  b.vx = 0; b.vy = 0;
  a.facing = b.x >= a.x ? 1 : -1;
  b.facing = a.x >= b.x ? 1 : -1;
}

function endGreeting(pet: Pet): void {
  pet.state = 'wandering';
  pet.stateTimer = 0;
  pet.partnerId = null;
  pet.greetCooldown = GREET_COOLDOWN;
  pet.bouncePhase = 0;
  pickTarget(pet);
}

export function updatePets(pets: Pet[], dt: number): void {
  for (let i = 0; i < pets.length; i++) {
    const p = pets[i]!;
    if (p.greetCooldown > 0) p.greetCooldown -= dt;
    const speedMul = healthSpeedMultiplier(p.health);

    if (p.state === 'wandering') {
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      if (d < TARGET_REACHED) {
        pickTarget(p);
        continue;
      }
      p.vx = (dx / d) * SPEED * speedMul;
      p.vy = (dy / d) * SPEED * speedMul;
      p.vx += (Math.random() - 0.5) * SPEED * 0.3 * speedMul;
      p.vy += (Math.random() - 0.5) * SPEED * 0.3 * speedMul;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < BOUND_MIN_X) p.x = BOUND_MIN_X;
      if (p.y < BOUND_MIN_Y) p.y = BOUND_MIN_Y;
      if (p.x > BOUND_MAX_X) p.x = BOUND_MAX_X;
      if (p.y > BOUND_MAX_Y) p.y = BOUND_MAX_Y;
      if (p.vx > 0.5) p.facing = 1;
      else if (p.vx < -0.5) p.facing = -1;
    } else {
      p.bouncePhase += dt * 12;
      p.stateTimer -= dt;
      if (p.stateTimer <= 0) endGreeting(p);
    }
  }

  for (let i = 0; i < pets.length; i++) {
    const a = pets[i]!;
    if (a.state !== 'wandering' || a.greetCooldown > 0) continue;
    for (let j = i + 1; j < pets.length; j++) {
      const b = pets[j]!;
      if (b.state !== 'wandering' || b.greetCooldown > 0) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (dx * dx + dy * dy < GREET_RADIUS * GREET_RADIUS) {
        startGreeting(a, b);
        break;
      }
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function cellJitter(seed: number): number {
  const s = Math.sin(seed * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

const cellBuffer: GridCell[] = [];

export function drawPet(ctx: CanvasRenderingContext2D, pet: Pet, time: number): void {
  const { gridSize } = pet.shape;
  const half = gridSize / 2;
  let cx = Math.round(pet.x);
  let cy = Math.round(pet.y);
  if (pet.state === 'greeting') {
    cy -= Math.round(Math.abs(Math.sin(pet.bouncePhase)) * 2);
  }
  const drawX = cx - half;
  const drawY = cy - half;

  const droop = pet.health >= DROOP_THRESHOLD
    ? 0
    : (DROOP_THRESHOLD - Math.max(0, pet.health)) / DROOP_THRESHOLD;
  const flashing = pet.health < FLASH_THRESHOLD;
  const flashIntensity = flashing
    ? 0.5 + 0.5 * Math.sin(time * 0.01)
    : 0;

  if (droop === 0 && !flashing) {
    if (pet.facing === -1) {
      ctx.save();
      ctx.translate(drawX + gridSize, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(pet.sprite, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(pet.sprite, drawX, drawY);
    }
    return;
  }

  let color = pet.color;
  if (flashing) {
    const mix = flashIntensity;
    color = `hsl(${lerp(360, 0, mix)} ${lerp(60, 95, mix)}% ${lerp(62, 50, mix)}%)`;
  }
  ctx.fillStyle = color;

  const n = iterateCells(pet.shape, cellBuffer);
  const idSeed = hashNum(pet.id);
  for (let i = 0; i < n; i++) {
    const cell = cellBuffer[i]!;
    let px = cell.x;
    let py = cell.y;
    if (droop > 0) {
      const fall = (gridSize - 1 - py);
      py += droop * fall;
      const jitter = cellJitter(idSeed + px * 17 + cell.y * 31);
      px += droop * (jitter - 0.5) * 2.5;
    }
    const flipX = pet.facing === -1 ? (gridSize - 1 - Math.round(px)) : Math.round(px);
    ctx.fillRect(drawX + flipX, drawY + Math.round(py), 1, 1);
  }
}

function hashNum(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
