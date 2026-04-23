import { colorFromName, makeSprite, SPRITE_SIZE } from './sprite';
import { BOUND_MAX_X, BOUND_MAX_Y, BOUND_MIN_X, BOUND_MIN_Y } from './world';

export type PetState = 'wandering' | 'greeting';

export interface Pet {
  id: string;
  name: string;
  color: string;
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

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickTarget(pet: Pet): void {
  pet.tx = randRange(BOUND_MIN_X, BOUND_MAX_X);
  pet.ty = randRange(BOUND_MIN_Y, BOUND_MAX_Y);
}

export function createPet(id: string, name: string): Pet {
  const pet: Pet = {
    id,
    name,
    color: colorFromName(name),
    sprite: makeSprite(name),
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
  pet.sprite = makeSprite(newName);
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

    if (p.state === 'wandering') {
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      if (d < TARGET_REACHED) {
        pickTarget(p);
        continue;
      }
      p.vx = (dx / d) * SPEED;
      p.vy = (dy / d) * SPEED;
      p.vx += (Math.random() - 0.5) * SPEED * 0.3;
      p.vy += (Math.random() - 0.5) * SPEED * 0.3;
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

export function drawPet(ctx: CanvasRenderingContext2D, pet: Pet): void {
  const x = Math.round(pet.x);
  let y = Math.round(pet.y);
  if (pet.state === 'greeting') {
    y -= Math.abs(Math.sin(pet.bouncePhase)) * 2;
    y = Math.round(y);
  }
  if (pet.facing === -1) {
    ctx.save();
    ctx.translate(x + SPRITE_SIZE, y);
    ctx.scale(-1, 1);
    ctx.drawImage(pet.sprite, 0, 0);
    ctx.restore();
  } else {
    ctx.drawImage(pet.sprite, x, y);
  }
}
