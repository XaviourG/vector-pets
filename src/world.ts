import { SPRITE_SIZE } from './sprite';

export const WORLD_W = 256;
export const WORLD_H = 192;
export const MARGIN = 4;

export const BOUND_MIN_X = MARGIN;
export const BOUND_MIN_Y = MARGIN;
export const BOUND_MAX_X = WORLD_W - SPRITE_SIZE - MARGIN;
export const BOUND_MAX_Y = WORLD_H - SPRITE_SIZE - MARGIN;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeBackdrop(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD_W;
  canvas.height = WORLD_H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#2a3a2a';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const rng = mulberry32(1337);
  ctx.fillStyle = '#334533';
  for (let i = 0; i < 280; i++) {
    const x = Math.floor(rng() * WORLD_W);
    const y = Math.floor(rng() * WORLD_H);
    ctx.fillRect(x, y, 1, 1);
  }

  ctx.fillStyle = '#3d5840';
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rng() * WORLD_W);
    const y = Math.floor(rng() * WORLD_H);
    ctx.fillRect(x, y, 2, 1);
  }

  const rockPositions: [number, number][] = [
    [34, 28], [210, 56], [72, 150], [180, 130], [140, 40],
  ];
  ctx.fillStyle = '#6b6b78';
  for (const [rx, ry] of rockPositions) {
    ctx.fillRect(rx + 1, ry, 3, 1);
    ctx.fillRect(rx, ry + 1, 5, 2);
    ctx.fillRect(rx + 1, ry + 3, 3, 1);
  }

  const bushPositions: [number, number][] = [
    [16, 160], [236, 16], [120, 170], [200, 90],
  ];
  ctx.fillStyle = '#4a6d3f';
  for (const [bx, by] of bushPositions) {
    ctx.fillRect(bx + 1, by, 4, 1);
    ctx.fillRect(bx, by + 1, 6, 3);
    ctx.fillRect(bx + 1, by + 4, 4, 1);
  }

  return canvas;
}
