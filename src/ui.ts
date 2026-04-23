import { colorFromName } from './sprite';

const DEFAULT_NAMES = [
  'Pip', 'Bo', 'Mox', 'Nyx', 'Tam', 'Fae', 'Zuzu', 'Kit', 'Bean', 'Luma',
  'Cleo', 'Rook', 'Sage', 'Finn', 'Arlo', 'Juno', 'Echo', 'Quinn', 'Wren', 'Pepper',
];
const MAX_PETS = 20;
const MIN_PETS = 1;
const STORAGE_KEY = 'vector-pets:v1';

export interface UIState {
  count: number;
  names: string[];
}

export interface UIEvents {
  onAdd: (name: string) => void;
  onRemove: () => void;
  onRename: (index: number, name: string) => void;
}

function loadState(): UIState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState(1);
    const parsed = JSON.parse(raw) as UIState;
    const count = Math.max(MIN_PETS, Math.min(MAX_PETS, parsed.count | 0));
    const names = Array.isArray(parsed.names) ? parsed.names.slice(0, count) : [];
    while (names.length < count) names.push(DEFAULT_NAMES[names.length % DEFAULT_NAMES.length]!);
    return { count, names };
  } catch {
    return defaultState(1);
  }
}

function defaultState(count: number): UIState {
  return {
    count,
    names: DEFAULT_NAMES.slice(0, count),
  };
}

function saveState(state: UIState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nextDefaultName(existing: string[]): string {
  for (const n of DEFAULT_NAMES) {
    if (!existing.includes(n)) return n;
  }
  return `Pet ${existing.length + 1}`;
}

export function setupUI(events: UIEvents): UIState {
  const state = loadState();

  const countEl = document.getElementById('count') as HTMLSpanElement;
  const plusEl = document.getElementById('plus') as HTMLButtonElement;
  const minusEl = document.getElementById('minus') as HTMLButtonElement;
  const listEl = document.getElementById('pet-list') as HTMLUListElement;

  const render = () => {
    countEl.textContent = String(state.count);
    plusEl.disabled = state.count >= MAX_PETS;
    minusEl.disabled = state.count <= MIN_PETS;

    listEl.innerHTML = '';
    for (let i = 0; i < state.names.length; i++) {
      const name = state.names[i]!;
      const li = document.createElement('li');
      li.className = 'pet-row';

      const swatch = document.createElement('span');
      swatch.className = 'pet-swatch';
      swatch.style.background = colorFromName(name);

      const input = document.createElement('input');
      input.type = 'text';
      input.value = name;
      input.maxLength = 20;
      input.addEventListener('input', () => {
        const v = input.value.trim() || `Pet ${i + 1}`;
        state.names[i] = v;
        swatch.style.background = colorFromName(v);
        saveState(state);
        events.onRename(i, v);
      });

      li.appendChild(swatch);
      li.appendChild(input);
      listEl.appendChild(li);
    }
  };

  plusEl.addEventListener('click', () => {
    if (state.count >= MAX_PETS) return;
    const name = nextDefaultName(state.names);
    state.names.push(name);
    state.count = state.names.length;
    saveState(state);
    events.onAdd(name);
    render();
  });

  minusEl.addEventListener('click', () => {
    if (state.count <= MIN_PETS) return;
    state.names.pop();
    state.count = state.names.length;
    saveState(state);
    events.onRemove();
    render();
  });

  render();
  return state;
}
