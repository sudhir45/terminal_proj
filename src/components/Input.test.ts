// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/svelte';
import { get } from 'svelte/store'; // Import get
import Input from './Input.svelte'; // The component to test
import { writable } from 'svelte/store';
import type { Command } from '../interfaces/command';
import type { Theme } from '../interfaces/theme';

const mockTheme = vi.hoisted((): Theme => ({
  name: 'test-theme',
  black: '#111111',
  red: '#ff5555',
  green: '#50fa7b',
  yellow: '#f1fa8c',
  blue: '#bd93f9',
  purple: '#ff79c6',
  cyan: '#8be9fd',
  white: '#f8f8f2',
  brightBlack: '#6272a4',
  brightRed: '#ff6e6e',
  brightGreen: '#69ff94',
  brightYellow: '#ffffa5',
  brightBlue: '#d6acff',
  brightPurple: '#ff92df',
  brightCyan: '#a4ffff',
  brightWhite: '#ffffff',
  foreground: '#eeeeee',
  background: '#111111',
  cursorColor: '#eeeeee'
}));

// Mocks for stores and imported objects
// mockCommands will be defined inside its vi.mock factory

// Mock Svelte stores & functions

// Hoist the mock function for addCommandToHistory
const addCommandToHistory = vi.hoisted(() => vi.fn());

vi.mock('../stores/history', async () => { // Added async here
  // Import writable directly inside the factory to ensure it's available
  const { writable: localWritable } = await import('svelte/store');
  const historyWritable = localWritable<Command[]>([]);
  const enteredCommandHistoryWritable = localWritable<string[]>([]);
  return {
    history: historyWritable,
    enteredCommandHistory: enteredCommandHistoryWritable,
    addCommandToHistory: addCommandToHistory, // Use the hoisted mock fn
  };
});

// Mock theme store
vi.mock('../stores/theme', async () => { // Added async here
  // Import writable directly inside the factory
  const { writable: localWritable } = await import('svelte/store');
  return {
    theme: localWritable<Theme>(mockTheme)
  };
});

// mockCommands and other mocks remain the same.
vi.mock('../utils/commands', () => {
  // Define mockCommands directly inside the factory
  const mockCommandsDefinition = {
    'help': () => 'Help text',
    'ls': () => 'ls output',
    'list': () => 'list output',
    'listdir': () => 'listdir output',
    'cd': () => 'cd output',
    'cat': () => 'cat output',
    'clear': () => '',
    'banner': () => 'Banner text'
  };
  return {
    commands: mockCommandsDefinition
  };
});

vi.mock('../utils/tracking', () => ({
  track: vi.fn()
}));

describe('Input.svelte', () => {
  let historyStoreInstance: ReturnType<typeof writable<Command[]>>;
  let enteredCommandHistoryStoreInstance: ReturnType<typeof writable<string[]>>;
  let themeStoreInstance: ReturnType<typeof writable<Theme>>;

  beforeEach(async () => {
    // Dynamically import to get the instances from the mock factory
    const histStores = await import('../stores/history');
    historyStoreInstance = histStores.history;
    enteredCommandHistoryStoreInstance = histStores.enteredCommandHistory;

    const themeModule = await import('../stores/theme');
    themeStoreInstance = themeModule.theme;

    // Reset stores' state before each test
    historyStoreInstance.set([]);
    enteredCommandHistoryStoreInstance.set([]);
    themeStoreInstance.set(mockTheme);

    addCommandToHistory.mockClear(); // Clear mock call history
  });

  afterEach(() => {
    cleanup(); // Unmounts components rendered with `render`
  });

  it('should render an input field', () => {
    const { getByRole } = render(Input); // Input will use mocked stores
    const inputElement = getByRole('textbox', {name: /command input/i });
    expect(inputElement).toBeDefined();
  });

  it('should update command value on input', async () => {
    const { getByRole } = render(Input);
    const inputElement = getByRole('textbox') as HTMLInputElement;
    await fireEvent.input(inputElement, { target: { value: 'test command' } });
    expect(inputElement.value).toBe('test command');
  });

  describe('Autocompletion (Tab key)', () => {
    it('should do nothing if no command matches', async () => {
      const { getByRole } = render(Input);
      const inputElement = getByRole('textbox') as HTMLInputElement;
      await fireEvent.input(inputElement, { target: { value: 'nonexistent' } });
      await fireEvent.keyDown(inputElement, { key: 'Tab' });
      expect(inputElement.value).toBe('nonexistent');
    });

    it('should autocomplete if one command matches and add a space', async () => {
      const { getByRole } = render(Input);
      const inputElement = getByRole('textbox') as HTMLInputElement;
      await fireEvent.input(inputElement, { target: { value: 'he' } }); // 'help'
      await fireEvent.keyDown(inputElement, { key: 'Tab' });
      expect(inputElement.value).toBe('help ');
    });

    it('should autocomplete to longest common prefix if multiple commands match', async () => {
      const { getByRole } = render(Input);
      const inputElement = getByRole('textbox') as HTMLInputElement;
      await fireEvent.input(inputElement, { target: { value: 'lis' } }); // list, listdir
      await fireEvent.keyDown(inputElement, { key: 'Tab' });
      expect(inputElement.value).toBe('list'); // LCP of 'list' and 'listdir'
    });

    it('should show suggestions if LCP is the current input and multiple commands match', async () => {
      const { getByRole } = render(Input);
      const inputElement = getByRole('textbox') as HTMLInputElement;

      // First Tab completes to LCP "list"
      await fireEvent.input(inputElement, { target: { value: 'lis' } });
      await fireEvent.keyDown(inputElement, { key: 'Tab' });
      expect(inputElement.value).toBe('list');

      // Second Tab on "list" should show suggestions for "list" and "listdir"
      let currentOutputHistory: Command[] = [];
      const unsubscribe = historyStoreInstance.subscribe(value => { currentOutputHistory = value; });

      await fireEvent.keyDown(inputElement, { key: 'Tab' });

      expect(inputElement.value).toBe('list'); // Value should remain 'list'
      const lastHistoryEntry = currentOutputHistory[currentOutputHistory.length - 1];
      expect(lastHistoryEntry.command).toBe('list'); // Command that triggered suggestions
      expect(lastHistoryEntry.outputs[0]).toContain('Suggestions:');
      expect(lastHistoryEntry.outputs[0]).toContain('list');
      expect(lastHistoryEntry.outputs[0]).toContain('listdir');
      expect(lastHistoryEntry.isSuggestion).toBe(true);

      unsubscribe();
    });

    it('should do nothing on Tab if input is empty', async () => {
        const { getByRole } = render(Input);
        const inputElement = getByRole('textbox') as HTMLInputElement;
        await fireEvent.input(inputElement, { target: { value: '' } });
        await fireEvent.keyDown(inputElement, { key: 'Tab' });
        expect(inputElement.value).toBe('');
    });
  });

  describe('Command Execution (Enter key)', () => {
    it('should call the command function and add to history stores', async () => {
      const { getByRole } = render(Input);
      const inputElement = getByRole('textbox') as HTMLInputElement;

      const testCmd = 'ls';
      await fireEvent.input(inputElement, { target: { value: testCmd } });
      await fireEvent.keyDown(inputElement, { key: 'Enter' });

      expect(addCommandToHistory).toHaveBeenCalledWith(testCmd);

      const currentOutputHistory = get(historyStoreInstance);
      // Find the output for the command we just ran
      const commandOutput = currentOutputHistory.find(h => h.command === testCmd);
      expect(commandOutput).toBeDefined();
      // Check if the output matches what the mocked 'ls' command returns.
      // The mocked 'ls' is defined in the factory for '../utils/commands'.
      // We know its output is 'ls output'.
      expect(commandOutput?.outputs[0]).toBe('ls output');

      expect(inputElement.value).toBe(''); // Input cleared
    });

    it('should handle unknown commands', async () => {
      const { getByRole } = render(Input);
      const inputElement = getByRole('textbox') as HTMLInputElement;
      const unknownCmd = 'unknowncmd';

      await fireEvent.input(inputElement, { target: { value: unknownCmd } });
      await fireEvent.keyDown(inputElement, { key: 'Enter' });

      expect(addCommandToHistory).toHaveBeenCalledWith(unknownCmd);
      const currentOutputHistory = get(historyStoreInstance);
      const commandOutput = currentOutputHistory.find(h => h.command === unknownCmd);
      expect(commandOutput).toBeDefined();
      expect(commandOutput?.outputs[0]).toBe(`${unknownCmd}: command not found`);
      expect(inputElement.value).toBe('');
    });
  });

  describe('Command History Navigation (ArrowUp/ArrowDown)', () => {
    beforeEach(() => {
        // Populate enteredCommandHistory for these tests
        enteredCommandHistoryStoreInstance.set(['cmd1', 'cmd2', 'cmd3']);
    });

    it('should navigate up through history on ArrowUp', async () => {
      const { getByRole } = render(Input);
      const inputElement = getByRole('textbox') as HTMLInputElement;

      await fireEvent.keyDown(inputElement, { key: 'ArrowUp' });
      expect(inputElement.value).toBe('cmd3');
      await fireEvent.keyDown(inputElement, { key: 'ArrowUp' });
      expect(inputElement.value).toBe('cmd2');
      await fireEvent.keyDown(inputElement, { key: 'ArrowUp' });
      expect(inputElement.value).toBe('cmd1');
      // Pressing Up again should stay at cmd1
      await fireEvent.keyDown(inputElement, { key: 'ArrowUp' });
      expect(inputElement.value).toBe('cmd1');
    });

    it('should navigate down through history on ArrowDown', async () => {
      const { getByRole } = render(Input);
      const inputElement = getByRole('textbox') as HTMLInputElement;

      // Go to top of history
      await fireEvent.keyDown(inputElement, { key: 'ArrowUp' }); // cmd3
      await fireEvent.keyDown(inputElement, { key: 'ArrowUp' }); // cmd2
      await fireEvent.keyDown(inputElement, { key: 'ArrowUp' }); // cmd1
      expect(inputElement.value).toBe('cmd1');

      await fireEvent.keyDown(inputElement, { key: 'ArrowDown' });
      expect(inputElement.value).toBe('cmd2');
      await fireEvent.keyDown(inputElement, { key: 'ArrowDown' });
      expect(inputElement.value).toBe('cmd3');
      // Pressing Down again should clear to new command line (or restore commandBeforeHistoryNavigation)
      await fireEvent.keyDown(inputElement, { key: 'ArrowDown' });
      expect(inputElement.value).toBe(''); // Assuming commandBeforeHistoryNavigation was empty
    });

    it('should restore typed command if navigating down past last history item', async () => {
        const { getByRole } = render(Input);
        const inputElement = getByRole('textbox') as HTMLInputElement;

        await fireEvent.input(inputElement, { target: { value: 'typed' } });
        await fireEvent.keyDown(inputElement, { key: 'ArrowUp' }); // cmd3, 'typed' saved as commandBeforeHistoryNavigation
        expect(inputElement.value).toBe('cmd3');
        await fireEvent.keyDown(inputElement, { key: 'ArrowDown' }); // Should restore 'typed'
        expect(inputElement.value).toBe('typed');
    });

    it('should reset history navigation if user types after navigating', async () => {
        const { getByRole } = render(Input);
        const inputElement = getByRole('textbox') as HTMLInputElement;

        await fireEvent.keyDown(inputElement, { key: 'ArrowUp' }); // cmd3
        expect(inputElement.value).toBe('cmd3');

        const modifiedCommand = inputElement.value + ' modified';
        await fireEvent.input(inputElement, { target: { value: modifiedCommand } });
        expect(inputElement.value).toBe('cmd3 modified');
        // Simulate a non-special key press to trigger index reset logic
        await fireEvent.keyDown(inputElement, { key: 'd' }); // 'd' is the last char of 'modified'

        // Now, pressing ArrowUp again should start from the end of history, not from 'cmd2'
        // because the user typed. The 'enteredCommandHistoryIndex' should have been reset.
        // This requires the component to correctly reset `enteredCommandHistoryIndex` on non-nav key presses.
        // This specific test logic might need adjustment based on exact implementation detail of index reset.
        // The component's current logic for this is:
        // if (enteredCommandHistoryIndex !== currentCommandHistory.length) { enteredCommandHistoryIndex = currentCommandHistory.length; }
        // So, after typing, index is reset. ArrowUp should fetch last command.

        await fireEvent.keyDown(inputElement, { key: 'ArrowUp' });
        expect(inputElement.value).toBe('cmd3'); // Fetches last command again
    });
  });
});
