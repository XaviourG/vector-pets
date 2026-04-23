import { createPet, drawPet, Pet, renamePet, updatePets } from './pet';
import { makeBackdrop } from './world';
import { setupUI } from './ui';

const canvas = document.getElementById('world') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: false })!;
ctx.imageSmoothingEnabled = false;

const backdrop = makeBackdrop();
const pets: Pet[] = [];
let nextId = 0;

function addPet(name: string): void {
  pets.push(createPet(String(nextId++), name));
}

const initial = setupUI({
  onAdd: (name) => addPet(name),
  onRemove: () => { pets.pop(); },
  onRename: (index, name) => {
    const p = pets[index];
    if (p) renamePet(p, name);
  },
});

for (const name of initial.names) addPet(name);

const FIXED_DT = 1 / 60;
const MAX_ACCUM = 0.25;
let last = performance.now();
let accum = 0;

function frame(now: number): void {
  let delta = (now - last) / 1000;
  last = now;
  if (delta > MAX_ACCUM) delta = MAX_ACCUM;
  accum += delta;

  while (accum >= FIXED_DT) {
    updatePets(pets, FIXED_DT);
    accum -= FIXED_DT;
  }

  ctx.drawImage(backdrop, 0, 0);
  pets.sort((a, b) => a.y - b.y);
  for (const p of pets) drawPet(ctx, p);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
