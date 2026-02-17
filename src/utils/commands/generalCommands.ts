import packageJson from '../../../package.json';
import type { CommandDefinition } from './types';

const openInNewTab = (url: string): void => {
  window.open(url, '_blank');
};

const quotes = [
  "There\u2019s no place like 127.0.0.1.",
  "I\u2019m not paranoid, but my firewall is.",
  "Hackers don\u2019t break in \u2014 they log in.",
  "My password is the last thing you'd guess. Literally.",
  "Trust is good, 2FA is better.",
  "The cloud is just someone else\u2019s computer.",
  "If at first you don\u2019t succeed, call it a zero-day."
];

export const generalCommandDefinitions: CommandDefinition[] = [
  {
    name: 'hostname',
    description: 'Print the current hostname.',
    run: () => window.location.hostname
  },
  {
    name: 'whoami',
    description: 'Print the active terminal user.',
    run: () => 'guest'
  },
  {
    name: 'date',
    description: 'Print local date and time.',
    run: () => new Date().toLocaleString()
  },
  {
    name: 'vi',
    description: 'Editor joke command.',
    run: () => "why use vi? try 'emacs'"
  },
  {
    name: 'vim',
    description: 'Editor joke command.',
    run: () => "why use vim? try 'emacs'"
  },
  {
    name: 'emacs',
    description: 'Editor joke command.',
    run: () => "why use emacs? try 'vim'"
  },
  {
    name: 'echo',
    description: 'Print text back to the terminal.',
    usage: 'echo <text>',
    run: (args: string[]) => args.join(' ')
  },
  {
    name: 'sudo',
    description: 'Try to run a command with elevated privileges.',
    usage: 'sudo <command>',
    run: (args: string[]) => {
      window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      return `Permission denied: unable to run the command '${args[0] ?? ''}' as root.`;
    }
  },
  {
    name: 'repo',
    description: 'Open the project repository.',
    run: () => {
      openInNewTab(packageJson.repository.url);
      return 'Opening repository...';
    }
  },
  {
    name: 'about',
    description: 'Show a short profile summary.',
    run: () => "Hello! I'm Sudhir. I'm a Cyber Security Enthusiast.\n\nType 'help' to see available commands."
  },
  {
    name: 'github',
    description: 'Open GitHub profile.',
    run: () => {
      openInNewTab('https://github.com/sudhir45');
      return 'Opening GitHub...';
    }
  },
  {
    name: 'blog',
    description: 'Open blog website.',
    run: () => {
      openInNewTab('https://sudhir45.github.io');
      return 'Opening blog...';
    }
  },
  {
    name: 'linkedin',
    description: 'Open LinkedIn profile.',
    run: () => {
      openInNewTab('https://linkedin.com/in/dsudhir');
      return 'Opening LinkedIn...';
    }
  },
  {
    name: 'quote',
    description: 'Print a random quote.',
    run: () => quotes[Math.floor(Math.random() * quotes.length)]
  },
  {
    name: 'time',
    description: 'Print local date in a friendly format.',
    run: () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString();
      const dateStr = now.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return `Date: ${dateStr}\nTime: ${timeStr}`;
    }
  },
  {
    name: 'email',
    description: 'Open default email client.',
    run: () => {
      window.open(`mailto:${packageJson.author.email}`);
      return `Opening mailto:${packageJson.author.email}...`;
    }
  },
  {
    name: 'resume',
    description: 'Open resume website.',
    run: () => {
      openInNewTab('https://sudhir45.github.io/Resume_Web/');
      return 'Opening resume in a new tab...';
    }
  },
  {
    name: 'exit',
    description: 'Explain how to leave the terminal page.',
    run: () => 'Please close the tab to exit.'
  },
  {
    name: 'banner',
    description: 'Print the terminal banner.',
    run: () => `
████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗
╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║
   ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║
   ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║
   ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗
   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝

Type 'help' to see available commands.
`.trim()
  }
];

