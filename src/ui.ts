import { colorFromName } from './sprite';

const DEFAULT_NAMES = [
  'Pip', 'Bo', 'Mox', 'Nyx', 'Tam', 'Fae', 'Zuzu', 'Kit', 'Bean', 'Luma',
  'Cleo', 'Rook', 'Sage', 'Finn', 'Arlo', 'Juno', 'Echo', 'Quinn', 'Wren', 'Pepper',
];
const MAX_PETS = 20;
const MIN_PETS = 1;
const STORAGE_KEY = 'vector-pets:v2';
const DEFAULT_AGE = 20;
const DEFAULT_HEALTH = 100;

export interface PetInit {
  name: string;
  age: number;
  health: number;
}

export interface UIState {
  pets: PetInit[];
}

export interface UIEvents {
  onAdd: (pet: PetInit) => void;
  onRemove: () => void;
  onRename: (index: number, name: string) => void;
  onAgeChange: (index: number, age: number) => void;
  onHealthChange: (index: number, health: number) => void;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function loadState(): UIState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState(1);
    const parsed = JSON.parse(raw) as UIState;
    if (!Array.isArray(parsed.pets) || parsed.pets.length === 0) return defaultState(1);
    const pets = parsed.pets.slice(0, MAX_PETS).map((p, i) => ({
      name: typeof p.name === 'string' && p.name ? p.name : DEFAULT_NAMES[i % DEFAULT_NAMES.length]!,
      age: clamp(Number(p.age) || DEFAULT_AGE, 0, 100),
      health: clamp(Number(p.health) || DEFAULT_HEALTH, 0, 100),
    }));
    return { pets };
  } catch {
    return defaultState(1);
  }
}

function defaultState(count: number): UIState {
  const pets: PetInit[] = [];
  for (let i = 0; i < count; i++) {
    pets.push({
      name: DEFAULT_NAMES[i % DEFAULT_NAMES.length]!,
      age: DEFAULT_AGE,
      health: DEFAULT_HEALTH,
    });
  }
  return { pets };
}

function saveState(state: UIState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nextDefaultName(existing: PetInit[]): string {
  const used = new Set(existing.map((p) => p.name));
  for (const n of DEFAULT_NAMES) {
    if (!used.has(n)) return n;
  }
  return `Pet ${existing.length + 1}`;
}

function createSlider(
  label: string,
  initial: number,
  onInput: (value: number) => void,
): { root: HTMLDivElement; valueEl: HTMLSpanElement; input: HTMLInputElement } {
  const root = document.createElement('div');
  root.className = 'slider-row';

  const lbl = document.createElement('span');
  lbl.className = 'slider-label';
  lbl.textContent = label;

  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.step = '1';
  input.value = String(initial);

  const valueEl = document.createElement('span');
  valueEl.className = 'slider-value';
  valueEl.textContent = String(initial);

  input.addEventListener('input', () => {
    const v = Number(input.value) | 0;
    valueEl.textContent = String(v);
    onInput(v);
  });

  root.appendChild(lbl);
  root.appendChild(input);
  root.appendChild(valueEl);
  return { root, valueEl, input };
}

export function setupUI(events: UIEvents): UIState {
  const state = loadState();

  const countEl = document.getElementById('count') as HTMLSpanElement;
  const plusEl = document.getElementById('plus') as HTMLButtonElement;
  const minusEl = document.getElementById('minus') as HTMLButtonElement;
  const listEl = document.getElementById('pet-list') as HTMLUListElement;

  const updateStepper = () => {
    countEl.textContent = String(state.pets.length);
    plusEl.disabled = state.pets.length >= MAX_PETS;
    minusEl.disabled = state.pets.length <= MIN_PETS;
  };

  const renderRow = (index: number): HTMLLIElement => {
    const pet = state.pets[index]!;
    const li = document.createElement('li');
    li.className = 'pet-card';

    const header = document.createElement('div');
    header.className = 'pet-header';

    const swatch = document.createElement('span');
    swatch.className = 'pet-swatch';
    swatch.style.background = colorFromName(pet.name);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = pet.name;
    input.maxLength = 20;
    input.className = 'pet-name';
    input.addEventListener('input', () => {
      const v = input.value.trim() || `Pet ${index + 1}`;
      pet.name = v;
      swatch.style.background = colorFromName(v);
      saveState(state);
      events.onRename(index, v);
    });

    header.appendChild(swatch);
    header.appendChild(input);

    const age = createSlider('age', pet.age, (v) => {
      pet.age = v;
      saveState(state);
      events.onAgeChange(index, v);
    });
    const health = createSlider('hp ', pet.health, (v) => {
      pet.health = v;
      saveState(state);
      events.onHealthChange(index, v);
    });

    li.appendChild(header);
    li.appendChild(age.root);
    li.appendChild(health.root);
    return li;
  };

  const renderList = () => {
    listEl.innerHTML = '';
    for (let i = 0; i < state.pets.length; i++) {
      listEl.appendChild(renderRow(i));
    }
  };

  plusEl.addEventListener('click', () => {
    if (state.pets.length >= MAX_PETS) return;
    const name = nextDefaultName(state.pets);
    const pet: PetInit = { name, age: DEFAULT_AGE, health: DEFAULT_HEALTH };
    state.pets.push(pet);
    saveState(state);
    events.onAdd(pet);
    updateStepper();
    renderList();
  });

  minusEl.addEventListener('click', () => {
    if (state.pets.length <= MIN_PETS) return;
    state.pets.pop();
    saveState(state);
    events.onRemove();
    updateStepper();
    renderList();
  });

  updateStepper();
  renderList();
  return state;
}
