import packageJson from '../../package.json';
import themes from '../../themes.json';
import { history } from '../stores/history';
import { theme } from '../stores/theme';
import { printSlowly } from './printSlowly';

const hostname = window.location.hostname;

export const commands: Record<string, (args: string[]) => Promise<string> | string> = {
  //help: () => 'Available commands: ' + Object.keys(commands).join('\n'),
  hostname: () => hostname,
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
    history.set([]);

    return '';
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
    return `a
bunch
of
fake
directories`;
  },
  
  cd: async (args: string[]): Promise<string> => {
    return `unfortunately, i cannot afford more directories.`;
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