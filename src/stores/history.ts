import { writable } from 'svelte/store';
import type { Command } from '../interfaces/command';

// Existing history store for command outputs
export const history = writable<Array<Command>>(
  JSON.parse(localStorage.getItem('history') || '[]'),
);

history.subscribe((value) => {
  localStorage.setItem('history', JSON.stringify(value));
});

// New store for entered command strings
export const enteredCommandHistory = writable<string[]>(
  JSON.parse(localStorage.getItem('enteredCommandHistory') || '[]')
);

enteredCommandHistory.subscribe(value => {
  localStorage.setItem('enteredCommandHistory', JSON.stringify(value));
});

export function addCommandToHistory(command: string) {
  enteredCommandHistory.update(commands => {
    // Remove the command if it already exists to avoid duplicates and move it to the end
    const filteredCommands = commands.filter(c => c !== command);
    return [...filteredCommands, command];
  });
}
