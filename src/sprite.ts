export const SPRITE_SIZE = 12;
const HALF = SPRITE_SIZE / 2;

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

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

export function colorFromName(name: string): string {
  const h = hashString(name + ':hue') % 360;
  return `hsl(${h} 72% 62%)`;
}

type Grid = Uint8Array;

function growBody(rng: () => number): Grid {
  const grid = new Uint8Array(HALF * SPRITE_SIZE);
  const idx = (x: number, y: number) => y * HALF + x;
  const midY = Math.floor(SPRITE_SIZE / 2);

  const queue: [number, number][] = [
    [HALF - 1, midY - 1],
    [HALF - 1, midY],
    [HALF - 1, midY + 1],
  ];
  const seen = new Uint8Array(HALF * SPRITE_SIZE);
  const target = Math.floor(HALF * SPRITE_SIZE * 0.55);
  let filled = 0;

  while (queue.length > 0 && filled < target) {
    const pick = Math.floor(rng() * queue.length);
    const cell = queue.splice(pick, 1)[0]!;
    const [x, y] = cell;
    const id = idx(x, y);
    if (seen[id]) continue;
    seen[id] = 1;

    const distFromAxis = HALF - 1 - x;
    const distFromCenterY = Math.abs(y - midY);
    const bias = 0.95 - distFromAxis * 0.07 - distFromCenterY * 0.05;
    if (rng() < bias) {
      grid[id] = 1;
      filled++;
      const neighbours: [number, number][] = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];
      for (const n of neighbours) {
        const [nx, ny] = n;
        if (nx >= 0 && nx < HALF && ny >= 1 && ny < SPRITE_SIZE - 1) {
          queue.push(n);
        }
      }
    }
  }
  return grid;
}

export function makeSprite(name: string): HTMLCanvasElement {
  const seed = hashString(name + ':shape');
  const rng = mulberry32(seed);
  const grid = growBody(rng);

  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = colorFromName(name);

  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < HALF; x++) {
      if (grid[y * HALF + x]) {
        ctx.fillRect(x, y, 1, 1);
        ctx.fillRect(SPRITE_SIZE - 1 - x, y, 1, 1);
      }
    }
  }

  return canvas;
}
