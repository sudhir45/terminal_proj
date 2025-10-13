import packageJson from '../../package.json';
import themes from '../../themes.json';
import { history as commandOutputHistory, enteredCommandHistory } from '../stores/history'; // Renamed 'history' to avoid conflict
import { get } from 'svelte/store';
import { theme } from '../stores/theme';
import { printSlowly } from './printSlowly';
import { currentDirectory, getNodeByPath, changeDirectory } from './filesystem';
import type { Directory, FileSystemNode } from './filesystem';
import { startGame as startHangmanGame, guessLetter as guessHangmanLetter, getDisplay as getHangmanDisplay, type HangmanState } from './games/hangman';

const startTime = Date.now(); // For uptime calculation
const hostname = window.location.hostname; // Already present

let currentHangmanGame: HangmanState | null = null;

export const commands: Record<string, (args: string[]) => Promise<string> | string> = {
  //help: () => 'Available commands: ' + Object.keys(commands).join('\n'),
  hostname: () => hostname, // Already present
  whoami: () => 'guest',
  date: () => new Date().toLocaleString(),
  vi: () => `why use vi? try 'emacs'`,
  vim: () => `why use vim? try 'emacs'`,
  emacs: () => `why use emacs? try 'vim'`,
  echo: (args: string[]) => args.join(' '),
  sudo: (args: string[]) => {
    window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    return `Permission denied: unable to run the command '${args[0]}' as root.`;
  },
  theme: (args: string[]) => {
    const usage = `Usage: theme [args].
    [args]:
      ls: list all available themes
      set: set theme to [theme]

    [Examples]:
      theme ls
      theme set gruvboxdark
    `;
    if (args.length === 0) {
      return usage;
    }

    switch (args[0]) {
      case 'ls': {
        let result = themes.map((t) => t.name.toLowerCase()).join(', ');
        result += `You can preview all these themes here: ${packageJson.repository.url}/tree/master/docs/themes`;

        return result;
      }

      case 'set': {
        if (args.length !== 2) {
          return usage;
        }

        const selectedTheme = args[1];
        const t = themes.find((t) => t.name.toLowerCase() === selectedTheme);

        if (!t) {
          return `Theme '${selectedTheme}' not found. Try 'theme ls' to see all available themes.`;
        }

        theme.set(t);

        return `Theme set to ${selectedTheme}`;
      }

      default: {
        return usage;
      }
    }
  },
  repo: () => {
    window.open(packageJson.repository.url, '_blank');

    return 'Opening repository...';
  },

  about: async (args: string[]): Promise<string> => {
    return `
  Hello! I'm Sudhir. I’m a Cyber Security Enthusiast.

  Type 'help' to see available commands.
    `;
  },

  // boot: async (): Promise<string> => {
  //   const lines = [
  //     "Initializing terminal...",
  //     "Loading kernel modules...",
  //     "Establishing secure SSH tunnel...",
  //     "Bypassing firewall [██████████] SUCCESS",
  //     "Authenticating credentials... OK",
  //     "Launching Cyber Terminal Interface...",
  //     "Access granted. Welcome back, Sudhir.",
  //     "Type 'help' to begin."
  //   ];
    
  //   await printSlowly(lines, (line) => {
  //     console.log(line);
  //   });
  
  //   return lines.join("\n");
  // },
  
  github: () => {
    window.open('https://github.com/sudhir45', '_blank');

    return 'Opening GitHub...';
  },

  blog: () => {
    window.open('https://sudhir45.github.io', '_blank');

    return 'Opening blog...';
  },

  linkedin: () => {
    window.open('https://linkedin.com/in/dsudhir', '_blank');

    return 'Opening LinkedIn...';
  },

  clear: () => {
    commandOutputHistory.set([]); // Use the renamed import

    return '';
  },

  history: (args: string[]): string => {
    if (args[0] === '-c') {
      enteredCommandHistory.set([]);
      // localStorage interaction is handled by the store's subscription in history.ts
      return ''; // Or "History cleared." - tests will check specific message if any.
    }

    const commandsList = get(enteredCommandHistory);
    if (commandsList.length === 0) {
      return 'No history yet.';
    }

    // Determine padding: max 3 digits, or width of largest number
    const maxDigits = String(commandsList.length).length;
    const padding = Math.max(2, maxDigits); // Ensure at least 2 digits for padding, e.g. " 1" vs "10"

    return commandsList
      .map((cmd, index) => {
        const lineNumber = String(index + 1).padStart(padding, ' ');
        return `${lineNumber}  ${cmd}`;
      })
      .join('\n');
  },

  quote: async (): Promise<string> => {
    const quotes = [
      "There’s no place like  127.0.0.1.",
      "I’m not paranoid, but my firewall is.",
      "Hackers don’t break in — they log in.",
      "My password is the last thing you'd guess. Literally.",
      "You can't spell 'phishing' without 'shh'.",
      "Cybersecurity: because de leting 'system32' didn’t make your PC faster.",
      "Trust is good, 2FA is better.",
      "I put the ‘fun’ in ‘fundamental security flaw’.",
      "Give a man a phish, and he’ll click it. Teach him about phishing, and he’ll report IT forever.",
      "There are two types of people: those who back up their data, and those who will.",
      "Ctrl + Alt + Del — because even your computer needs a fresh start sometimes.",
      "We secure systems not because we trust users — but because we don’t.",
      "The cloud is just someone else’s computer. Now sleep tight!",
      "If at first you don’t succeed, call it a 'zero-day'.",
      "Roses are red, Violets are blue, If you don't patch, Hackers own you."
    ];
  
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex];
  },

  calc: async (args: string[]): Promise<string> => {
    if (args.length === 0) return "❗ Usage: calc 2 + 2";
  
    try {
      // Join the args into a math expression string
      const expression = args.join(" ");
  
      // Safe math expression evaluator
      const result = Function(`"use strict"; return (${expression})`)();
      return `🧮 ${expression} = ${result}`;
    } catch {
      return "Invalid expression. Example: calc (5 + 3) * 2";
    }
  },

  time: async (): Promise<string> => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const dateStr = now.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  
    return `📅 ${dateStr}\n🕒 ${timeStr}`;
  },

  email: () => {
    window.open(`mailto:${packageJson.author.email}`);

    return `Opening mailto:${packageJson.author.email}...`;
  },
  
  resume: () => {
    window.open('https://sudhir45.github.io/Resume_Web/', '_blank');
    return 'Opening resume in a new tab...';
  },

  ls: async (args: string[]): Promise<string> => {
    const path = args[0];
    let targetNode: FileSystemNode | null = null;

    if (!path || path === '.') {
      targetNode = currentDirectory;
    } else if (path === '~') {
      targetNode = getNodeByPath('~');
    } else if (path.startsWith('~/')) {
      targetNode = getNodeByPath(path.substring(2), getNodeByPath('~') as Directory);
    } else {
      targetNode = getNodeByPath(path);
    }

    if (!targetNode) {
      return `ls: cannot access '${path || '.'}': No such file or directory`;
    }

    if (targetNode.type === 'file') {
      return targetNode.name;
    }

    return targetNode.children.map(child => child.name).join('\n');
  },

  cd: async (args: string[]): Promise<string> => {
    const path = args[0] || '~'; // Default to home directory if no path is provided

    if (changeDirectory(path)) {
      return ''; // Success, no output or some success message like `Current directory: ${currentDirectory.name}`
    } else {
      return `cd: no such file or directory: ${path}`;
    }
  },

  pwd: async (): Promise<string> => {
    // Helper function to build the path string
    const getPathString = (dir: Directory): string => {
      if (dir === getNodeByPath('~')) return '~'; // Handle root case explicitly

      let pathParts: string[] = [];
      let current: Directory | null = dir;

      // To avoid infinite loops with incorrect parent finding, limit depth or use better parent tracking
      let safetyCounter = 0;
      const MAX_DEPTH = 20;

      while (current && current !== getNodeByPath('~') && safetyCounter < MAX_DEPTH) {
        pathParts.unshift(current.name);
        // Find parent of current - this is the inefficient part
        let parentFound = false;
        const findParent = (searchDir: Directory, target: Directory): Directory | null => {
          for (const child of searchDir.children) {
            if (child === target) return searchDir;
            if (child.type === 'directory') {
              const found = findParent(child as Directory, target);
              if (found) return found;
            }
          }
          return null;
        }
        current = findParent(getNodeByPath('~') as Directory, current);
        parentFound = !!current;
        safetyCounter++;
      }
      if (safetyCounter >= MAX_DEPTH) return "/error/path/too/deep_or_parent_not_found";

      return '~/' + pathParts.join('/');
    };
    return getPathString(currentDirectory);
  },

  cat: async (args: string[]): Promise<string> => {
    if (args.length === 0) {
      return 'cat: usage: cat file [...]';
    }

    const outputs: string[] = [];
    for (const path of args) {
      const node = getNodeByPath(path, currentDirectory); // currentDirectory is imported
      if (node === null) {
        outputs.push(`cat: ${path}: No such file or directory`);
      } else if (node.type === 'directory') {
        outputs.push(`cat: ${node.name}: Is a directory`);
      } else if (node.type === 'file') {
        // Ensure content is not undefined, default to empty string if it is
        outputs.push(node.content || '');
      }
    }
    // Join file contents with newline, and error messages also get newlines.
    // If a file content itself has multiple lines, they are preserved.
    return outputs.join('\n');
  },

  weather: async (args: string[]) => {
    const city = args.join('+');

    if (!city) {
      return 'Usage: weather [city]. Example: weather Brussels';
    }

    const weather = await fetch(`https://wttr.in/${city}?ATm`);

    return weather.text();
  },
  exit: () => {
    return 'Please close the tab to exit.';
  },

  hangman: (args: string[]): string => {
    const action = args[0]?.toLowerCase();

    if (!action || action === "start") {
      currentHangmanGame = startHangmanGame();
      return getHangmanDisplay(currentHangmanGame);
    }

    if (!currentHangmanGame) {
      return "No game in progress. Type 'hangman start' to begin.";
    }

    if (currentHangmanGame.status === 'won' || currentHangmanGame.status === 'lost') {
      // Allow starting a new game even if one just finished.
      // The previous "if (!action || action === "start")" handles this.
      // So, if we are here, it means an action other than "start" was attempted on a finished game.
      return `Game over. The word was: ${currentHangmanGame.word}. Type 'hangman start' to play again.`;
    }

    if (action.length === 1 && /^[a-z]$/.test(action)) {
      currentHangmanGame = guessHangmanLetter(action, currentHangmanGame);
      // If game just ended with this guess, the message in lastMessage will indicate win/loss.
      return getHangmanDisplay(currentHangmanGame);
    }

    return `Invalid command or guess: '${args.join(" ")}'. Type a single letter to guess, or 'hangman start' for a new game.`;
  },

  sysinfo: (): string => {
    const asciiArt = [
      "TTTTT WW   WW",
      "  T   WW   WW",
      "  T   WW W WW",
      "  T   WWWWW WW",
      "  T   WW   WW",
    ];

    // Gather information
    let osInfo = "Web Browser";
    try {
      // @ts-ignore - userAgentData is a newer API not in all TypeScript definitions
      if (navigator.userAgentData && navigator.userAgentData.platform) {
        // @ts-ignore
        osInfo = navigator.userAgentData.platform;
      } else if (navigator.platform) {
        osInfo = navigator.platform;
      }
    } catch (e) { /* ignore if not available */ }

    const hostInfo = hostname; // Already defined globally in this file
    const kernelInfo = "Svelte/TS";
    const versionInfo = packageJson.version;
    const currentTheme = get(theme);
    const themeInfo = currentTheme.name;
    const shellInfo = "TermyWeb";

    let resolutionInfo = "N/A";
    try {
        resolutionInfo = `${window.innerWidth}x${window.innerHeight} (Viewport)`;
        // Or use screen: `${window.screen.width}x${window.screen.height}` (Screen)
    } catch (e) { /* ignore */ }

    let terminalInfo = "N/A";
    try {
        terminalInfo = document.title || "TermyWeb";
    } catch (e) { /* ignore */ }

    // Calculate uptime
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const upMinutes = Math.floor(uptimeSeconds / 60);
    const upHours = Math.floor(upMinutes / 60);
    let uptimeInfo = "";
    if (upHours > 0) uptimeInfo += `${upHours}h `;
    if (upMinutes > 0) uptimeInfo += `${upMinutes % 60}m `;
    uptimeInfo += `${uptimeSeconds % 60}s`;

    const info = [
      `OS: ${osInfo}`,
      `Host: ${hostInfo}`,
      `Kernel: ${kernelInfo}`,
      `Version: ${versionInfo}`,
      `Uptime: ${uptimeInfo}`,
      `Shell: ${shellInfo}`,
      `Theme: ${themeInfo}`,
      `Resolution: ${resolutionInfo}`,
      `Terminal: ${terminalInfo}`,
    ];

    // Formatting: find max length of ASCII art line for padding
    const maxArtWidth = Math.max(...asciiArt.map(line => line.length));
    const padding = "  "; // Space between art and text

    let output = "";
    const maxLines = Math.max(asciiArt.length, info.length);

    for (let i = 0; i < maxLines; i++) {
      const artLine = asciiArt[i] || "";
      const infoLine = info[i] || "";
      output += `${artLine.padEnd(maxArtWidth)}${padding}${infoLine}\n`;
    }

    return output.trimEnd(); // Remove trailing newline
  },

  banner: () => `
  ████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗                  
  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║                  
     ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║                  
     ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║                  
     ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗    ██╗██╗██╗
     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝    ╚═╝╚═╝╚═╝

Type 'help' to see list of available commands.
`,
};

// Help
function help(args: string[]): string {
  const commandList = Object.keys(commands).sort();
  let c = '';
  for (let i = 1; i <= commandList.length; i++) {
    if (i % 20 === 0) {
      c += commandList[i - 1] + '\n';
    } else {
      c += commandList[i - 1] + ' ';
    }
  }
  return `Welcome! Here are all the available commands:\n\n${c}\n\n`;
}

// Add help to commands
commands.help = help;