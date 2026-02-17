import { writable } from 'svelte/store';
import type { Command } from '../interfaces/command';

const getStorage = (): Storage | null => {
  try {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
      return null;
    }
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

// Safe localStorage access helper
const getFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  const storage = getStorage();
  if (storage) {
    try {
      const stored = storage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(`Error loading ${key} from localStorage:`, e);
    }
  }
  return defaultValue;
};

const saveToLocalStorage = (key: string, value: unknown): void => {
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving ${key} to localStorage:`, e);
    }
  }
};

// Existing history store for command outputs
export const history = writable<Array<Command>>(
  getFromLocalStorage('history', [])
);

history.subscribe((value) => {
  saveToLocalStorage('history', value);
});

// New store for entered command strings
export const enteredCommandHistory = writable<string[]>(
  getFromLocalStorage('enteredCommandHistory', [])
);

enteredCommandHistory.subscribe(value => {
  saveToLocalStorage('enteredCommandHistory', value);
});

export function addCommandToHistory(command: string) {
  enteredCommandHistory.update(commands => {
    // Remove the command if it already exists to avoid duplicates and move it to the end
    const filteredCommands = commands.filter(c => c !== command);
    return [...filteredCommands, command];
  });
}
