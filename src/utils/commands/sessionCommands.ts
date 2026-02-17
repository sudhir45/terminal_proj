import packageJson from '../../../package.json';
import themes from '../../../themes.json';
import { get } from 'svelte/store';
import { history as commandOutputHistory, enteredCommandHistory } from '../../stores/history';
import { theme } from '../../stores/theme';
import type { CommandDefinition } from './types';

const themeUsage = `Usage: theme <action> [name]

Actions:
  ls               List all themes
  set <theme-name> Set active theme`;

export const sessionCommandDefinitions: CommandDefinition[] = [
  {
    name: 'clear',
    description: 'Clear terminal output history.',
    run: () => {
      commandOutputHistory.set([]);
      return '';
    }
  },
  {
    name: 'history',
    description: 'Show entered command history.',
    usage: 'history [-c]',
    run: (args: string[]) => {
      if (args[0] === '-c') {
        enteredCommandHistory.set([]);
        return '';
      }

      const commandsList = get(enteredCommandHistory);
      if (commandsList.length === 0) {
        return 'No history yet.';
      }

      const maxDigits = String(commandsList.length).length;
      const padding = Math.max(2, maxDigits);
      return commandsList
        .map((cmd, index) => `${String(index + 1).padStart(padding, ' ')}  ${cmd}`)
        .join('\n');
    }
  },
  {
    name: 'theme',
    description: 'List or set terminal themes.',
    usage: 'theme ls | theme set <theme-name>',
    run: (args: string[]) => {
      if (args.length === 0) {
        return themeUsage;
      }

      if (args[0] === 'ls') {
        const list = themes.map((t) => t.name.toLowerCase()).join(', ');
        return `${list}\nPreview: ${packageJson.repository.url}/tree/master/docs/themes`;
      }

      if (args[0] === 'set') {
        if (args.length !== 2) {
          return themeUsage;
        }
        const selectedTheme = args[1].toLowerCase();
        const selected = themes.find((t) => t.name.toLowerCase() === selectedTheme);
        if (!selected) {
          return `Theme '${selectedTheme}' not found. Try 'theme ls'.`;
        }
        theme.set(selected);
        return `Theme set to ${selectedTheme}`;
      }

      return themeUsage;
    }
  }
];

