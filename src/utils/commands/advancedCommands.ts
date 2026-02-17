import packageJson from '../../../package.json';
import { get } from 'svelte/store';
import { theme } from '../../stores/theme';
import { startGame as startHangmanGame, guessLetter as guessHangmanLetter, getDisplay as getHangmanDisplay, type HangmanState } from '../games/hangman';
import { evaluateMathExpression } from './safeMath';
import { fetchTextWithTimeout } from './network';
import type { CommandDefinition } from './types';

const startTime = Date.now();
const hostname = window.location.hostname;
let currentHangmanGame: HangmanState | null = null;

export const advancedCommandDefinitions: CommandDefinition[] = [
  {
    name: 'calc',
    description: 'Evaluate a math expression safely.',
    usage: 'calc <expression>',
    run: (args: string[]) => {
      if (args.length === 0) {
        return 'Usage: calc 2 + 2';
      }

      try {
        const expression = args.join(' ');
        const result = evaluateMathExpression(expression);
        return `${expression} = ${result}`;
      } catch {
        return 'Invalid expression. Example: calc (5 + 3) * 2';
      }
    }
  },
  {
    name: 'weather',
    description: 'Fetch weather for a city.',
    usage: 'weather <city>',
    run: async (args: string[]) => {
      const city = args.join(' ').trim();
      if (!city) {
        return 'Usage: weather <city>. Example: weather Brussels';
      }

      try {
        const encodedCity = encodeURIComponent(city);
        return await fetchTextWithTimeout(`https://wttr.in/${encodedCity}?ATm`, 7000);
      } catch {
        return `weather: unable to fetch forecast for '${city}' right now`;
      }
    }
  },
  {
    name: 'hangman',
    description: 'Play hangman in the terminal.',
    usage: "hangman [start|<letter>]",
    run: (args: string[]) => {
      const action = args[0]?.toLowerCase();

      if (!action || action === 'start') {
        currentHangmanGame = startHangmanGame();
        return getHangmanDisplay(currentHangmanGame);
      }

      if (!currentHangmanGame) {
        return "No game in progress. Type 'hangman start' to begin.";
      }

      if (currentHangmanGame.status === 'won' || currentHangmanGame.status === 'lost') {
        return `Game over. The word was: ${currentHangmanGame.word}. Type 'hangman start' to play again.`;
      }

      if (action.length === 1 && /^[a-z]$/.test(action)) {
        currentHangmanGame = guessHangmanLetter(action, currentHangmanGame);
        return getHangmanDisplay(currentHangmanGame);
      }

      return `Invalid guess: '${args.join(' ')}'. Type a single letter or 'hangman start'.`;
    }
  },
  {
    name: 'sysinfo',
    description: 'Show system and terminal information.',
    run: () => {
      const asciiArt = [
        'TTTTT WW   WW',
        '  T   WW   WW',
        '  T   WW W WW',
        '  T   WWWWW WW',
        '  T   WW   WW'
      ];

      let osInfo = 'Web Browser';
      try {
        // @ts-ignore - userAgentData is not available in all TS lib versions
        if (navigator.userAgentData?.platform) {
          // @ts-ignore
          osInfo = navigator.userAgentData.platform;
        } else if (navigator.platform) {
          osInfo = navigator.platform;
        }
      } catch {
        osInfo = 'Web Browser';
      }

      const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
      const upMinutes = Math.floor(uptimeSeconds / 60);
      const upHours = Math.floor(upMinutes / 60);
      let uptimeInfo = '';
      if (upHours > 0) uptimeInfo += `${upHours}h `;
      if (upMinutes > 0) uptimeInfo += `${upMinutes % 60}m `;
      uptimeInfo += `${uptimeSeconds % 60}s`;

      const info = [
        `OS: ${osInfo}`,
        `Host: ${hostname}`,
        'Kernel: Svelte/TS',
        `Version: ${packageJson.version}`,
        `Uptime: ${uptimeInfo}`,
        'Shell: TermyWeb',
        `Theme: ${get(theme).name}`,
        `Resolution: ${window.innerWidth}x${window.innerHeight} (Viewport)`,
        `Terminal: ${document.title || 'TermyWeb'}`
      ];

      const maxArtWidth = Math.max(...asciiArt.map((line) => line.length));
      return Array.from({ length: Math.max(asciiArt.length, info.length) }, (_, index) => {
        const artLine = asciiArt[index] || '';
        const infoLine = info[index] || '';
        return `${artLine.padEnd(maxArtWidth)}  ${infoLine}`;
      }).join('\n');
    }
  }
];

