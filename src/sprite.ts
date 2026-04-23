export const MIN_SPRITE_SIZE = 8;
export const MAX_SPRITE_SIZE = 18;

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

export function gridSizeForAge(age: number): number {
  const t = Math.max(0, Math.min(100, age)) / 100;
  const size = Math.round(MIN_SPRITE_SIZE + t * (MAX_SPRITE_SIZE - MIN_SPRITE_SIZE));
  return size % 2 === 0 ? size : size + 1;
}

function fillRatioForAge(age: number): number {
  const t = Math.max(0, Math.min(100, age)) / 100;
  return 0.40 + t * 0.18;
}

export interface Shape {
  grid: Uint8Array;
  gridSize: number;
}

function growShape(rng: () => number, gridSize: number, fillRatio: number): Uint8Array {
  const half = gridSize / 2;
  const grid = new Uint8Array(half * gridSize);
  const idx = (x: number, y: number) => y * half + x;
  const midY = Math.floor(gridSize / 2);

  const queue: [number, number][] = [
    [half - 1, midY - 1],
    [half - 1, midY],
    [half - 1, midY + 1],
  ];
  const seen = new Uint8Array(half * gridSize);
  const target = Math.floor(half * gridSize * fillRatio);
  let filled = 0;

  while (queue.length > 0 && filled < target) {
    const pick = Math.floor(rng() * queue.length);
    const cell = queue.splice(pick, 1)[0]!;
    const [x, y] = cell;
    const id = idx(x, y);
    if (seen[id]) continue;
    seen[id] = 1;

    const distFromAxis = half - 1 - x;
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
        if (nx >= 0 && nx < half && ny >= 1 && ny < gridSize - 1) {
          queue.push(n);
        }
      }
    }
  }
  return grid;
}

export function makeShape(name: string, age: number): Shape {
  const gridSize = gridSizeForAge(age);
  const seed = hashString(name + ':shape');
  const rng = mulberry32(seed);
  const grid = growShape(rng, gridSize, fillRatioForAge(age));
  return { grid, gridSize };
}

export function renderShape(shape: Shape, color: string): HTMLCanvasElement {
  const { grid, gridSize } = shape;
  const half = gridSize / 2;
  const canvas = document.createElement('canvas');
  canvas.width = gridSize;
  canvas.height = gridSize;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = color;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < half; x++) {
      if (grid[y * half + x]) {
        ctx.fillRect(x, y, 1, 1);
        ctx.fillRect(gridSize - 1 - x, y, 1, 1);
      }
    }
  }
  return canvas;
}

export interface GridCell {
  x: number;
  y: number;
}

export function iterateCells(shape: Shape, out: GridCell[]): number {
  const { grid, gridSize } = shape;
  const half = gridSize / 2;
  let n = 0;
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < half; x++) {
      if (grid[y * half + x]) {
        if (n >= out.length) out.push({ x: 0, y: 0 });
        out[n]!.x = x; out[n]!.y = y; n++;
        if (x !== gridSize - 1 - x) {
          if (n >= out.length) out.push({ x: 0, y: 0 });
          out[n]!.x = gridSize - 1 - x; out[n]!.y = y; n++;
        }
      }
    }
  }
  return n;
}
