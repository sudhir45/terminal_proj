// Mock localStorage FIRST
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true // Allow it to be modified by other tests if necessary, or reset globally
});

// Now import other test utilities and application code
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
// Import functions and stores to test AFTER localStorage mock is in place
// These will be further managed with vi.resetModules() in beforeEach
let enteredCommandHistory: any;
let addCommandToHistory: any;
let commandOutputHistory: any;


describe('Command History Store (`enteredCommandHistory`)', () => {
  beforeEach(async () => { // Added async here
    localStorageMock.clear();
    vi.resetModules(); // This will re-run the history.ts script, re-initializing stores

    // Re-import after reset to get the new instances that use the fresh mock
    const storesModule = await import('./history');
    enteredCommandHistory = storesModule.enteredCommandHistory;
    addCommandToHistory = storesModule.addCommandToHistory;
    commandOutputHistory = storesModule.history;
  });

  afterEach(() => {
      vi.clearAllMocks();
  });

  it('should initialize as an empty array if localStorage is empty', () => {
    const currentHistory = get(enteredCommandHistory);
    expect(currentHistory).toEqual([]);
  });

  it('should add a new command to the history', () => {
    addCommandToHistory('ls -la');
    const currentHistory = get(enteredCommandHistory);
    expect(currentHistory).toEqual(['ls -la']);
  });

  it('should add multiple different commands to the history', () => {
    addCommandToHistory('ls');
    addCommandToHistory('cd documents');
    addCommandToHistory('pwd');
    const currentHistory = get(enteredCommandHistory);
    expect(currentHistory).toEqual(['ls', 'cd documents', 'pwd']);
  });

  it('should move an existing command to the end if added again (no duplicates)', () => {
    addCommandToHistory('ls');
    addCommandToHistory('cd documents');
    addCommandToHistory('ls'); // Add 'ls' again
    const currentHistory = get(enteredCommandHistory);
    expect(currentHistory).toEqual(['cd documents', 'ls']);
  });

  it('should persist history to localStorage', () => {
    const command1 = 'git status';
    addCommandToHistory(command1);
    expect(localStorageMock.getItem('enteredCommandHistory')).toEqual(JSON.stringify([command1]));

    const command2 = 'git diff';
    addCommandToHistory(command2);
    // The addCommandToHistory moves existing to end, so if command1 was already there, it's [command2, command1] or just [command1, command2] if unique
    // The current behavior is to add if not present, or move to end if present.
    // So if command1 = "git status", command2 = "git diff" -> ["git status", "git diff"]
    expect(localStorageMock.getItem('enteredCommandHistory')).toEqual(JSON.stringify([command1, command2]));
  });

  it('should load history from localStorage on initialization', async () => {
    const initialCommands = ['echo "hello"', 'cat file.txt'];
    localStorageMock.setItem('enteredCommandHistory', JSON.stringify(initialCommands));

    vi.resetModules();
    const storesOnReload = await import('./history');

    const currentHistory = get(storesOnReload.enteredCommandHistory);
    expect(currentHistory).toEqual(initialCommands);
  });

  it('addCommandToHistory should allow empty or whitespace-only commands (if passed)', () => {
    // Current store logic does not trim, Input.svelte does.
    addCommandToHistory('');
    addCommandToHistory('   ');
    expect(get(enteredCommandHistory)).toEqual(['', '   ']);
  });

  describe('Command Output History (`history` store)', () => {
    // No specific beforeEach for this inner describe needed if outer one is sufficient
    it('should also initialize from localStorage if data exists', async () => {
        const initialOutputHistoryData = [{ command: 'banner', outputs: ['Welcome!'] }];
        localStorageMock.setItem('history', JSON.stringify(initialOutputHistoryData));
        vi.resetModules();
        const reloadedStores = await import('./history');
        expect(get(reloadedStores.history)).toEqual(initialOutputHistoryData);
    });
  });

});
